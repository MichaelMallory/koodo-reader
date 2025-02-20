# Optimal Reading Speed Calculation Algorithm

## Overview
This document details the algorithm used to calculate the optimal reading speed based on historical performance data. The algorithm uses a weighted average approach that considers multiple factors to provide a more accurate and personalized reading speed recommendation.

## Data Structure
```typescript
interface PerformanceData {
  readingSpeeds: number[];    // Array of reading speeds in WPM
  comprehensionScores: number[]; // Array of comprehension scores (0-100)
  timestamps: number[];       // Array of Unix timestamps
}

interface WeightedPerformance {
  speed: number;     // Reading speed in WPM
  score: number;     // Comprehension score
  weight: number;    // Calculated weight factor
}
```

## Algorithm Components

### 1. Weight Calculation
Each test performance is assigned a weight based on three factors:

#### a. Recency Weight
More recent tests have higher weight, using exponential decay:
```typescript
const ageInDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
const recencyWeight = Math.exp(-ageInDays / 30); // 30-day decay period
```

#### b. Consistency Weight
Tests with similar speeds get higher weight:
```typescript
const similarSpeedTests = readingSpeeds.filter(s => 
  Math.abs(s - speed) < speed * 0.1  // Within 10% range
).length;
const consistencyWeight = similarSpeedTests / totalTests;
```

#### c. Score Weight
Higher comprehension scores have higher weight:
```typescript
const scoreWeight = Math.pow(score / 100, 2);  // Squared for emphasis
```

#### d. Combined Weight
```typescript
const weight = (recencyWeight + consistencyWeight + scoreWeight) / 3;
```

### 2. Performance Filtering
Only consider good performances:
```typescript
const goodPerformances = weightedPerformances.filter(p => p.score >= 70);
```

### 3. Optimal Speed Calculation

#### a. With Good Performances
```typescript
const weightedSum = goodPerformances.reduce((sum, p) => sum + p.speed * p.weight, 0);
const totalWeight = goodPerformances.reduce((sum, p) => sum + p.weight, 0);
const optimalSpeed = Math.round(weightedSum / totalWeight);
```

#### b. Fallback (No Good Performances)
```typescript
const avgSpeed = readingSpeeds.reduce((a, b) => a + b, 0) / readingSpeeds.length;
const suggestedSpeed = Math.round(avgSpeed * 0.8);  // 80% of average
```

### 4. Comprehension Score Validation
Find best comprehension score near optimal speed:
```typescript
const nearOptimalTests = readingSpeeds
  .map((speed, i) => ({ speed, score: comprehensionScores[i] }))
  .filter(test => Math.abs(test.speed - optimalSpeed) < optimalSpeed * 0.1);
const bestNearOptimalScore = Math.max(...nearOptimalTests.map(t => t.score));
```

## Key Parameters
- **Recency Decay Period**: 30 days
- **Similar Speed Range**: ±10% of test speed
- **Good Performance Threshold**: 70% comprehension
- **Fallback Speed Factor**: 80% of average
- **Optimal Range**: ±10% of calculated optimal speed

## Example Output
```typescript
// For good performances:
"350 WPM (85.5% comprehension)"

// For insufficient good performances:
"240 WPM (Suggested starting speed)"
```

## Usage Considerations

### Advantages
1. Prevents outliers from skewing recommendations
2. Favors consistent performance over one-off results
3. Adapts to user improvement over time
4. Provides conservative recommendations for new users
5. Considers both speed and comprehension quality

### Limitations
1. Requires multiple test results for accuracy
2. May be conservative for rapidly improving users
3. Doesn't account for content difficulty variations

## Future Enhancements
1. Content type-specific recommendations
2. Difficulty-adjusted calculations
3. Learning curve acceleration factors
4. Fatigue detection and adjustment
5. Genre-specific optimal speeds 