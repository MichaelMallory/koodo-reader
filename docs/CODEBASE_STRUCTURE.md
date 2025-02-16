# Koodo Reader Codebase Structure

## Overview
Koodo Reader is a modern ebook reader built with React, TypeScript, and Electron. This document provides a comprehensive overview of the codebase structure, architecture, and key components.

## Project Architecture

### Technology Stack
- **Frontend**: React with TypeScript
- **Desktop App**: Electron
- **State Management**: React Context API
- **Styling**: SCSS Modules
- **Build Tools**: Webpack, Create React App
- **Package Management**: Yarn

### Directory Structure

```
koodo-reader/
├── src/                    # Main source code
│   ├── assets/            # Static assets (images, styles)
│   ├── components/        # Reusable React components
│   ├── containers/        # Container components (pages)
│   ├── constants/         # Constants and configuration
│   ├── models/           # Data models and types
│   ├── pages/            # Page components
│   ├── router/           # Routing configuration
│   ├── store/            # State management
│   └── utils/            # Utility functions
├── public/               # Public static files
├── types/                # TypeScript type definitions
├── main.js              # Electron main process
└── package.json         # Project dependencies and scripts
```

## Key Components

### 1. Main Process (`main.js`)
- Electron's main process file
- Handles window management
- Manages file system operations
- Coordinates IPC (Inter-Process Communication)

### 2. Source Code (`src/`)

#### Components (`src/components/`)
- Reusable UI components
- Each component follows a modular structure:
  - Component file (TSX)
  - Styles file (SCSS)
  - Tests (if applicable)

#### Containers (`src/containers/`)
- Higher-level components that manage state
- Connect components to the application state
- Handle business logic

#### Models (`src/models/`)
- TypeScript interfaces and types
- Data structure definitions
- Book and reader-related models

#### Store (`src/store/`)
- Application state management
- Uses React Context API
- Manages:
  - Book library
  - Reader settings
  - User preferences
  - Application state

#### Utils (`src/utils/`)
- Helper functions
- File operations
- Book format handling
- Data persistence

## Key Features and Their Implementations

### 1. Book Reader
- Located in `src/containers/reader/`
- Supports multiple formats (EPUB, PDF, MOBI)
- Implements:
  - Page navigation
  - Text selection
  - Bookmarks
  - Highlights
  - Notes

### 2. Library Management
- Located in `src/containers/library/`
- Features:
  - Book import
  - Metadata extraction
  - Cover generation
  - Library organization

### 3. Settings and Preferences
- Located in `src/containers/settings/`
- Manages:
  - Theme settings
  - Reading preferences
  - Sync options
  - Backup settings

## State Management

### Application State
- Uses React Context API
- Main contexts:
  - Library context (books)
  - Reader context (current book, progress)
  - Settings context (user preferences)
  - Theme context (appearance)

### Data Persistence
- Local storage for settings
- File system for books and metadata
- Cloud sync capabilities

## Build and Development

### Development Mode
```bash
yarn dev  # Starts development server and electron
```
- Runs React dev server on port 3000
- Opens Electron window
- Enables hot reloading

### Production Build
```bash
yarn build  # Creates production build
```
- Builds React application
- Packages with Electron
- Creates installers

## API Integration Points

### File System API
- Book import/export
- Metadata management
- Cover image handling

### Cloud Storage APIs
- Dropbox integration
- Google Drive integration
- WebDAV support

### External Services
- Translation API
- Dictionary API
- Text-to-Speech

## Coding Standards

### TypeScript Usage
- Strict type checking enabled
- Interface-first approach
- Proper type definitions for all components

### Component Structure
- Functional components with hooks
- Props interface definitions
- Modular CSS/SCSS
- Clear component responsibilities

### State Management Guidelines
- Context for global state
- Local state for component-specific data
- Proper state initialization
- Type-safe state updates

## Testing

### Unit Tests
- Component testing with Jest
- Utility function tests
- State management tests

### E2E Tests
- Electron application tests
- Reader functionality tests
- Library management tests

## Contributing Guidelines

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Component naming conventions

### Pull Request Process
1. Feature branch creation
2. Development with tests
3. Code review
4. CI/CD pipeline checks
5. Merge to main branch

## Available Scripts

- `yarn start`: Start React development server
- `yarn dev`: Start Electron development mode
- `yarn build`: Create production build
- `yarn test`: Run test suite
- `yarn lint`: Run linter
- `yarn package`: Create installable packages

## Configuration Files

### package.json
- Dependencies
- Build scripts
- Electron configuration
- Project metadata

### tsconfig.json
- TypeScript configuration
- Compiler options
- Module resolution

### electron-builder.env
- Electron builder configuration
- Build targets
- Package options

## Deployment

### Web Version
- Vercel deployment
- Static file hosting
- Progressive Web App

### Desktop Version
- Windows installer
- macOS DMG
- Linux AppImage/deb/rpm

## Security Considerations

### File System Access
- Sandboxed operations
- Secure file handling
- Permission management

### Data Privacy
- Local storage encryption
- Secure cloud sync
- User data protection

## Performance Optimization

### React Optimization
- Memo usage
- Callback optimization
- Lazy loading
- Code splitting

### Electron Optimization
- IPC communication
- Memory management
- Resource handling

## Internationalization

### i18n Implementation
- Multiple language support
- RTL support
- Translation management
- Language detection

## Accessibility

### ARIA Implementation
- Screen reader support
- Keyboard navigation
- Focus management
- Color contrast compliance 