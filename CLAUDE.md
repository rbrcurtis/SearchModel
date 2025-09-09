# SearchModel Project Guidelines

## Package Manager
This project uses **Yarn** as the package manager. Do not use npm.

## Commands
- `yarn install` - Install dependencies
- `yarn build` - Build the project (CJS, ESM, and TypeScript types)
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage
- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier

## Pre-commit Hook
The project has a Husky pre-commit hook that runs `yarn build` before each commit to ensure the code compiles successfully.

## Testing
- Jest is configured for TypeScript testing
- Test files should be placed in `__tests__` directories or named with `.test.ts` or `.spec.ts` extensions
- Tests are located alongside the source files they test
- **IMPORTANT**: All test IDs must use the `id()` function from `src/utils/id` instead of hardcoded values
  - Example: `const testId = id()` instead of `const testId = 'test-id'`
  - This ensures unique IDs in tests and prevents conflicts

## Project Structure
- `src/` - Source TypeScript files
  - `core/` - Core classes (SearchModel, SearchService)
  - `decorators/` - Field decorators for validation and typing
  - `utils/` - Utility functions (logging, ID generation)
- `lib/` - CommonJS build output
- `esm/` - ESM build output
- `types/` - TypeScript type definitions

## Key Technologies
- TypeScript
- Elasticsearch integration
- Decorator-based field validation
- Jest for testing
- Husky for Git hooks