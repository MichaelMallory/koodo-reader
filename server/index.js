const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Generate quiz questions
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { text, totalQuestions, readingSpeed } = req.body;

    // Split text into manageable chunks
    const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
    const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);

    // Generate questions for each chunk
    const allQuestions = [];
    for (const chunk of chunks) {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Generate multiple choice questions to test reading comprehension. Each question should have 4 options."
          },
          {
            role: "user",
            content: `Generate ${questionsPerChunk} multiple choice questions for this text: ${chunk}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Parse questions from response
      const questions = parseQuestionsFromResponse(response.choices[0].message.content);
      allQuestions.push(...questions);
    }

    // Create quiz object
    const quiz = {
      id: `quiz_${Date.now()}`,
      metadata: {
        totalWords: text.split(/\s+/).length,
        readingSpeed: readingSpeed || 0,
        estimatedDifficulty: estimateDifficulty(text),
        timeGenerated: new Date().toISOString(),
        textSummary: text.substring(0, 100) + '...'
      },
      questions: allQuestions.slice(0, totalQuestions),
      status: 'ready'
    };

    res.json(quiz);
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Validate quiz answers
app.post('/api/quiz/validate', async (req, res) => {
  try {
    const { quiz, userAnswers } = req.body;
    
    const correctAnswers = quiz.questions.reduce((count, question, index) => {
      return count + (question.correctAnswer === userAnswers[index] ? 1 : 0);
    }, 0);

    const score = (correctAnswers / quiz.questions.length) * 100;
    const feedback = quiz.questions.map((question, index) => {
      const isCorrect = question.correctAnswer === userAnswers[index];
      return isCorrect
        ? `Question ${index + 1}: Correct!`
        : `Question ${index + 1}: Incorrect. The correct answer was ${question.options[question.correctAnswer - 1]}`;
    });

    const results = {
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      feedback,
    };

    res.json(results);
  } catch (error) {
    console.error('Error validating answers:', error);
    res.status(500).json({ error: 'Failed to validate answers' });
  }
});

function estimateDifficulty(text) {
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const sentenceCount = text.split(/[.!?]+/).length;
  const avgSentenceLength = words.length / sentenceCount;

  if (avgWordLength < 5 && avgSentenceLength < 10) return 'easy';
  if (avgWordLength > 6 || avgSentenceLength > 20) return 'hard';
  return 'medium';
}

function parseQuestionsFromResponse(text) {
  const questions = [];
  const questionBlocks = text.split(/Question \d+:/i).filter(block => block.trim());

  questionBlocks.forEach((block, index) => {
    try {
      const options = block.match(/[A-D]\) .+/g) || [];
      const correctAnswerMatch = block.match(/Correct answer: (\d)/i);
      
      if (options.length === 4 && correctAnswerMatch) {
        const questionText = block.split(/[A-D]\)/)[0].trim();
        const correctAnswer = parseInt(correctAnswerMatch[1]);

        questions.push({
          id: index + 1,
          text: questionText,
          options: options.map(opt => opt.replace(/^[A-D]\) /, '').trim()),
          correctAnswer: correctAnswer,
        });
      }
    } catch (error) {
      console.error(`Error parsing question ${index + 1}:`, error);
    }
  });

  return questions;
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 