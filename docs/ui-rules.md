# UI Development Guidelines

## Core Principles

### Browser-First Development
1. **Progressive Enhancement**
   ```typescript
   // DO - Check for features before using
   const useElectronFeatures = () => {
     if (window.electron) {
       // Electron-specific features
     } else {
       // Browser fallback
     }
   };
   ```

2. **Responsive Design**
   - Mobile-first breakpoints
   - Fluid typography
   - Flexible layouts
   - Touch-friendly targets

3. **Cross-Browser Compatibility**
   - Modern browser features with fallbacks
   - Graceful degradation
   - Feature detection
   - Performance optimization

### Accessibility (A11Y)

1. **Keyboard Navigation**
   ```typescript
   // Ensure all interactive elements are focusable
   const SpeedControls = () => (
     <div role="toolbar" aria-label="Reading Speed Controls">
       <button
         onKeyDown={handleKeyDown}
         aria-label="Decrease Speed"
         tabIndex={0}
       >
         -
       </button>
     </div>
   );
   ```

2. **Screen Reader Support**
   ```typescript
   // Provide context for screen readers
   const WordDisplay = ({ word, wpm }) => (
     <div 
       aria-live="polite"
       aria-atomic="true"
       aria-label={`Current word at ${wpm} words per minute`}
     >
       {word}
     </div>
   );
   ```

3. **Focus Management**
   ```typescript
   // Trap focus in modals
   const ComprehensionTest = () => {
     useFocusTrap();
     return (
       <div role="dialog" aria-modal="true">
         {/* Test content */}
       </div>
     );
   };
   ```

4. **ARIA Attributes**
   ```typescript
   // Progress indicators
   const ProgressBar = ({ progress }) => (
     <div 
       role="progressbar"
       aria-valuenow={progress}
       aria-valuemin={0}
       aria-valuemax={100}
     >
       {progress}%
     </div>
   );
   ```

### Component Architecture

1. **Atomic Design Pattern**
   ```
   components/
   ├── atoms/
   │   ├── Word.tsx
   │   ├── SpeedButton.tsx
   │   └── ProgressIndicator.tsx
   ├── molecules/
   │   ├── WordDisplay.tsx
   │   ├── SpeedControls.tsx
   │   └── MetricsCard.tsx
   ├── organisms/
   │   ├── SpeedReader.tsx
   │   ├── Dashboard.tsx
   │   └── ComprehensionTest.tsx
   └── templates/
       ├── ReaderLayout.tsx
       └── DashboardLayout.tsx
   ```

2. **Component Composition**
   ```typescript
   // Compose smaller components
   const SpeedReader = () => (
     <ReaderLayout>
       <MatrixBackground>
         <WordDisplay />
         <SpeedControls />
         <ProgressIndicator />
       </MatrixBackground>
     </ReaderLayout>
   );
   ```

### Interaction Patterns

1. **Touch & Mouse**
   ```typescript
   const TouchableControl = () => {
     const [touching, setTouching] = useState(false);
     
     return (
       <motion.button
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         onTouchStart={() => setTouching(true)}
         onTouchEnd={() => setTouching(false)}
       >
         {/* Content */}
       </motion.button>
     );
   };
   ```

2. **Gestures**
   ```typescript
   const ReaderControls = () => {
     const controls = useControls();
     
     return (
       <motion.div
         onPan={handlePan}
         onPinch={handlePinch}
         drag="x"
         dragConstraints={{ left: 0, right: 0 }}
       >
         {/* Controls */}
       </motion.div>
     );
   };
   ```

3. **Feedback & States**
   ```typescript
   const ActionButton = ({ loading, success, error }) => (
     <motion.button
       animate={{
         backgroundColor: getStateColor({ loading, success, error }),
       }}
       whileHover={{ scale: 1.05 }}
       disabled={loading}
     >
       {getStateContent({ loading, success, error })}
     </motion.button>
   );
   ```

### Responsive Behavior

