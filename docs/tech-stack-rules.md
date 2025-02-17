# Speed Reader Tech Stack Rules & Best Practices

## Core Technologies

### React + TypeScript

#### Type Safety Rules
1. **Strict TypeScript Configuration**
   ```typescript
   // Always define proper interfaces for props
   interface SpeedReaderProps {
     initialWPM: number;
     text: string;
     onComplete: () => void;
   }
   
   // No implicit any
   const SpeedReader: React.FC<SpeedReaderProps> = ({ 
     initialWPM,
     text,
     onComplete 
   }) => {
     // Implementation
   };
   ```

2. **Type Assertions**
   - Avoid `any` type
   - Use type assertions only when necessary
   - Prefer type narrowing over assertions
   - Document when type assertions are required

#### Component Rules
1. **Functional Components**
   ```typescript
   // DO
   const Component: React.FC<Props> = (props) => {
     return <div>{/* Implementation */}</div>;
   };

   // DON'T
   class Component extends React.Component<Props> {
     render() {
       return <div>{/* Implementation */}</div>;
     }
   }
   ```

2. **Props Destructuring**
   ```typescript
   // DO
   const Component = ({ prop1, prop2 }: Props) => {
     return <div>{/* Implementation */}</div>;
   };

   // DON'T
   const Component = (props: Props) => {
     return <div>{props.prop1}{props.prop2}</div>;
   };
   ```

3. **Hooks Organization**
   ```typescript
   const Component = () => {
     // 1. State hooks first
     const [state, setState] = useState();

     // 2. Context hooks
     const context = useContext();

     // 3. Other hooks
     const value = useMemo();

     // 4. Effect hooks last
     useEffect(() => {
       // Side effects
     }, [dependencies]);
   };
   ```

### State Management (Context API)

#### Context Rules
1. **Context Structure**
   ```typescript
   // Define context type
   interface SpeedReaderContextType {
     state: SpeedReaderState;
     dispatch: React.Dispatch<SpeedReaderAction>;
   }

   // Create context with meaningful default
   const SpeedReaderContext = React.createContext<SpeedReaderContextType>({
     state: initialState,
     dispatch: () => {
       console.warn('SpeedReaderContext not initialized');
     },
   });
   ```

2. **Provider Organization**
   ```typescript
   const SpeedReaderProvider: React.FC<{ children: React.ReactNode }> = ({ 
     children 
   }) => {
     // 1. State initialization
     const [state, dispatch] = useReducer(reducer, initialState);

     // 2. Memoized value
     const value = useMemo(() => ({ state, dispatch }), [state]);

     // 3. Provider return
     return (
       <SpeedReaderContext.Provider value={value}>
         {children}
       </SpeedReaderContext.Provider>
     );
   };
   ```

3. **Context Usage**
   ```typescript
   // Create custom hook for context
   const useSpeedReader = () => {
     const context = useContext(SpeedReaderContext);
     if (!context) {
       throw new Error('useSpeedReader must be used within SpeedReaderProvider');
     }
     return context;
   };
   ```

### SCSS Modules

#### Styling Rules
1. **File Naming**
   ```
   ComponentName.module.scss  // Always use .module.scss extension
   ```

2. **Class Naming**
   ```scss
   // DO
   .componentName {
     &__element {
       &--modifier {}
     }
   }

   // DON'T
   .component-name {
     .element {
       .modifier {}
     }
   }
   ```

3. **Variables and Mixins**
   ```scss
   // _variables.scss
   $speed-reader-bg: #1a1a1a;
   $matrix-color: #00ff00;

   // _mixins.scss
   @mixin matrix-effect {
     // Implementation
   }

   // Usage
   .speedReader {
     @include matrix-effect;
     background: $speed-reader-bg;
   }
   ```

## New Dependencies

### Framer Motion

#### Animation Rules
1. **Performance Optimization**
   ```typescript
   // DO - Use layout animations sparingly
   <motion.div layout>
     {/* Content */}
   </motion.div>

   // DON'T - Avoid heavy animations on frequently updating elements
   <motion.div animate={{ transform: heavyCalculation() }}>
     {/* Content */}
   </motion.div>
   ```

2. **Animation Variants**
   ```typescript
   // Define variants at component level
   const variants = {
     initial: { opacity: 0 },
     animate: { opacity: 1 },
     exit: { opacity: 0 }
   };

   // Use in component
   <motion.div
     variants={variants}
     initial="initial"
     animate="animate"
     exit="exit"
   />
   ```

