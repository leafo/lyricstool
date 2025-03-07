# Lyricstool Development Guide

## Build Commands
- `make build` - Build application with esbuild
- `make watch` - Build and watch for changes
- `make dist` - Create minified production build
- `make deploy` - Build and deploy to production

## Code Style Guidelines
- **Imports**: Group by: 1) React, 2) Components, 3) Utils, 4) CSS
- **Components**: Function components with React.memo for optimization
- **Naming**: PascalCase for components, camelCase for functions/files, UPPER_SNAKE_CASE for constants
- **State**: Use React hooks (useState, useReducer, useCallback, useMemo)
- **CSS**: Component-specific CSS modules with consistent naming (.css)
- **Error Handling**: Try/catch in async functions, explicit error states in UI
- **Database**: IndexedDB with custom wrapper for persistence

## Project Structure
- UI components in `/ui` directory
- Services/utilities at root level
- CSS modules alongside components
- Single-file components with hooks

## Technologies
- React 19.0.0 with hooks
- esbuild for bundling
- IndexedDB for storage