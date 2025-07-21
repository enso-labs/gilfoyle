# Gilfoyle CLI Project

## Project Overview

**Gilfoyle** is a modern CLI application built with:

- **React + Ink** - React components for terminal interfaces
- **TypeScript** - Type-safe development
- **Meow** - CLI argument parsing
- **Node.js ESM** - Modern ES modules

## Project Structure

```
gilfoyle/
├── source/           # TypeScript source code
│   ├── app.tsx      # Main React component
│   └── cli.tsx      # CLI entry point
├── dist/            # Compiled JavaScript output
├── .vscode/         # VSCode configuration
│   └── launch.json  # Debug configurations
├── test.tsx         # Test files
└── package.json     # Dependencies and scripts
```

## Development Setup

### Prerequisites

- Node.js 16+
- npm

### Installation

```bash
npm install
```

### Development Workflow

1. **Build the project**:

   ```bash
   npm run build
   ```

2. **Development with watch mode**:

   ```bash
   npm run dev
   ```

3. **Format code (tabs + 2-space width)**:

   ```bash
   npm run format
   ```

4. **Check formatting**:

   ```bash
   npm run format:check
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

## Code Standards

### Formatting

- **Indentation**: Tabs with 2-space equivalent width
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: Always

### File Organization

- All source code in `source/` directory
- TypeScript files use `.tsx` extension for JSX components
- ES modules throughout (`"type": "module"`)

## CLI Usage

```bash
# Basic usage
gilfoyle

# With name parameter
gilfoyle --name=Developer
```

## Debugging

The project includes VSCode debugging configurations:

1. **Debug CLI (TypeScript)** - Debug source directly with ts-node
2. **Debug CLI with --name argument** - Debug with sample arguments
3. **Debug Built CLI** - Debug compiled JavaScript

Access via **Run and Debug** panel (Ctrl+Shift+D) in VSCode.

## Key Dependencies

### Runtime

- `ink` - React for CLI interfaces
- `meow` - CLI argument parsing
- `react` - React library

### Development

- `typescript` - Type checking and compilation
- `prettier` - Code formatting
- `ava` - Testing framework
- `ts-node` - TypeScript execution

## TypeScript Configuration

- **JSX**: React 17+ transform (`"jsx": "react-jsx"`)
- **Module Resolution**: Node16 for proper ESM support
- **ES Module Interop**: Enabled for React imports

## Architecture Notes

- Uses modern React JSX transform (no need to import React)
- CLI built with functional React components
- Type-safe props and component interfaces
- ES modules with top-level await support

## Common Commands

```bash
# Development
npm run dev          # Watch mode compilation
npm run build        # Build for production
npm run format       # Format all code with tabs

# Testing & Quality
npm test            # Run tests with format check
npm run format:check # Verify formatting

# CLI Testing
node dist/cli.js --name=Test  # Test built CLI
```

## Contributing Guidelines

1. Use tabs for indentation (2-space width)
2. Run `npm run format` before committing
3. Ensure all tests pass with `npm test`
4. Follow TypeScript strict mode
5. Use meaningful component and type names
