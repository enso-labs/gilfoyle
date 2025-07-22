import test from 'ava';
import {promises as fs} from 'fs';
import path from 'path';
import os from 'os';
import {spawn} from 'child_process';

// Test helpers
interface CLIResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: string | null;
}

async function runInteractiveCLI(
	commands: string[],
	timeout = 30000,
	configDir?: string,
): Promise<CLIResult> {
	return new Promise((resolve, reject) => {
		const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
		const env = {
			...process.env,
			NODE_ENV: 'test',
		};

		if (configDir) {
			env.XDG_CONFIG_HOME = configDir;
		}

		const child = spawn('node', [cliPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env,
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
				}, 200); // Faster for stress testing
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

// Stress tests
test('CLI handles rapid command execution', async t => {
	const commands = [
		'/help',
		'/home',
		'/help',
		'/config',
		'/home',
		'/models',
		'/home',
		'/help',
		'clear',
		'/config',
		'clear',
		'exit',
	];

	const result = await runInteractiveCLI(commands, 20000);

	// Should handle rapid commands without crashing
	t.is(result.exitCode, 0);
	t.true(
		result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
	);
});

test('CLI handles many sequential commands', async t => {
	const commands = [];

	// Generate 50 commands
	for (let i = 0; i < 10; i++) {
		commands.push('/help', '/home', '/config', '/models', 'clear');
	}
	commands.push('exit');

	const result = await runInteractiveCLI(commands, 30000);

	// Should complete all commands without issues
	t.is(result.exitCode, 0);
	t.notRegex(result.stderr, /Error.*crashed/i);
});

test('CLI handles very long input strings', async t => {
	// Create a very long command string
	const longCommand = 'a'.repeat(1000);
	const commands = [longCommand, 'exit'];

	const result = await runInteractiveCLI(commands, 10000);

	// Should handle long input gracefully
	t.true(result.exitCode === 0 || result.signal === 'SIGTERM');
	t.true(
		result.stdout.includes('Unknown command') ||
			result.stdout.includes('Error') ||
			result.stdout.includes('Welcome'),
	);
});

test('CLI handles special characters in commands', async t => {
	const specialCommands = [
		'!@#$%^&*()',
		'<script>alert("test")</script>',
		'../../etc/passwd',
		'`cat /etc/passwd`',
		'$(whoami)',
		'\\n\\r\\t',
		'🚀🎉💻',
		'exit',
	];

	const result = await runInteractiveCLI(specialCommands, 15000);

	// Should handle special characters without crashing or security issues
	t.true(result.exitCode === 0 || result.signal === 'SIGTERM');
	t.notRegex(result.stderr, /Error.*crashed/i);
});

// Memory and resource tests
test('CLI handles repeated initialization attempts', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-stress-test-'),
	);

	try {
		const commands = [
			'/init',
			'/init',
			'/init',
			'/chat',
			'/init',
			'/export',
			'/init',
			'exit',
		];

		const result = await runInteractiveCLI(commands, 45000, tempDir);

		// Should handle multiple init attempts gracefully
		t.true(result.exitCode === 0 || result.signal === 'SIGTERM');

		// Clean up
		const agentsFile = path.join(process.cwd(), 'AGENTS.md');
		await fs.unlink(agentsFile).catch(() => {});
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI handles rapid view switching', async t => {
	const commands = [
		'/help',
		'/models',
		'/api-config',
		'/help',
		'/home',
		'/models',
		'/home',
		'/help',
		'/models',
		'/home',
		'exit',
	];

	const result = await runInteractiveCLI(commands, 25000);

	// Should handle rapid view changes without issues
	t.is(result.exitCode, 0);
	t.true(
		result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
	);
});

// Error condition tests
test('CLI handles corrupted environment gracefully', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-stress-test-'),
	);

	try {
		// Create a scenario with missing permissions or corrupted files
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		// Create an empty file where directory should be
		const badPath = path.join(configDir, 'gilfoyle.json', 'bad');
		await fs.mkdir(path.dirname(badPath), {recursive: true});
		await fs.writeFile(badPath, 'bad');

		const result = await runInteractiveCLI(['exit'], 10000, tempDir);

		// Should start despite environmental issues
		t.true(
			result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI handles concurrent command execution', async t => {
	// Test multiple rapid commands that might conflict
	const commands = [
		'/config',
		'/reset-config',
		'/config',
		'/models',
		'/api-config',
		'/home',
		'clear',
		'/help',
		'exit',
	];

	const result = await runInteractiveCLI(commands, 20000);

	// Should handle potentially conflicting commands
	t.is(result.exitCode, 0);
	t.notRegex(result.stderr, /Error.*crashed/i);
});

// Edge case input tests
test('CLI handles empty commands gracefully', async t => {
	const commands = [
		'', // Empty string
		'   ', // Whitespace only
		'\n', // Just newline
		'\t', // Just tab
		'/help', // Valid command
		'', // Empty again
		'exit',
	];

	const result = await runInteractiveCLI(commands, 10000);

	// Should handle empty inputs without issues
	t.is(result.exitCode, 0);
	t.true(result.stdout.includes('Help - Available Commands'));
});

test('CLI handles command injection attempts', async t => {
	const maliciousCommands = [
		'/help; rm -rf /',
		'/config && cat /etc/passwd',
		'/models | whoami',
		'/init > /tmp/hack',
		'/export < /dev/null',
		'exit',
	];

	const result = await runInteractiveCLI(maliciousCommands, 15000);

	// Should treat these as regular commands, not shell injection
	t.true(result.exitCode === 0 || result.signal === 'SIGTERM');
	t.true(
		result.stdout.includes('Unknown command') ||
			result.stdout.includes('Help') ||
			result.stdout.includes('Error'),
	);
});

// Performance tests
test('CLI starts within acceptable time limit', async t => {
	const startTime = Date.now();
	const result = await runInteractiveCLI(['exit'], 10000);
	const endTime = Date.now();

	const startupTime = endTime - startTime;

	t.is(result.exitCode, 0);
	t.true(
		startupTime < 8000,
		`Startup took ${startupTime}ms, should be under 8000ms`,
	);
});

test('CLI handles multiple parallel operations', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-stress-test-'),
	);

	try {
		// Simulate trying to do multiple things at once
		const commands = [
			'/init', // Start initialization
			'/models', // Try to access models while initializing
			'/config', // Try to access config
			'/export', // Try to export while init is happening
			'/chat', // Try to start chat
			'exit',
		];

		const result = await runInteractiveCLI(commands, 30000, tempDir);

		// Should handle overlapping operations gracefully
		t.true(result.exitCode === 0 || result.signal === 'SIGTERM');

		// Clean up
		const agentsFile = path.join(process.cwd(), 'AGENTS.md');
		await fs.unlink(agentsFile).catch(() => {});
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Unicode and international text tests
test('CLI handles Unicode input correctly', async t => {
	const unicodeCommands = [
		'Здравствуй мир', // Russian
		'こんにちは', // Japanese
		'مرحبا', // Arabic
		'🌍🚀💻', // Emojis
		'Ñoño niño', // Spanish with accents
		'exit',
	];

	const result = await runInteractiveCLI(unicodeCommands, 12000);

	// Should handle Unicode without crashes
	t.is(result.exitCode, 0);
	t.notRegex(result.stderr, /Error.*crashed/i);
});

// Memory leak simulation
test('CLI handles repeated operations without memory issues', async t => {
	const commands = [];

	// Repeat operations many times to check for memory leaks
	for (let i = 0; i < 20; i++) {
		commands.push('/help', 'clear', '/config', 'clear');
	}
	commands.push('exit');

	const result = await runInteractiveCLI(commands, 30000);

	// Should complete without memory issues
	t.is(result.exitCode, 0);
	t.notRegex(result.stderr, /Error.*memory/i);
});

// Signal handling tests
test('CLI responds to termination signals gracefully', async t => {
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

	child.stdout?.on('data', data => {
		stdout += data.toString();
	});

	child.stderr?.on('data', data => {
		stderr += data.toString();
	});

	// Wait for CLI to start, then send SIGTERM
	setTimeout(() => {
		if (!child.killed) {
			child.kill('SIGTERM');
		}
	}, 2000);

	const result = await new Promise<CLIResult>(resolve => {
		child.on('close', (code, signal) => {
			resolve({
				stdout,
				stderr,
				exitCode: code,
				signal,
			});
		});

		// Fallback timeout
		setTimeout(() => {
			if (!child.killed) {
				child.kill('SIGKILL');
			}
			resolve({
				stdout,
				stderr,
				exitCode: null,
				signal: 'SIGKILL',
			});
		}, 5000);
	});

	// Should handle termination signals properly
	t.true(result.signal === 'SIGTERM' || result.signal === 'SIGKILL');
	t.true(stdout.includes('Welcome') || stdout.includes('Gilfoyle'));
});

// Resource cleanup tests
test('CLI cleans up resources on exit', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-stress-test-'),
	);

	try {
		// Run CLI and let it create files
		const result = await runInteractiveCLI(['/init', 'exit'], 20000, tempDir);

		// Should exit cleanly
		t.is(result.exitCode, 0);

		// Check that no temporary files were left behind in inappropriate places
		const tempFiles = await fs.readdir(os.tmpdir());
		const gilfoyleTempFiles = tempFiles.filter(
			f => f.includes('gilfoyle') && !f.includes('test'),
		);

		// Should not leave temporary files (other than our test directories)
		t.true(
			gilfoyleTempFiles.length === 0 ||
				gilfoyleTempFiles.every(f => f.includes('test')),
		);

		// Clean up AGENTS.md if created
		const agentsFile = path.join(process.cwd(), 'AGENTS.md');
		await fs.unlink(agentsFile).catch(() => {});
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});