3. **Gesture Handling**
   ```typescript
   // Use whileTap, whileHover for simple interactions
   <motion.button
     whileHover={{ scale: 1.1 }}
     whileTap={{ scale: 0.9 }}
   />

   // Use drag with constraints
   <motion.div
     drag
     dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
   />
   ```

### Recharts

#### Chart Rules
1. **Performance**
   ```typescript
   // DO - Limit data points
   const data = useMemo(() => limitDataPoints(rawData, 100), [rawData]);

   // DON'T - Update charts too frequently
   <LineChart data={constantlyChangingData} /> // Bad
   ```

2. **Responsiveness**
   ```typescript
   // Always use ResponsiveContainer
   <ResponsiveContainer width="100%" height={300}>
     <LineChart data={data}>
       {/* Chart content */}
     </LineChart>
   </ResponsiveContainer>
   ```

3. **Data Updates**
   ```typescript
   // Memoize chart data transformations
   const chartData = useMemo(() => {
     return processChartData(rawData);
   }, [rawData]);
   ```

## Testing

### Jest + React Testing Library

#### Testing Rules
1. **Component Tests**
   ```typescript
   // DO - Test user interactions
   test('speed control updates WPM', async () => {
     render(<SpeedReader />);
     const control = screen.getByRole('slider');
     await userEvent.click(control);
     expect(screen.getByText('300 WPM')).toBeInTheDocument();
   });

   // DON'T - Test implementation details
   test('internal state updates', () => {
     const { result } = renderHook(() => useState());
     // Avoid testing hooks directly
   });
   ```

2. **Async Testing**
   ```typescript
   // Always use async/await
   test('loads content', async () => {
     render(<Component />);
     await waitFor(() => {
       expect(screen.getByText('Loaded')).toBeInTheDocument();
     });
   });
   ```

3. **Mock Rules**
   ```typescript
   // Mock external dependencies
   jest.mock('framer-motion', () => ({
     motion: {
       div: 'div',
       // Add other mocked components
     },
   }));
   ```

## Performance

### Optimization Rules
1. **React Optimization**
   ```typescript
   // Use memo for expensive computations
   const expensiveValue = useMemo(() => {
     return heavyCalculation(props.data);
   }, [props.data]);

   // Use callback for function props
   const handleChange = useCallback((value: number) => {
     setWPM(value);
   }, []);
   ```

2. **Animation Performance**
   ```typescript
   // Use transform instead of top/left
   <motion.div
     animate={{ transform: 'translateX(100px)' }}
     // Instead of: animate={{ left: 100 }}
   />
   ```

3. **State Updates**
   ```typescript
   // Batch related state updates
   const updateMetrics = () => {
     dispatch({
       type: 'UPDATE_METRICS',
       payload: {
         wpm,
         comprehension,
         progress
       }
     });
   };
   ```

## Common Pitfalls

### React + TypeScript
- Avoid type assertions without validation
- Don't use `any` type
- Prevent circular dependencies
- Handle null/undefined properly

### State Management
- Avoid deeply nested contexts
- Don't put mutable values in context
- Handle context initialization properly
- Prevent unnecessary rerenders

### Styling
- Avoid global styles
- Don't mix CSS-in-JS with SCSS Modules
- Prevent specificity conflicts
- Handle theme consistency

### Animation
- Don't animate too many elements
- Avoid layout animations in lists
- Handle animation cleanup
- Prevent animation conflicts

## Development Workflow

### Code Organization
1. **File Structure**
   - One component per file
   - Consistent naming convention
   - Logical folder grouping
   - Clear import paths

2. **Component Structure**
   ```typescript
   // 1. Imports
   import { ... } from '...';

   // 2. Types
   interface Props {...}

   // 3. Constants
   const CONSTANTS = {...}

   // 4. Component
   export const Component = () => {...}

   // 5. Styles (in separate .module.scss file)
   ```

3. **Documentation**
   ```typescript
   /**
    * SpeedReader component displays text using RSVP technique
    * @param initialWPM - Starting words per minute
    * @param text - Text to display
    * @param onComplete - Callback when reading completes
    */
   export const SpeedReader = ({...}: Props) => {...}
   ```

This document should be treated as a living guide and updated as new patterns and best practices emerge during development. 