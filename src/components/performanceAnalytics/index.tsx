import React, { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { QuestionGeneratorService } from '../../services/comprehension/questionGenerator';
import './performanceAnalytics.css';

Chart.register(...registerables);

interface PerformanceData {
  readingSpeeds: number[];
  comprehensionScores: number[];
  timestamps: number[];
}

interface WeightedPerformance {
  speed: number;
  score: number;
  weight: number;
}

interface PerformanceAnalyticsProps {
  onClose: () => void;
  questionGenerator: QuestionGeneratorService;
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  onClose,
  questionGenerator
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    readingSpeeds: [],
    comprehensionScores: [],
    timestamps: []
  });
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  useEffect(() => {
    if (performanceData.readingSpeeds.length > 0) {
      renderChart();
    }
  }, [performanceData]);

  const loadPerformanceData = async () => {
    try {
      const quizHistory = await questionGenerator.getQuizHistory();
      const completedQuizzes = quizHistory.filter(record => record.results && record.quiz.metadata.readingSpeed);
      
      setPerformanceData({
        readingSpeeds: completedQuizzes.map(q => q.quiz.metadata.readingSpeed),
        comprehensionScores: completedQuizzes.map(q => q.results?.score || 0),
        timestamps: completedQuizzes.map(q => q.timestamp)
      });
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  };

  const renderChart = () => {
    if (!chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Create scatter plot
    chartInstance.current = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Reading Performance',
          data: performanceData.readingSpeeds.map((speed, i) => ({
            x: speed,
            y: performanceData.comprehensionScores[i]
          })),
          backgroundColor: 'rgba(0, 255, 0, 0.5)',
          borderColor: 'rgba(0, 255, 0, 1)',
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Neural Sync Performance Matrix',
            color: '#0f0',
            font: {
              size: 16,
              family: 'monospace'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Reading Speed (WPM)',
              color: '#0f0'
            },
            grid: {
              color: 'rgba(0, 255, 0, 0.1)'
            },
            ticks: {
              color: '#0f0'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Comprehension Score (%)',
              color: '#0f0'
            },
            grid: {
              color: 'rgba(0, 255, 0, 0.1)'
            },
            ticks: {
              color: '#0f0'
            }
          }
        }
      }
    });
  };

  const calculateOptimalSpeed = () => {
    if (performanceData.readingSpeeds.length === 0) return 'Insufficient data';

    // Convert to weighted performances
    const weightedPerformances: WeightedPerformance[] = performanceData.readingSpeeds.map((speed, i) => {
      const score = performanceData.comprehensionScores[i];
      const timestamp = performanceData.timestamps[i];
      
      // Calculate recency weight (more recent tests have higher weight)
      const ageInDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-ageInDays / 30); // Exponential decay over 30 days
      
      // Calculate consistency weight (tests with similar speeds get higher weight)
      const similarSpeedTests = performanceData.readingSpeeds.filter(s => 
        Math.abs(s - speed) < speed * 0.1 // Within 10% of this speed
      ).length;
      const consistencyWeight = similarSpeedTests / performanceData.readingSpeeds.length;
      
      // Calculate score weight (higher scores have higher weight)
      const scoreWeight = Math.pow(score / 100, 2); // Square to emphasize high scores
      
      // Combine weights
      const weight = (recencyWeight + consistencyWeight + scoreWeight) / 3;
      
      return { speed, score, weight };
    });

    // Calculate weighted average speed for tests with good comprehension
    const goodPerformances = weightedPerformances.filter(p => p.score >= 70); // Only consider tests with 70%+ comprehension
    
    if (goodPerformances.length === 0) {
      // If no good performances, suggest a conservative speed
      const avgSpeed = performanceData.readingSpeeds.reduce((a, b) => a + b, 0) / performanceData.readingSpeeds.length;
      return `${Math.round(avgSpeed * 0.8)} WPM (Suggested starting speed)`;
    }

    const weightedSum = goodPerformances.reduce((sum, p) => sum + p.speed * p.weight, 0);
    const totalWeight = goodPerformances.reduce((sum, p) => sum + p.weight, 0);
    const optimalSpeed = Math.round(weightedSum / totalWeight);

    // Find the best comprehension score near this speed
    const nearOptimalTests = performanceData.readingSpeeds
      .map((speed, i) => ({ 
        speed, 
        score: performanceData.comprehensionScores[i] 
      }))
      .filter(test => Math.abs(test.speed - optimalSpeed) < optimalSpeed * 0.1);
    
    // Add validation to handle empty array case and ensure score is within bounds
    const bestNearOptimalScore = nearOptimalTests.length > 0 
      ? Math.min(100, Math.max(0, Math.max(...nearOptimalTests.map(t => t.score))))
      : goodPerformances[0].score; // Fallback to the first good performance score if no tests in optimal range

    return `${optimalSpeed} WPM (${bestNearOptimalScore.toFixed(1)}% comprehension)`;
  };

  const calculateAverageStats = () => {
    if (performanceData.readingSpeeds.length === 0) return {
      avgSpeed: 0,
      avgScore: 0
    };

    const avgSpeed = performanceData.readingSpeeds.reduce((a, b) => a + b, 0) / performanceData.readingSpeeds.length;
    const avgScore = performanceData.comprehensionScores.reduce((a, b) => a + b, 0) / performanceData.comprehensionScores.length;

    return {
      avgSpeed: Math.round(avgSpeed),
      avgScore: avgScore.toFixed(1)
    };
  };

  const stats = calculateAverageStats();

  return (
    <div className="performance-analytics">
      <div className="analytics-header">
        <h2>Neural Performance Matrix</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Optimal Processing Speed</h3>
          <p>{calculateOptimalSpeed()}</p>
        </div>
        <div className="stat-card">
          <h3>Average Speed</h3>
          <p>{stats.avgSpeed} WPM</p>
        </div>
        <div className="stat-card">
          <h3>Average Comprehension</h3>
          <p>{stats.avgScore}%</p>
        </div>
        <div className="stat-card">
          <h3>Total Neural Syncs</h3>
          <p>{performanceData.readingSpeeds.length}</p>
        </div>
      </div>

      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default PerformanceAnalytics; 