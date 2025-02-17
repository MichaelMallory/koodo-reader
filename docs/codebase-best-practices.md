# Codebase Best Practices

## Core Principles

### AI-First Development
1. **File Size Limits**
   - Maximum 250 lines per file
   - Split larger components into smaller, focused modules
   - Use composition over inheritance

2. **Documentation Standards**
   ```typescript
   /**
    * @fileoverview
    * SpeedReader component for RSVP (Rapid Serial Visual Presentation) reading.
    * Implements matrix-themed visualization with configurable WPM and comprehension tracking.
    * 
    * @module SpeedReader
    * @requires framer-motion
    * @requires react
    */

   /**
    * Displays text using RSVP technique with matrix effects
    * @component
    * @param {SpeedReaderProps} props - Component properties
    * @param {string} props.text - Text content to display
    * @param {number} props.initialWPM - Initial words per minute
    * @param {(progress: number) => void} props.onProgressUpdate - Progress callback
    * @returns {JSX.Element} SpeedReader component
    */
   ```

3. **Type Documentation**
   ```typescript
   /**
    * Configuration for matrix rain effect
    * @interface MatrixConfig
    * @property {string[]} characters - Characters to use in animation
    * @property {number} speed - Animation speed in pixels per frame
    * @property {number} density - Character density per column
    */
   interface MatrixConfig {
     characters: string[];
     speed: number;
     density: number;
   }
   ```

## Project Structure

### Directory Organization
```
src/
├── components/
│   ├── common/                 # Shared components
│   │   ├── Button/
│   │   │   ├── index.tsx      # Component export
│   │   │   ├── Button.tsx     # Implementation
│   │   │   ├── Button.test.tsx # Tests
│   │   │   └── Button.module.scss # Styles
│   │   └── ...
│   └── speed-reader/          # Speed reader feature
│       ├── atoms/             # Atomic components
│       │   ├── Word/
│       │   ├── Controls/
│       │   └── Progress/
│       ├── molecules/         # Composite components
│       │   ├── WordDisplay/
│       │   └── SpeedControls/
│       ├── organisms/         # Complex components
│       │   ├── Reader/
│       │   └── Dashboard/
│       └── templates/         # Page layouts
│           └── ReaderLayout/
├── contexts/                  # React contexts
│   └── speed-reader/
│       ├── SpeedReaderContext.tsx
│       └── SpeedReaderProvider.tsx
├── hooks/                     # Custom hooks
│   └── speed-reader/
│       ├── useSpeedReader.ts
│       ├── useReadingProgress.ts
│       └── useComprehension.ts
├── utils/                     # Utility functions
│   └── speed-reader/
│       ├── text-processing/
│       ├── metrics/
│       └── animations/
├── styles/                    # Global styles
│   ├── _variables.scss
│   ├── _mixins.scss
│   └── _matrix-theme.scss
└── types/                     # TypeScript types
    └── speed-reader/
        ├── reader.types.ts
        └── metrics.types.ts
```

### File Naming Conventions

1. **Component Files**
   ```
   ComponentName/
   ├── index.tsx              # Export file
   ├── ComponentName.tsx      # Main component
   ├── ComponentName.test.tsx # Tests
   ├── ComponentName.module.scss # Styles
   └── types.ts              # Component types
   ```

2. **Utility Files**
   ```
   utility-name/
   ├── index.ts              # Export file
   ├── utility-name.ts       # Implementation
   └── utility-name.test.ts  # Tests
   ```

3. **Context Files**
   ```
   feature-context/
   ├── index.ts              # Export file
   ├── FeatureContext.tsx    # Context definition
   ├── FeatureProvider.tsx   # Provider implementation
   └── types.ts             # Context types
   ```

## Code Organization

### Component Structure
```typescript
// SpeedReader.tsx

/**
 * @fileoverview
 * Main speed reader component implementing RSVP visualization
 */

// 1. Imports
import React from 'react';
import { motion } from 'framer-motion';
import styles from './SpeedReader.module.scss';

// 2. Types
interface SpeedReaderProps {
  // Props definition
}

// 3. Constants
const ANIMATION_VARIANTS = {
  // Animation configurations
};

// 4. Component
export const SpeedReader: React.FC<SpeedReaderProps> = ({
  text,
  initialWPM,
  onProgressUpdate
}) => {
  // Implementation
};
```

### Hook Structure
```typescript
// useSpeedReader.ts

/**
 * @fileoverview
 * Hook for managing speed reader state and controls
 */

// 1. Imports
import { useState, useCallback } from 'react';

// 2. Types
interface SpeedReaderState {
  // State definition
}

// 3. Hook
export const useSpeedReader = (initialWPM: number) => {
  // Implementation
};
```

## Documentation Requirements

### File Headers
```typescript
/**
 * @fileoverview
 * [Brief description of file purpose]
 * 
 * @module [ModuleName]
 * @requires [dependencies]
 * @maintainer [Your Name]
 * @lastUpdated [YYYY-MM-DD]
 */
```

### Function Documentation
```typescript
/**
 * Processes text for RSVP display
 * @function processText
 * @param {string} text - Raw text to process
 * @param {ProcessOptions} options - Processing options
 * @returns {Word[]} Array of processed words
 * @throws {ValidationError} If text is invalid
 */
```

### Type Documentation
```typescript
/**
 * Reading progress metrics
 * @interface ReadingMetrics
 * @property {number} wpm - Current words per minute
 * @property {number} progress - Reading progress (0-1)
 * @property {number} comprehension - Comprehension score (0-1)
 */
```

## Testing Structure

### Test Organization
```typescript
// ComponentName.test.tsx

describe('ComponentName', () => {
  describe('initialization', () => {
    // Setup tests
  });

  describe('interactions', () => {
    // User interaction tests
  });

  describe('animations', () => {
    // Animation tests
  });

  describe('accessibility', () => {
    // A11y tests
  });
});
```

## Style Organization

### SCSS Modules
```scss
// ComponentName.module.scss

// 1. Imports
@import '../../styles/variables';
@import '../../styles/mixins';

// 2. Local variables
$component-spacing: 1rem;

// 3. Component styles
.container {
  // Styles
}

// 4. Variants
.variant {
  // Variant styles
}

// 5. States
.active {
  // State styles
}
```

## Performance Considerations

### Code Splitting
```typescript
// Lazy load heavy components
const SpeedReaderDashboard = React.lazy(() => 
  import('./SpeedReaderDashboard')
);

// Use Suspense
<Suspense fallback={<MatrixLoadingSpinner />}>
  <SpeedReaderDashboard />
</Suspense>
```

### State Management
```typescript
// Use context selectors
const { wpm } = useSpeedReader(state => ({
  wpm: state.wpm
}));

// Memoize expensive calculations
const processedText = useMemo(() => 
  processText(text), [text]
);
```

## Integration Guidelines

### Existing Codebase Integration
1. **Feature Isolation**
   - Keep speed reader components in dedicated directory
   - Use existing utility functions where possible
   - Follow established patterns

2. **State Management**
   - Integrate with existing context structure
   - Maintain consistent state patterns
   - Use proper type definitions

3. **Styling Integration**
   - Follow existing SCSS module pattern
   - Use shared variables and mixins
   - Maintain theme consistency

This document should be used as a reference for maintaining consistent code quality and organization across the project. 