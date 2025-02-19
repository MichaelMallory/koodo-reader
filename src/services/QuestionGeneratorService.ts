export class QuestionGeneratorService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  async generateQuestions(text: string, totalQuestions: number = 5, readingSpeed: number = 300): Promise<any> {
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
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  }

  async validateAnswers(questions: any[], userAnswers: number[]): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/quiz/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions,
          userAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate answers');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating answers:', error);
      throw error;
    }
  }
} 