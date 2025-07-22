# Gilfoyle CLI Test Suite

This test suite provides comprehensive testing for the Gilfoyle CLI, testing everything as the actual CLI executable rather than just testing components in isolation.

## Test Structure

The test suite is organized into four main categories:

### 📋 Basic CLI Tests (`test/cli.test.ts`)

- **Command line argument parsing** (`--help`, `--name`)
- **Interactive command handling** (all slash commands)
- **Navigation and UI testing** (status bar, welcome message, menus)
- **Basic error handling** (unknown commands, invalid input)
- **Performance testing** (startup time, command responsiveness)

### ⚙️ Configuration Tests (`test/config.test.ts`)

- **Config file creation and loading**
- **Schema validation** (JSON schema compliance)
- **User preference persistence** (name, model selection)
- **API key management** (safe handling, validation)
- **Error recovery** (corrupted files, permission issues)
- **Reset functionality** (`/reset-config` command)

### 🤖 Agent & Tool Tests (`test/agent.test.ts`)

- **Agent initialization** (`/init` command, AGENTS.md creation)
- **Chat functionality** (`/chat` command, conversation handling)
- **Export/import** (`/export`, `/compact` commands)
- **Tool integration** (file operations, external tools)
- **State management** (memory, history, session persistence)
- **Workflow testing** (complex multi-step operations)

### 💪 Stress & Edge Case Tests (`test/stress.test.ts`)

- **Rapid command execution** (stress testing input handling)
- **Large input handling** (very long commands, Unicode)
- **Memory leak detection** (repeated operations)
- **Security testing** (command injection attempts)
- **Resource cleanup** (temporary files, process cleanup)
- **Signal handling** (SIGTERM, SIGKILL graceful shutdown)

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Or directly with the test runner
node test.cjs
```

### Individual Test Categories

```bash
# Basic CLI functionality
npm run test:cli

# Configuration management
npm run test:config

# Agent and tools
npm run test:agent

# Stress tests and edge cases
npm run test:stress

# Watch mode (re-run on file changes)
npm run test:watch
```

### Test Runner Options

```bash
# Show help and all available commands
node test.js help

# Build CLI first (if not already built)
node test.js build

# Run specific test category
node test.js [basic|config|agent|stress|all]

# Watch mode for development
node test.js watch
```

## How the Tests Work

### CLI Process Spawning

All tests spawn the actual CLI executable (`dist/cli.js`) as a child process, simulating real user interaction:

```typescript
const child = spawn('node', [cliPath], {
	stdio: ['pipe', 'pipe', 'pipe'],
	env: {...process.env, NODE_ENV: 'test'},
});
```

### Interactive Command Testing

Tests send commands to the CLI's stdin and capture stdout/stderr:

```typescript
async function runInteractiveCLI(commands: string[]) {
	// Wait for CLI prompt ($) then send next command
	if (stdout.includes('$')) {
		child.stdin.write(commands[commandIndex] + '\n');
	}
}
```

### Isolated Environment Testing

Each test runs in a clean, isolated environment:

```typescript
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gilfoyle-test-'));
env.XDG_CONFIG_HOME = tempDir; // Isolated config directory
```

## Test Assertions

### Output Validation

Tests verify CLI output contains expected content:

```typescript
t.true(result.stdout.includes('Welcome'));
t.true(result.stdout.includes('Help - Available Commands'));
```

### Exit Code Verification

Tests ensure proper exit codes:

```typescript
t.is(result.exitCode, 0); // Clean exit
t.true(result.signal === 'SIGTERM'); // Proper signal handling
```

### File System Effects

Tests verify file creation and cleanup:

```typescript
const agentsExists = await fs
	.access('AGENTS.md')
	.then(() => true)
	.catch(() => false);
t.true(agentsExists, 'AGENTS.md should be created');
```

## Configuration Testing

### Temporary Config Directories

Each configuration test uses an isolated config directory:

```typescript
const tempDir = await fs.mkdtemp(
	path.join(os.tmpdir(), 'gilfoyle-config-test-'),
);
env.XDG_CONFIG_HOME = tempDir;
```

### Valid Configuration Testing

Tests verify the CLI handles various configuration scenarios:

- Fresh installation (no config)
- Valid existing configuration
- Invalid/corrupted configuration
- Missing required fields
- Schema validation

### Configuration Persistence

Tests verify that changes made through the CLI are properly saved:

```typescript
// Change model through CLI
await runInteractiveCLI(['/models', 'select-gpt4', 'exit']);

