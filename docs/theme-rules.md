# Matrix-Inspired Theme Guidelines

## Core Theme Principles

### Color Palette

1. **Primary Colors**
   ```scss
   // _colors.scss
   $matrix: (
     'primary': #00ff00,    // Matrix green
     'secondary': #003b00,  // Dark matrix green
     'tertiary': #00ff41,   // Bright matrix accent
     'background': #000000, // Deep black
     'text': #00ff00,       // Matrix text
     'highlight': #39ff14,  // Bright highlight
     'shadow': #002200,     // Dark shadow
     'error': #ff0000,      // Error red
     'success': #00ff41,    // Success green
     'warning': #ffff00     // Warning yellow
   );
   ```

2. **Opacity Levels**
   ```scss
   $opacity-levels: (
     'high': 0.9,
     'medium': 0.7,
     'low': 0.5,
     'subtle': 0.3,
     'ghost': 0.1
   );
   ```

### Typography

1. **Font Stack**
   ```scss
   // _typography.scss
   $fonts: (
     'matrix': 'Source Code Pro',
     'display': 'Orbitron',
     'body': 'Roboto Mono',
     'fallback': monospace
   );

   @mixin matrix-text {
     font-family: map-get($fonts, 'matrix'), map-get($fonts, 'fallback');
     letter-spacing: 0.05em;
     text-transform: uppercase;
   }
   ```

2. **Text Effects**
   ```scss
   @mixin glow-effect {
     text-shadow: 0 0 5px rgba(map-get($matrix, 'primary'), 0.7),
                 0 0 10px rgba(map-get($matrix, 'primary'), 0.5),
                 0 0 15px rgba(map-get($matrix, 'primary'), 0.3);
   }

   @mixin matrix-scan {
     position: relative;
     &::after {
       content: '';
       position: absolute;
       top: 0;
       left: 0;
       right: 0;
       height: 1px;
       background: map-get($matrix, 'primary');
       animation: scan 2s linear infinite;
     }
   }
   ```

### Animation Patterns

1. **Matrix Rain Effect**
   ```typescript
   // matrixRain.ts
   const MatrixRainConfig = {
     characters: '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ',
     speed: {
       min: 1,
       max: 5
     },
     size: {
       min: 12,
       max: 16
     },
     opacity: {
       initial: 1,
       fade: 0.95
     }
   };
   ```

2. **Text Glitch Effect**
   ```typescript
   const GlitchAnimation = {
     initial: { opacity: 1 },
     animate: {
       opacity: [1, 0.8, 1],
       x: [0, -2, 2, 0],
       transition: {
         duration: 0.2,
         repeat: Infinity,
         repeatType: "reverse"
       }
     }
   };
   ```

3. **Loading Animations**
   ```typescript
   const MatrixLoading = {
     container: {
       overflow: 'hidden',
       background: '#000'
     },
     text: {
       animate: {
         y: ['0%', '100%'],
         opacity: [0, 1, 0],
         transition: {
           duration: 2,
           repeat: Infinity,
           ease: 'linear'
         }
       }
     }
   };
   ```

### Component Themes

1. **Buttons**
   ```scss
   .matrixButton {
     @include matrix-text;
     background: transparent;
     border: 1px solid map-get($matrix, 'primary');
     color: map-get($matrix, 'primary');
     padding: 0.5em 1em;
     position: relative;
     overflow: hidden;

     &::before {
       content: '';
       position: absolute;
       background: rgba(map-get($matrix, 'primary'), 0.2);
       top: 0;
       left: -100%;
       width: 100%;
       height: 100%;
       transform: skewX(-20deg);
       transition: transform 0.3s ease;
     }

     &:hover::before {
       transform: skewX(-20deg) translateX(200%);
     }
   }
   ```

2. **Input Fields**
   ```scss
   .matrixInput {
     @include matrix-text;
     background: rgba(map-get($matrix, 'background'), 0.8);
     border: 1px solid map-get($matrix, 'primary');
     color: map-get($matrix, 'primary');
     padding: 0.5em;

     &:focus {
       outline: none;
       box-shadow: 0 0 10px rgba(map-get($matrix, 'primary'), 0.5);
     }
   }
   ```

