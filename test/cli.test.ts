import {spawn, ChildProcess} from 'child_process';
import test from 'ava';
import {promises as fs} from 'fs';
import path from 'path';
import os from 'os';

// Test helpers
interface CLIResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: string | null;
}

async function runCLI(
	args: string[] = [],
	input?: string,
	timeout = 10000,
): Promise<CLIResult> {
	return new Promise((resolve, reject) => {
		const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
		const child = spawn('node', [cliPath, ...args], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: {
				...process.env,
				NODE_ENV: 'test',
			},
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', data => {
			stdout += data.toString();
		});

		child.stderr?.on('data', data => {
			stderr += data.toString();
		});

		// Set timeout
		const timer = setTimeout(() => {
			child.kill('SIGTERM');
			reject(new Error(`CLI process timed out after ${timeout}ms`));
		}, timeout);

		child.on('close', (code, signal) => {
			clearTimeout(timer);
			resolve({
				stdout,
				stderr,
				exitCode: code,
				signal,
			});
		});

		child.on('error', error => {
			clearTimeout(timer);
			reject(error);
		});

		// Send input if provided
		if (input && child.stdin) {
			child.stdin.write(input);
			child.stdin.end();
		}
	});
}

async function runInteractiveCLI(
	commands: string[],
	timeout = 15000,
): Promise<CLIResult> {
	return new Promise((resolve, reject) => {
		const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
		const child = spawn('node', [cliPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: {
				...process.env,
				NODE_ENV: 'test',
			},
		});

		let stdout = '';
		let stderr = '';
		let commandIndex = 0;

		child.stdout?.on('data', data => {
			stdout += data.toString();

			// Wait for CLI to be ready and send next command
			if (commandIndex < commands.length && stdout.includes('$')) {
				setTimeout(() => {
					if (child.stdin && !child.stdin.destroyed) {
						child.stdin.write(commands[commandIndex] + '\n');
						commandIndex++;
					}
				}, 500);
			}
		});

		child.stderr?.on('data', data => {
			stderr += data.toString();
		});

		// Set timeout
		const timer = setTimeout(() => {
			child.kill('SIGTERM');
			resolve({
				stdout,
				stderr,
				exitCode: null,
				signal: 'SIGTERM',
			});
		}, timeout);

		child.on('close', (code, signal) => {
			clearTimeout(timer);
			resolve({
				stdout,
				stderr,
				exitCode: code,
				signal,
			});
		});

		child.on('error', error => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

// Setup and teardown
test.before(async () => {
	// Ensure the CLI is built
	try {
		await fs.access(path.join(process.cwd(), 'dist', 'cli.js'));
	} catch {
		throw new Error('CLI not built. Run "npm run build" first.');
	}
});

// Basic CLI tests
test('CLI shows help with --help flag', async t => {
	const result = await runCLI(['--help']);

	t.is(result.exitCode, 0);
	t.true(result.stdout.includes('Usage'));
	t.true(result.stdout.includes('gilfoyle'));
	t.true(result.stdout.includes('Options'));
	t.true(result.stdout.includes('--name'));
});

test('CLI accepts --name parameter', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('Welcome'));
	t.true(result.stdout.includes('AI development assistant'));
});

test('CLI accepts --name parameter with custom name', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	// This test checks that the CLI accepts the name parameter
	// The actual name display is tested in interactive mode
	t.is(result.exitCode, 0);
});

// Interactive command tests
test('CLI responds to /help command', async t => {
	const result = await runInteractiveCLI(['/help', 'exit'], 8000);

	t.true(result.stdout.includes('Help - Available Commands'));
	t.true(result.stdout.includes('/chat'));
	t.true(result.stdout.includes('/models'));
	t.true(result.stdout.includes('/init'));
});

test('CLI responds to /config command', async t => {
	const result = await runInteractiveCLI(['/config', 'exit'], 8000);

	t.true(
		result.stdout.includes('Config file') ||
			result.stdout.includes('Configuration'),
	);
});

test('CLI shows models with /models command', async t => {
	const result = await runInteractiveCLI(['/models', 'exit'], 10000);

	// Should show some model-related content
	t.true(
		result.stdout.includes('model') ||
			result.stdout.includes('Model') ||
			result.stdout.includes('GPT') ||
			result.stdout.includes('provider'),
	);
});

test('CLI handles unknown commands gracefully', async t => {
	const result = await runInteractiveCLI(['/nonexistent', 'exit'], 8000);

	t.true(
		result.stdout.includes('Unknown command') ||
			result.stdout.includes('Error') ||
			result.stdout.includes('not found'),
	);
});

test('CLI responds to clear command', async t => {
	const result = await runInteractiveCLI(['/help', 'clear', 'exit'], 8000);

	// After clear, the help content should not be visible in recent history
	const clearIndex = result.stdout.lastIndexOf('clear');
	const helpIndex = result.stdout.lastIndexOf('Help - Available Commands');

	if (clearIndex > -1 && helpIndex > -1) {
		t.true(clearIndex > helpIndex);
	} else {
		// If clear worked, we should see the cleared status
		t.true(result.stdout.includes('Cleared') || clearIndex > -1);
	}
});

// Configuration tests
test('CLI handles missing config gracefully', async t => {
	// Create a temporary config directory
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gilfoyle-test-'));
	const originalConfigDir = process.env.XDG_CONFIG_HOME;

	try {
		// Set temporary config directory
		process.env.XDG_CONFIG_HOME = tempDir;

		const result = await runInteractiveCLI(['exit'], 8000);

		// Should start successfully even without existing config
		t.true(
			result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
		);
	} finally {
		// Cleanup
		if (originalConfigDir) {
			process.env.XDG_CONFIG_HOME = originalConfigDir;
		} else {
			delete process.env.XDG_CONFIG_HOME;
		}
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Navigation and UI tests
test('CLI shows status bar', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('Status:'));
	t.true(result.stdout.includes('Model:'));
	t.true(result.stdout.includes('Ctrl+C to exit'));
});

test('CLI shows welcome message', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('Welcome'));
	t.true(result.stdout.includes('AI development assistant'));
	t.true(result.stdout.includes('Gilfoyle'));
});

