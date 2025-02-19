import DatabaseService from '../../utils/storage/databaseService';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
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

  async generateQuestions(text: string, totalQuestions: number = 6, readingSpeed?: number): Promise<Quiz> {
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
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const quiz = await response.json();
      
      // Save the quiz record
      await this.saveQuizRecord({
        key: quiz.id,
        quiz,
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