// Verify config file was updated
const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
t.is(config.selectedModel, 'openai:gpt-4');
```

## Agent Testing

### Initialization Testing

```typescript
// Test agent initialization
const result = await runInteractiveCLI(['/init', 'exit']);
t.true(result.stdout.includes('Initializing'));

// Verify AGENTS.md was created
const content = await fs.readFile('AGENTS.md', 'utf8');
t.true(content.includes('AI Agent Configuration'));
```

### Workflow Testing

Tests complete multi-step workflows:

```typescript
const result = await runInteractiveCLI([
	'/init', // Initialize agent
	'/chat', // Start chat mode
	'/export', // Export conversation
	'/compact', // Compact history
	'exit',
]);
```

## Stress Testing

### Rapid Command Execution

```typescript
const commands = ['/help', '/home', '/config', '/models'].repeat(10);
const result = await runInteractiveCLI(commands);
t.is(result.exitCode, 0); // Should handle rapid commands
```

### Security Testing

```typescript
const maliciousCommands = [
	'/help; rm -rf /',
	'/config && cat /etc/passwd',
	'$(whoami)',
];
// Should treat as regular commands, not shell injection
```

### Memory Leak Detection

```typescript
// Repeat operations many times
for (let i = 0; i < 100; i++) {
	commands.push('/help', 'clear');
}
// Should complete without memory issues
```

## Prerequisites

Before running tests:

1. **Build the CLI**:

   ```bash
   npm run build
   ```

   (The test runner will do this automatically if needed)

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Test Environment

- **Node.js**: Tests require Node.js 16+ (same as CLI)
- **AVA**: Uses AVA test framework with TypeScript support
- **Timeouts**: Generous timeouts for CLI operations (up to 5 minutes for full suite)
- **Serial Execution**: Tests run serially to avoid conflicts
- **Cleanup**: Automatic cleanup of temporary files and directories

## Debugging Tests

### Verbose Output

```bash
# Enable verbose test output
npx ava test/cli.test.ts --verbose
```

### Individual Test Files

```bash
# Run specific test file
npx ava test/config.test.ts --timeout=60s
```

### Debug Mode

```bash
# Run CLI in debug mode during tests
NODE_ENV=test npm run debug
```

## Continuous Integration

The test suite is designed for CI environments:

- **Non-interactive**: All tests are fully automated
- **Clean environment**: Tests create and clean up their own temporary directories
- **Timeout handling**: Appropriate timeouts prevent hanging in CI
- **Exit codes**: Proper exit codes for CI success/failure detection

```bash
# CI-friendly test run
npm run test:all
```

## Test Coverage

The test suite covers:

- ✅ **CLI Arguments**: All command line options
- ✅ **Interactive Commands**: All slash commands (`/help`, `/chat`, etc.)
- ✅ **Configuration**: Loading, validation, persistence, reset
- ✅ **Agent Operations**: Initialization, chat, export, compact
- ✅ **Error Handling**: Invalid input, corrupted files, permission errors
- ✅ **Performance**: Startup time, command responsiveness
- ✅ **Security**: Command injection prevention, input validation
- ✅ **Resource Management**: Memory usage, file cleanup
- ✅ **UI Components**: Status bar, menus, navigation
- ✅ **Workflow Integration**: Multi-step operations, state management

## Contributing

When adding new CLI features:

1. **Add corresponding tests** in the appropriate test file
2. **Test both success and error cases**
3. **Include edge cases** (empty input, very long input, special characters)
4. **Verify cleanup** (no temporary files left behind)
5. **Test isolation** (tests don't affect each other)

### Test Naming Convention

```typescript
test('CLI does specific thing under specific conditions', async t => {
	// Test implementation
});
```

### Test Structure

```typescript
test('descriptive test name', async t => {
  // Setup (if needed)
  const tempDir = await fs.mkdtemp(...);

  try {
    // Execute CLI command(s)
    const result = await runInteractiveCLI(['command', 'exit']);

    // Assertions
    t.is(result.exitCode, 0);
    t.true(result.stdout.includes('expected output'));

  } finally {
    // Cleanup (always in finally block)
    await fs.rm(tempDir, {recursive: true, force: true});
  }
});
```

This comprehensive test suite ensures the Gilfoyle CLI works correctly in all scenarios and provides confidence for refactoring and new feature development.