1. **Breakpoint System**
   ```scss
   // _breakpoints.scss
   $breakpoints: (
     'mobile': 320px,
     'tablet': 768px,
     'desktop': 1024px,
     'wide': 1440px
   );

   @mixin respond-to($breakpoint) {
     @media (min-width: map-get($breakpoints, $breakpoint)) {
       @content;
     }
   }
   ```

2. **Fluid Typography**
   ```scss
   // _typography.scss
   @mixin fluid-type($min-vw, $max-vw, $min-size, $max-size) {
     font-size: calc(#{$min-size}px + #{($max-size - $min-size)} * 
       ((100vw - #{$min-vw}px) / #{($max-vw - $min-vw)}));
   }
   ```

3. **Layout Adaptation**
   ```typescript
   const ResponsiveLayout = () => {
     const { width } = useWindowSize();
     
     return (
       <div className={styles.layout}>
         {width > BREAKPOINTS.tablet ? (
           <DesktopLayout />
         ) : (
           <MobileLayout />
         )}
       </div>
     );
   };
   ```

### Performance Guidelines

1. **Loading States**
   ```typescript
   const LoadingState = () => (
     <motion.div
       animate={{ opacity: [0.5, 1] }}
       transition={{ repeat: Infinity }}
       className={styles.loadingMatrix}
     >
       {/* Matrix-style loading animation */}
     </motion.div>
   );
   ```

2. **Image Optimization**
   ```typescript
   const OptimizedImage = ({ src, alt }) => (
     <picture>
       <source
         srcSet={`${src}.webp`}
         type="image/webp"
       />
       <source
         srcSet={`${src}.jpg`}
         type="image/jpeg"
       />
       <img
         src={`${src}.jpg`}
         alt={alt}
         loading="lazy"
       />
     </picture>
   );
   ```

3. **Animation Performance**
   ```typescript
   const PerformantAnimation = () => (
     <motion.div
       style={{ willChange: 'transform' }}
       animate={{ transform: 'translateX(100px)' }}
       transition={{ type: 'spring' }}
     >
       {/* Content */}
     </motion.div>
   );
   ```

### Error Handling

1. **Error Boundaries**
   ```typescript
   const SpeedReaderErrorBoundary = ({ children }) => (
     <ErrorBoundary
       fallback={<MatrixThemedErrorDisplay />}
       onError={logError}
     >
       {children}
     </ErrorBoundary>
   );
   ```

2. **Loading States**
   ```typescript
   const AsyncComponent = () => {
     const { data, error, loading } = useAsync();
     
     if (loading) return <MatrixLoadingSpinner />;
     if (error) return <MatrixErrorDisplay error={error} />;
     
     return <Component data={data} />;
   };
   ```

### Platform-Specific Considerations

1. **Electron Integration**
   ```typescript
   const PlatformFeatures = () => {
     const isElectron = window.electron !== undefined;
     
     return (
       <div>
         {isElectron ? (
           <ElectronSpecificFeatures />
         ) : (
           <BrowserFeatures />
         )}
       </div>
     );
   };
   ```

2. **Touch vs Mouse**
   ```typescript
   const InteractionHandler = () => {
     const isTouchDevice = 'ontouchstart' in window;
     
     return (
       <div
         {...(isTouchDevice ? touchHandlers : mouseHandlers)}
       >
         {/* Content */}
       </div>
     );
   };
   ```

### Documentation Requirements

1. **Component Documentation**
   ```typescript
   /**
    * SpeedReader component
    * @accessibility
    * - Supports keyboard navigation
    * - ARIA live region for word updates
    * - Screen reader announcements
    * 
    * @responsive
    * - Adapts to mobile/desktop
    * - Supports touch/mouse
    * 
    * @performance
    * - Optimized animations
    * - Lazy loading
    */
   ```

2. **Usage Examples**
   ```typescript
   /**
    * @example
    * <SpeedReader
    *   text="Example text"
    *   initialWPM={300}
    *   theme="matrix"
    *   onComplete={() => {}}
    * />
    */
   ```

This document should be used in conjunction with `theme-rules.md` to ensure consistent UI development across the application. 