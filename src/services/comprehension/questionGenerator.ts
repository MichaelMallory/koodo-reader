import DatabaseService from '../../utils/storage/databaseService';

export interface QuestionType {
  type: 'theme' | 'character' | 'plot' | 'mood' | 'detail' | 'inference';
  weight: number;
}

export interface GenerationContext {
  bookName: string;
  chapterTitle: string;
  sectionIndex: number;
  totalSections: number;
  isFirstSection: boolean;
  isLastSection: boolean;
}

export interface GenerationOptions {
  questionTypes: QuestionType[];
  context: GenerationContext;
}

export interface Question {
  id: number;
  type: QuestionType['type'];
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface ValidationResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  feedback: string[];
}

export interface QuizMetadata {
  totalWords: number;
  readingSpeed: number;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  timeGenerated: string;
  textSummary: string;
}

export interface Quiz {
  id: string;
  metadata: QuizMetadata;
  questions: Question[];
  status: 'ready' | 'in-progress' | 'completed';
}

export interface QuizRecord {
  key: string;  // Required by DatabaseService
  quiz: Quiz;
  results?: ValidationResult;
  bookKey?: string;
  chapterIndex?: number;
  timestamp: number;
}

export class QuestionGeneratorService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
  }

  async generateQuestions(
    text: string, 
    totalQuestions: number = 6, 
    readingSpeed?: number,
    bookKey?: string,
    chapterIndex?: number,
    options?: GenerationOptions
  ): Promise<Quiz> {
    try {
      const response = await fetch(`${this.baseUrl}/api/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          totalQuestions,
          readingSpeed,
          bookKey,
          chapterIndex,
          options: {
            questionTypes: options?.questionTypes || [
              { type: 'theme', weight: 3 },
              { type: 'plot', weight: 3 },
              { type: 'inference', weight: 3 },
              { type: 'character', weight: 2 },
              { type: 'mood', weight: 1 },
              { type: 'detail', weight: 0.5 }
            ],
            context: options?.context || {},
            promptInstructions: `
              Generate questions that test deep comprehension and holistic understanding of the text.
              Focus heavily on themes, plot connections, and inference rather than surface-level details.
              
              Distribution guidelines:
              - 30% Theme/Main Ideas: Focus on overarching messages, author's purpose, and broader implications
              - 30% Plot/Structure: Emphasize cause-and-effect relationships, narrative development, and plot connections
              - 30% Inference: Test ability to synthesize information and draw conclusions from multiple parts of the text
              - 20% Character/Mood: Explore character motivations, relationships, and emotional undertones
              - 10% Supporting Details: Only include details that directly support major themes or plot points
              
              For theme questions (Priority: HIGH):
              - Identify central themes and their development throughout the text
              - Connect themes to broader human experiences or universal concepts
              - Explore how different elements of the text support these themes
              - Ask about the author's message or philosophical implications
              
              For plot questions (Priority: HIGH):
              - Focus on significant plot developments and their implications
              - Connect different events to show cause-and-effect relationships
              - Explore how plot elements contribute to the overall meaning
              - Ask about the significance of key events rather than just their occurrence
              
              For inference questions (Priority: HIGH):
              - Require synthesis of information from multiple parts of the text
              - Ask readers to draw conclusions based on textual evidence
              - Test understanding of implicit meanings and subtexts
              - Connect different aspects of the text to form deeper insights
              
              For character questions (Priority: MEDIUM):
              - Focus on character development and transformation
              - Explore relationships between characters and their impact on themes
              - Examine character motivations and their broader significance
              - Connect character actions to central themes
              
              For mood/tone questions (Priority: LOW):
              - Connect emotional atmosphere to thematic elements
              - Show how mood supports the author's purpose
              - Examine how tone affects meaning
              
              For detail questions (Priority: MINIMAL):
              - Only include details that directly support major themes or plot points
              - Connect specific details to broader concepts
              - Avoid trivial or isolated facts
              - Use details as evidence for larger interpretations
              
              Each question should:
              - Require critical thinking and analysis
              - Connect to the text's broader significance
              - Test understanding rather than memorization
              - Support comprehensive understanding of the text
              - Encourage deeper engagement with the material
              
              Avoid:
              - Surface-level recall questions
              - Isolated factual details
              - Trivial or inconsequential information
              - Questions that can be answered without understanding the broader context
            `
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const quiz = await response.json();
      
      // Save the quiz record with book info
      await this.saveQuizRecord({
        key: quiz.id,
        quiz,
        bookKey,
        chapterIndex,
        timestamp: Date.now()
      });

      return quiz;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  async validateAnswers(quiz: Quiz, userAnswers: number[]): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/quiz/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quiz,
          userAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      
      // Get the existing quiz record and update it with results
      const quizRecord = await this.getQuizRecord(quiz.id);
      if (quizRecord) {
        await this.saveQuizRecord({
          ...quizRecord,
          results,
          quiz: {
            ...quizRecord.quiz,
            status: 'completed'
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error validating answers:', error);
      throw error;
    }
  }

  // Database operations
  private async saveQuizRecord(record: QuizRecord): Promise<void> {
    await DatabaseService.saveRecord(record, 'quizzes');
  }

  private async getQuizRecord(quizId: string): Promise<QuizRecord | null> {
    return await DatabaseService.getRecord(quizId, 'quizzes');
  }

  async getQuizHistory(bookKey?: string): Promise<QuizRecord[]> {
    if (bookKey) {
      return await DatabaseService.getRecordsByBookKey(bookKey, 'quizzes');
    }
    return await DatabaseService.getAllRecords('quizzes');
  }

  async getRecentQuizzes(limit: number = 10): Promise<QuizRecord[]> {
    const allQuizzes = await this.getQuizHistory();
    return allQuizzes
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getAverageScore(bookKey?: string): Promise<number> {
    const quizzes = await this.getQuizHistory(bookKey);
    const completedQuizzes = quizzes.filter(q => q.results);
    if (completedQuizzes.length === 0) return 0;
    
    const totalScore = completedQuizzes.reduce((sum, quiz) => sum + (quiz.results?.score || 0), 0);
    return totalScore / completedQuizzes.length;
  }

  async getPerformanceStats(bookKey?: string): Promise<{
    totalQuizzes: number;
    averageScore: number;
    completionRate: number;
    averageReadingSpeed: number;
  }> {
    const quizzes = await this.getQuizHistory(bookKey);
    const completedQuizzes = quizzes.filter(q => q.results);
    
    return {
      totalQuizzes: quizzes.length,
      averageScore: await this.getAverageScore(bookKey),
      completionRate: (completedQuizzes.length / quizzes.length) * 100,
      averageReadingSpeed: completedQuizzes.reduce((sum, q) => sum + (q.quiz.metadata.readingSpeed || 0), 0) / completedQuizzes.length
    };
  }
} 