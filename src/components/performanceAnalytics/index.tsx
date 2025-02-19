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

    let bestSpeed = 0;
    let bestScore = 0;

    performanceData.comprehensionScores.forEach((score, i) => {
      if (score > bestScore) {
        bestScore = score;
        bestSpeed = performanceData.readingSpeeds[i];
      }
    });

    return `${bestSpeed} WPM (${bestScore.toFixed(1)}% comprehension)`;
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