# Astro Breaker Development Guide

## Commands
- **Test**: `npm test` (all tests)
- **Single test**: `npm test -- -t "test name pattern" --config=jest.config.js` 
- **TypeCheck**: `npx tsc --noEmit`
- **Build**: `npx tsc`

## Code Style
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Imports**: Group imports by source (external libraries first, then local modules)
- **Interfaces**: Define interfaces for complex object structures
- **Error Handling**: Use try/catch for critical operations with console.error for logging
- **Entity Ticking**: Use event system - register with `entity.on(EntityEvent.TICK, ({ tickDeltaMs }) => {...})`
- **File Organization**: 
  - TypeScript source files in src/
  - Tests in src/__tests__/
  - Manager classes in src/managers/
- **Project Structure**: Follows component-based architecture with organized managers
- **Documentation**: README files in directories explain component purposes