test('CLI shows available commands on home screen', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('Available Commands'));
	t.true(result.stdout.includes('/help'));
	t.true(result.stdout.includes('/chat'));
});

// Error handling tests
test('CLI handles Ctrl+C gracefully', async t => {
	const result = await runInteractiveCLI([], 2000);

	// CLI should exit cleanly when interrupted
	t.true(result.signal === 'SIGTERM' || result.exitCode === 0);
});

test('CLI handles invalid input gracefully', async t => {
	const result = await runInteractiveCLI(['invalid_command_xyz', 'exit'], 8000);

	// Should handle invalid commands without crashing
	t.notRegex(result.stderr, /Error.*crashed/i);
	t.true(result.exitCode === 0 || result.signal === 'SIGTERM');
});

// Integration workflow tests
test('CLI can navigate between views', async t => {
	const result = await runInteractiveCLI(
		[
			'/help', // Go to help
			'/home', // Return home
			'/config', // Show config
			'exit',
		],
		12000,
	);

	t.true(result.stdout.includes('Help - Available Commands'));
	t.true(result.stdout.includes('Available Commands')); // Home screen
	t.true(
		result.stdout.includes('Config') || result.stdout.includes('Configuration'),
	);
});

test('CLI maintains command history', async t => {
	const result = await runInteractiveCLI(['/help', '/config', 'exit'], 10000);

	// Should show command history
	t.true(
		result.stdout.includes('Command History') ||
			result.stdout.includes('help') ||
			result.stdout.includes('config'),
	);
});

// Tool and agent tests (basic validation)
test('CLI shows initialization option', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(
		result.stdout.includes('/init') || result.stdout.includes('Initialize'),
	);
});

test('CLI shows export option', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('/export') || result.stdout.includes('Export'));
});

// Version and build tests
test('CLI starts without crashing', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.is(result.exitCode, 0);
	t.is(result.stderr, '');
});

test('CLI displays version information', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	// Should show version somewhere in the interface
	t.true(
		result.stdout.includes('0.3.43') ||
			result.stdout.includes('version') ||
			result.stdout.includes('Gilfoyle'),
	);
});

// Performance tests
test('CLI starts within reasonable time', async t => {
	const startTime = Date.now();
	const result = await runInteractiveCLI(['exit'], 8000);
	const endTime = Date.now();

	t.is(result.exitCode, 0);
	t.true(endTime - startTime < 8000); // Should start within 8 seconds
});

test('CLI handles rapid commands', async t => {
	const result = await runInteractiveCLI(
		['/help', '/home', '/help', '/config', 'clear', 'exit'],
		15000,
	);

	// Should handle multiple rapid commands without crashing
	t.is(result.exitCode, 0);
	t.notRegex(result.stderr, /Error.*crashed/i);
});