3. **Progress Indicators**
   ```scss
   .matrixProgress {
     height: 2px;
     background: rgba(map-get($matrix, 'primary'), 0.2);
     position: relative;

     &__bar {
       height: 100%;
       background: map-get($matrix, 'primary');
       position: relative;
       overflow: hidden;

       &::after {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
         background: linear-gradient(
           90deg,
           transparent,
           rgba(map-get($matrix, 'highlight'), 0.5),
           transparent
         );
         animation: progress-glow 1.5s linear infinite;
       }
     }
   }
   ```

### Layout Patterns

1. **Grid System**
   ```scss
   .matrixGrid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
     gap: 1rem;
     position: relative;

     &::before {
       content: '';
       position: absolute;
       top: 0;
       left: 0;
       right: 0;
       bottom: 0;
       background: linear-gradient(
         rgba(map-get($matrix, 'primary'), 0.1) 1px,
         transparent 1px
       ),
       linear-gradient(
         90deg,
         rgba(map-get($matrix, 'primary'), 0.1) 1px,
         transparent 1px
       );
       background-size: 20px 20px;
       pointer-events: none;
     }
   }
   ```

2. **Card Layouts**
   ```scss
   .matrixCard {
     background: rgba(map-get($matrix, 'background'), 0.9);
     border: 1px solid map-get($matrix, 'primary');
     padding: 1rem;
     position: relative;

     &::before {
       content: '';
       position: absolute;
       top: -1px;
       left: -1px;
       right: -1px;
       height: 2px;
       background: linear-gradient(
         90deg,
         transparent,
         map-get($matrix, 'primary'),
         transparent
       );
     }
   }
   ```

### Animation Utilities

1. **Keyframe Animations**
   ```scss
   @keyframes scan {
     0% {
       transform: translateY(0);
     }
     100% {
       transform: translateY(100%);
     }
   }

   @keyframes glitch {
     0% {
       clip-path: inset(50% 0 30% 0);
       transform: translateX(-5px);
     }
     20% {
       clip-path: inset(15% 0 65% 0);
       transform: translateX(5px);
     }
     40% {
       clip-path: inset(80% 0 5% 0);
       transform: translateX(-5px);
     }
     60% {
       clip-path: inset(25% 0 60% 0);
       transform: translateX(5px);
     }
     80% {
       clip-path: inset(70% 0 20% 0);
       transform: translateX(-5px);
     }
     100% {
       clip-path: inset(50% 0 30% 0);
       transform: translateX(0);
     }
   }
   ```

2. **Framer Motion Variants**
   ```typescript
   const matrixVariants = {
     hidden: {
       opacity: 0,
       y: 20,
       filter: 'blur(10px)'
     },
     visible: {
       opacity: 1,
       y: 0,
       filter: 'blur(0px)',
       transition: {
         duration: 0.5,
         ease: 'easeOut'
       }
     },
     exit: {
       opacity: 0,
       y: -20,
       filter: 'blur(10px)',
       transition: {
         duration: 0.3,
         ease: 'easeIn'
       }
     }
   };
   ```

### Accessibility Considerations

1. **Color Contrast**
   ```scss
   // Ensure text remains readable
   $matrix-accessible: (
     'text-primary': #00ff00,  // Passes WCAG AA
     'text-secondary': #b3ff99, // Higher contrast for smaller text
     'background': #000000     // Maximum contrast
   );
   ```

2. **Animation Control**
   ```typescript
   const MatrixEffect = ({ reducedMotion = false }) => {
     const prefersReducedMotion = useReducedMotion() || reducedMotion;
     
     return (
       <motion.div
         animate={prefersReducedMotion ? 'static' : 'animate'}
         variants={matrixVariants}
       >
         {/* Content */}
       </motion.div>
     );
   };
   ```

### Theme Integration

1. **Theme Provider**
   ```typescript
   const MatrixThemeProvider: React.FC = ({ children }) => {
     return (
       <ThemeProvider theme={matrixTheme}>
         <GlobalStyle />
         <MatrixBackground />
         {children}
       </ThemeProvider>
     );
   };
   ```

2. **Global Styles**
   ```typescript
   const GlobalStyle = createGlobalStyle`
     body {
       background: ${props => props.theme.colors.background};
       color: ${props => props.theme.colors.text};
       font-family: ${props => props.theme.fonts.matrix};
     }
   `;
   ```

This document should be used in conjunction with `ui-rules.md` to ensure consistent theming across the application. 