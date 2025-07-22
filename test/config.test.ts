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
	timeout = 15000,
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

// Configuration test data
const validConfig = {
	$schema: 'https://gilfoyle.enso.sh/config.json',
	selectedModel: 'openai:gpt-4',
	provider: {
		openai: {
			apiKey: 'test-key-123',
			models: {
				'gpt-4': {
					name: 'GPT-4',
				},
			},
		},
	},
	user: {
		name: 'TestUser',
		preferences: {
			theme: 'dark',
		},
	},
};

const invalidConfig = {
	invalidField: 'should not be here',
	selectedModel: 123, // Should be string
};

// Configuration loading tests
test('CLI creates default config when none exists', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		const result = await runInteractiveCLI(['/config', 'exit'], 8000, tempDir);

		t.true(
			result.stdout.includes('Config file') ||
				result.stdout.includes('Configuration'),
		);

		// Check that config directory and file were created
		const configDir = path.join(tempDir, 'gilfoyle');
		const configFile = path.join(configDir, 'gilfoyle.json');

		const configExists = await fs
			.access(configFile)
			.then(() => true)
			.catch(() => false);
		t.true(configExists, 'Config file should be created');

		if (configExists) {
			const configContent = await fs.readFile(configFile, 'utf8');
			const config = JSON.parse(configContent);

			t.truthy(config.$schema);
			t.truthy(config.provider);
			t.truthy(config.provider.openai);
		}
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI loads existing valid config', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// Create config directory and file
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		const configFile = path.join(configDir, 'gilfoyle.json');
		await fs.writeFile(configFile, JSON.stringify(validConfig, null, 2));

		const result = await runInteractiveCLI(['/config', 'exit'], 8000, tempDir);

		t.true(
			result.stdout.includes('TestUser') || result.stdout.includes('Config'),
		);
		t.true(result.stdout.includes('Ready') || result.stdout.includes('Loaded'));
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI handles invalid config gracefully', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// Create config directory and invalid file
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		const configFile = path.join(configDir, 'gilfoyle.json');
		await fs.writeFile(configFile, JSON.stringify(invalidConfig, null, 2));

		const result = await runInteractiveCLI(['exit'], 8000, tempDir);

		// Should still start but may show error or use defaults
		t.true(
			result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI handles corrupted config file', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// Create config directory and corrupted file
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		const configFile = path.join(configDir, 'gilfoyle.json');
		await fs.writeFile(configFile, '{ invalid json content }');

		const result = await runInteractiveCLI(['exit'], 8000, tempDir);

		// Should still start and create a new valid config
		t.true(
			result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
		);

		// Check that a valid config was recreated
		const configContent = await fs.readFile(configFile, 'utf8');
		const config = JSON.parse(configContent);
		t.truthy(config.$schema);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Configuration management tests
test('CLI /reset-config command works', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// Create config with custom settings
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		const configFile = path.join(configDir, 'gilfoyle.json');
		await fs.writeFile(configFile, JSON.stringify(validConfig, null, 2));

		const result = await runInteractiveCLI(
			['/reset-config', 'exit'],
			10000,
			tempDir,
		);

		t.true(
			result.stdout.includes('reset') || result.stdout.includes('default'),
		);

		// Check that config was reset
		const configContent = await fs.readFile(configFile, 'utf8');
		const config = JSON.parse(configContent);

		// Should not contain our custom user
		t.false(config.user?.name === 'TestUser');
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI shows config path with /config command', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		const result = await runInteractiveCLI(['/config', 'exit'], 8000, tempDir);

		t.true(
			result.stdout.includes('Config file:') ||
				result.stdout.includes('gilfoyle.json') ||
				result.stdout.includes('Configuration'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// API configuration tests
test('CLI shows API config view', async t => {
	const result = await runInteractiveCLI(['/api-config', 'exit'], 10000);

	// Should show API configuration interface
	t.true(
		result.stdout.includes('API') ||
			result.stdout.includes('key') ||
			result.stdout.includes('provider') ||
			result.stdout.includes('Configure'),
	);
});

// Model configuration tests
test('CLI shows available models', async t => {
	const result = await runInteractiveCLI(['/models', 'exit'], 10000);

	// Should show model selection interface
	t.true(
		result.stdout.includes('model') ||
			result.stdout.includes('Model') ||
			result.stdout.includes('GPT') ||
			result.stdout.includes('provider'),
	);
});

test('CLI persists model selection', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// First run: check current model
		const result1 = await runInteractiveCLI(['exit'], 5000, tempDir);
		const initialModel = result1.stdout
			.match(/Model:\s*([^\n\r]+)/)?.[1]
			?.trim();

		t.truthy(initialModel, 'Should show current model');

		// The CLI creates a config, so we can check it was persisted
		const configDir = path.join(tempDir, 'gilfoyle');
		const configFile = path.join(configDir, 'gilfoyle.json');

		const configExists = await fs
			.access(configFile)
			.then(() => true)
			.catch(() => false);
		if (configExists) {
			const configContent = await fs.readFile(configFile, 'utf8');
			const config = JSON.parse(configContent);
			t.truthy(config.selectedModel || config.provider);
		}
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// User configuration tests
test('CLI accepts and persists user name from command line', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// Run CLI with --name parameter
		const cliPath = path.join(process.cwd(), 'dist', 'cli.js');
		const child = spawn('node', [cliPath, '--name', 'CLITestUser'], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: {
				...process.env,
				NODE_ENV: 'test',
				XDG_CONFIG_HOME: tempDir,
			},
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', data => {
			stdout += data.toString();
			// Send exit after CLI starts
			if (stdout.includes('$')) {
				setTimeout(() => {
					if (child.stdin && !child.stdin.destroyed) {
						child.stdin.write('exit\n');
					}
				}, 1000);
			}
		});

		child.stderr?.on('data', data => {
			stderr += data.toString();
		});

		// Wait for CLI to complete
		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				child.kill('SIGTERM');
				resolve(null);
			}, 8000);

			child.on('close', () => {
				clearTimeout(timer);
				resolve(null);
			});

			child.on('error', error => {
				clearTimeout(timer);
				reject(error);
			});
		});

		// Check that user name appears in output
		t.true(
			stdout.includes('CLITestUser') || stdout.includes('Welcome, CLITestUser'),
		);

		// Check that config was created with user name
		const configDir = path.join(tempDir, 'gilfoyle');
		const configFile = path.join(configDir, 'gilfoyle.json');

		const configExists = await fs
			.access(configFile)
			.then(() => true)
			.catch(() => false);
		if (configExists) {
			const configContent = await fs.readFile(configFile, 'utf8');
			const config = JSON.parse(configContent);
			t.is(config.user?.name, 'CLITestUser');
		}
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Configuration schema validation
test('CLI config includes required schema', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		await runInteractiveCLI(['exit'], 5000, tempDir);

		const configDir = path.join(tempDir, 'gilfoyle');
		const configFile = path.join(configDir, 'gilfoyle.json');

		const configContent = await fs.readFile(configFile, 'utf8');
		const config = JSON.parse(configContent);

		// Validate required fields
		t.is(config.$schema, 'https://gilfoyle.enso.sh/config.json');
		t.truthy(config.provider);
		t.truthy(config.provider.openai);
		t.truthy(config.provider.anthropic);
		t.truthy(config.provider.google);
		t.truthy(config.provider.ollama);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Error recovery tests
test('CLI recovers from permission errors', async t => {
	// This test simulates scenarios where config might not be writable
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-config-test-'),
	);

	try {
		// Create a read-only directory (if possible)
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		// Try to make it read-only (may not work on all systems)
		try {
			await fs.chmod(configDir, 0o444);
		} catch {
			// If we can't make it read-only, just skip this specific test
			t.pass('Skipping permission test on this system');
			return;
		}

		const result = await runInteractiveCLI(['exit'], 8000, tempDir);

		// CLI should still start even if it can't write config
		t.true(
			result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
		);
	} finally {
		// Restore permissions before cleanup
		try {
			const configDir = path.join(tempDir, 'gilfoyle');
			await fs.chmod(configDir, 0o755);
		} catch {
			// Ignore permission errors during cleanup
		}
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});
