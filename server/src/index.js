const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to split text into chunks
function splitTextIntoChunks(text, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to estimate difficulty based on reading speed
function estimateDifficulty(readingSpeed) {
  if (readingSpeed < 200) return 'easy';
  if (readingSpeed < 400) return 'medium';
  return 'hard';
}

// Helper function to parse questions from OpenAI response
function parseQuestions(content) {
  try {
    const questions = JSON.parse(content);
    // Ensure correctAnswer is a number and zero-based
    return questions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
    }));
  } catch (error) {
    console.error('Error parsing questions:', error);
    console.log('Raw content:', content);
    return [];
  }
}

// Generate quiz questions
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { text, totalQuestions = 5, readingSpeed } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const chunks = splitTextIntoChunks(text);
    const difficulty = estimateDifficulty(readingSpeed);
    const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);
    
    let allQuestions = [];

    for (const chunk of chunks) {
      const prompt = `Generate ${questionsPerChunk} ${difficulty} multiple-choice questions based on this text. Format the response as a JSON array where each question object has properties: "question" (string), "options" (array of 4 strings), and "correctAnswer" (number 0-3 indicating the index of the correct option in the options array). The response should be valid JSON. Text: ${chunk}`;

      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are a quiz generator that outputs only valid JSON arrays containing question objects. Each question must have exactly 4 options and a correctAnswer index from 0-3."
          },
          { role: "user", content: prompt }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 1000,
      });

      const questions = parseQuestions(completion.choices[0].message.content);
      console.log('[ServerDebug] Parsed questions:', questions);
      allQuestions = allQuestions.concat(questions);
    }

    // Trim to exact number of questions requested
    allQuestions = allQuestions.slice(0, totalQuestions);

    const quiz = {
      id: `quiz_${Date.now()}`,
      metadata: {
        totalQuestions,
        difficulty,
        readingSpeed,
        timestamp: new Date().toISOString()
      },
      questions: allQuestions
    };

    console.log('[ServerDebug] Generated quiz:', {
      id: quiz.id,
      questionCount: quiz.questions.length,
      sampleQuestion: quiz.questions[0]
    });

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
    
    console.log('[ServerDebug] Received validation request:', {
      hasQuiz: !!quiz,
      hasQuestions: quiz?.questions?.length,
      userAnswersLength: userAnswers?.length,
      userAnswers,
      correctAnswers: quiz?.questions?.map(q => q.correctAnswer)
    });
    
    if (!quiz || !quiz.questions || !userAnswers) {
      console.error('[ServerDebug] Missing required data');
      return res.status(400).json({ 
        error: 'Quiz and user answers are required'
      });
    }

    if (userAnswers.length !== quiz.questions.length) {
      console.error('[ServerDebug] Answer count mismatch');
      return res.status(400).json({
        error: 'Number of answers must match number of questions'
      });
    }

    const results = quiz.questions.map((question, index) => {
      const userAnswer = parseInt(userAnswers[index]);
      const correctAnswer = parseInt(question.correctAnswer);
      const isCorrect = userAnswer === correctAnswer;
      
      console.log('[ServerDebug] Answer comparison:', {
        questionIndex: index,
        userAnswer,
        correctAnswer,
        isCorrect
      });

      return {
        questionIndex: index,
        isCorrect,
        correctAnswer,
        userAnswer,
        question: question.question,
        selectedOption: question.options[userAnswer],
        correctOption: question.options[correctAnswer]
      };
    });

    const correctAnswers = results.filter(r => r.isCorrect).length;
    const score = (correctAnswers / quiz.questions.length) * 100;

    // Generate detailed feedback for each question
    const feedback = results.map(result => {
      if (result.isCorrect) {
        return `Question ${result.questionIndex + 1}: Correct! You selected "${result.selectedOption}"`;
      } else {
        return `Question ${result.questionIndex + 1}: Incorrect. You selected "${result.selectedOption}", but the correct answer was "${result.correctOption}"`;
      }
    });

    const response = {
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      feedback,
      results
    };

    console.log('[ServerDebug] Validation results:', {
      score,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      sampleFeedback: feedback[0]
    });

    res.json(response);
  } catch (error) {
    console.error('[ServerDebug] Error validating answers:', error);
    res.status(500).json({ 
      error: 'Failed to validate answers',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 