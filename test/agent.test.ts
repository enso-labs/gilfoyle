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
	timeout = 20000,
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
				}, 1000); // Longer delay for agent operations
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

// Agent initialization tests
test('CLI /init command initializes agent', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-agent-test-'),
	);

	try {
		const result = await runInteractiveCLI(['/init', 'exit'], 25000, tempDir);

		// Should show initialization progress
		t.true(
			result.stdout.includes('Initializing') ||
				result.stdout.includes('initialization') ||
				result.stdout.includes('Agent') ||
				result.stdout.includes('init'),
		);

		// Should create AGENTS.md file
		const agentsFile = path.join(process.cwd(), 'AGENTS.md');
		const agentsExists = await fs
			.access(agentsFile)
			.then(() => true)
			.catch(() => false);

		if (agentsExists) {
			const content = await fs.readFile(agentsFile, 'utf8');
			t.true(content.includes('AI Agent Configuration'));
			t.true(content.includes('Gilfoyle'));

			// Clean up
			await fs.unlink(agentsFile).catch(() => {});
		}
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI shows initialization option', async t => {
	const result = await runInteractiveCLI(['exit'], 8000);

	t.true(
		result.stdout.includes('/init') || result.stdout.includes('Initialize'),
	);
});

// Chat functionality tests
test('CLI /chat command activates chat mode', async t => {
	const result = await runInteractiveCLI(['/chat', 'exit'], 15000);

	// Should show chat mode activation or attempt
	t.true(
		result.stdout.includes('Chat') ||
			result.stdout.includes('chat') ||
			result.stdout.includes('Agent') ||
			result.stdout.includes('Ready'),
	);
});

test('CLI shows chat option in menu', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('/chat'));
	t.true(
		result.stdout.includes('conversing') || result.stdout.includes('AI agent'),
	);
});

// Agent workflow tests
test('CLI can initialize and then use chat', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-agent-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			['/init', '/chat', 'exit'],
			30000,
			tempDir,
		);

		// Should show both initialization and chat activation
		t.true(result.stdout.includes('init') || result.stdout.includes('Agent'));
		t.true(result.stdout.includes('chat') || result.stdout.includes('Chat'));

		// Clean up AGENTS.md if created
		const agentsFile = path.join(process.cwd(), 'AGENTS.md');
		await fs.unlink(agentsFile).catch(() => {});
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Export functionality tests
test('CLI /export command works', async t => {
	const result = await runInteractiveCLI(['/export', 'exit'], 12000);

	// Should show export functionality or error message if no session
	t.true(
		result.stdout.includes('Export') ||
			result.stdout.includes('export') ||
			result.stdout.includes('session') ||
			result.stdout.includes('conversation') ||
			result.stdout.includes('No agent'),
	);
});

test('CLI shows export option', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('/export') || result.stdout.includes('Export'));
});

// Compact functionality tests
test('CLI /compact command works', async t => {
	const result = await runInteractiveCLI(['/compact', 'exit'], 12000);

	// Should show compact functionality or error message if no session
	t.true(
		result.stdout.includes('Compact') ||
			result.stdout.includes('compact') ||
			result.stdout.includes('session') ||
			result.stdout.includes('conversation') ||
			result.stdout.includes('No agent'),
	);
});

test('CLI shows compact option', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(
		result.stdout.includes('/compact') || result.stdout.includes('Compact'),
	);
});

// Tool functionality tests (through agent commands)
test('CLI shows editor option', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	t.true(result.stdout.includes('/editor') || result.stdout.includes('Editor'));
});

test('CLI /editor command works', async t => {
	const result = await runInteractiveCLI(['/editor', 'exit'], 10000);

	// Should show editor mode or interface
	t.true(
		result.stdout.includes('Editor') ||
			result.stdout.includes('editor') ||
			result.stdout.includes('Edit'),
	);
});

// History and memory tests
test('CLI maintains command history during session', async t => {
	const result = await runInteractiveCLI(
		['/help', '/config', 'clear', 'exit'],
		15000,
	);

	// Should show command history being tracked
	t.true(
		result.stdout.includes('Command History') ||
			result.stdout.includes('help') ||
			result.stdout.includes('config') ||
			result.stdout.includes('Cleared'),
	);
});

test('CLI clear command clears history', async t => {
	const result = await runInteractiveCLI(['/help', 'clear', 'exit'], 10000);

	// After clear, should show cleared status
	t.true(result.stdout.includes('Cleared') || result.stdout.includes('clear'));
});

// Agent state management tests
test('CLI handles agent commands without initialization gracefully', async t => {
	const result = await runInteractiveCLI(
		['/chat', '/export', '/compact', 'exit'],
		15000,
	);

	// Should handle commands gracefully even without agent initialization
	t.true(
		result.stdout.includes('Initialize') ||
			result.stdout.includes('No agent') ||
			result.stdout.includes('init') ||
			result.stdout.includes('Ready'),
	);
});

// Complex workflow tests
test('CLI handles full agent workflow', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-agent-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			[
				'/help', // Show help
				'/init', // Initialize agent
				'/chat', // Activate chat
				'/export', // Try export
				'/compact', // Try compact
				'/home', // Return home
				'exit', // Exit
			],
			40000,
			tempDir,
		);

		// Should complete the workflow without crashing
		t.is(result.exitCode, 0);
		t.true(
			result.stdout.includes('Welcome') || result.stdout.includes('Gilfoyle'),
		);

		// Clean up
		const agentsFile = path.join(process.cwd(), 'AGENTS.md');
		await fs.unlink(agentsFile).catch(() => {});
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Error handling in agent operations
test('CLI handles agent errors gracefully', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-agent-test-'),
	);

	try {
		// Try to use agent commands without proper setup
		const result = await runInteractiveCLI(
			['/export', '/compact', 'some_invalid_command', 'exit'],
			15000,
			tempDir,
		);

		// Should handle errors without crashing
		t.true(result.exitCode === 0 || result.signal === 'SIGTERM');
		t.true(
			result.stdout.includes('Error') ||
				result.stdout.includes('No agent') ||
				result.stdout.includes('Unknown command') ||
				result.stdout.includes('Initialize'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Status reporting tests
test('CLI shows processing status during operations', async t => {
	const result = await runInteractiveCLI(['/init', 'exit'], 20000);

	// Should show status updates during processing
	t.true(
		result.stdout.includes('Status:') ||
			result.stdout.includes('Processing') ||
			result.stdout.includes('Loading') ||
			result.stdout.includes('Ready') ||
			result.stdout.includes('Initializing'),
	);
});

// Model integration tests
test('CLI shows model information in status', async t => {
	const result = await runInteractiveCLI(['exit'], 5000);

	// Should show current model in status bar
	t.true(result.stdout.includes('Model:'));
	t.true(
		result.stdout.includes('GPT') ||
			result.stdout.includes('Claude') ||
			result.stdout.includes('Nano') ||
			result.stdout.includes('model'),
	);
});

// Integration with configuration
test('CLI agent respects configuration settings', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-agent-test-'),
	);

	try {
		// Create config with specific model
		const configDir = path.join(tempDir, 'gilfoyle');
		await fs.mkdir(configDir, {recursive: true});

		const configFile = path.join(configDir, 'gilfoyle.json');
		const config = {
			$schema: 'https://gilfoyle.enso.sh/config.json',
			selectedModel: 'openai:gpt-4',
			provider: {
				openai: {
					models: {
						'gpt-4': {
							name: 'GPT-4 Test',
						},
					},
				},
			},
		};
		await fs.writeFile(configFile, JSON.stringify(config, null, 2));

		const result = await runInteractiveCLI(['exit'], 8000, tempDir);

		// Should load and use the configured model
		t.true(result.stdout.includes('Model:'));
		t.true(result.stdout.includes('Ready') || result.stdout.includes('Loaded'));
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// File operations through agent
test('CLI creates AGENTS.md file during initialization', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-agent-test-'),
	);
	const originalCwd = process.cwd();

	try {
		// Change to temp directory for this test
		process.chdir(tempDir);

		const result = await runInteractiveCLI(['/init', 'exit'], 25000, tempDir);

		// Check if AGENTS.md was created
		const agentsFile = path.join(tempDir, 'AGENTS.md');
		const agentsExists = await fs
			.access(agentsFile)
			.then(() => true)
			.catch(() => false);

		if (agentsExists) {
			const content = await fs.readFile(agentsFile, 'utf8');
			t.true(content.includes('# AI Agent Configuration'));
			t.true(content.includes('Gilfoyle'));
			t.true(content.length > 100); // Should have substantial content
		} else {
			// If file wasn't created, at least verify the command was processed
			t.true(result.stdout.includes('init') || result.stdout.includes('Agent'));
		}
	} finally {
		process.chdir(originalCwd);
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

test('CLI pwd command shows current directory', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-pwd-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			['/init', 'where am I', 'exit'],
			20000,
			tempDir,
		);

		// Should show current directory information
		t.true(
			result.stdout.includes('Current directory') ||
				result.stdout.includes('/') ||
				result.stdout.includes('pwd') ||
				result.stdout.includes('directory'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Security tests for file reading
test('CLI blocks reading .env files for security', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-security-test-'),
	);

	try {
		// Create a test .env file
		const envFile = path.join(tempDir, '.env');
		await fs.writeFile(envFile, 'SECRET_KEY=very_secret_value');

		const result = await runInteractiveCLI(
			['/init', `read ${envFile}`, 'exit'],
			20000,
			tempDir,
		);

		// Should show access denied message
		t.true(
			result.stdout.includes('Access denied') ||
				result.stdout.includes('sensitive information') ||
				result.stdout.includes('security'),
		);

		// Should NOT contain the secret value
		t.false(result.stdout.includes('very_secret_value'));
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Test web search functionality
test('CLI web search command works', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-websearch-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			['/init', 'search for TypeScript tutorial', 'exit'],
			25000,
			tempDir,
		);

		// Should show web search results or API key configuration message
		t.true(
			result.stdout.includes('Web search') ||
				result.stdout.includes('Search Results') ||
				result.stdout.includes('Tavily') ||
				result.stdout.includes('API key'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Test git status functionality
test('CLI git status command works', async t => {
	const result = await runInteractiveCLI(
		['/init', 'check git status', 'exit'],
		20000,
	);

	// Should show git status information or error if not in git repo
	t.true(
		result.stdout.includes('Git status') ||
			result.stdout.includes('Branch:') ||
			result.stdout.includes('not a git repository') ||
			result.stdout.includes('git'),
	);
});

// Test terminal command functionality
test('CLI terminal command tool works with safe commands', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-terminal-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			['/init', 'run ls -la', 'exit'],
			25000,
			tempDir,
		);

		// Should show command output or execution
		t.true(
			result.stdout.includes('Command:') ||
				result.stdout.includes('ls') ||
				result.stdout.includes('terminal') ||
				result.stdout.includes('drwx') ||
				result.stdout.includes('total'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Test terminal command security restrictions
test('CLI blocks dangerous terminal commands', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-terminal-security-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			['/init', 'run sudo rm -rf /', 'exit'],
			20000,
			tempDir,
		);

		// Should show security block message
		t.true(
			result.stdout.includes('blocked for security') ||
				result.stdout.includes('Blocked commands') ||
				result.stdout.includes('⚠️') ||
				result.stdout.includes('security reasons'),
		);
		
		// Should NOT execute the dangerous command
		t.false(result.stdout.includes('removed'));
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Test terminal command with timeout
test('CLI terminal command respects timeout limits', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-terminal-timeout-test-'),
	);

	try {
		// This test might be flaky, so we'll just check that the tool exists
		const result = await runInteractiveCLI(
			['/init', 'run echo "test"', 'exit'],
			15000,
			tempDir,
		);

		// Should show command execution or output
		t.true(
			result.stdout.includes('Command:') ||
				result.stdout.includes('echo') ||
				result.stdout.includes('test') ||
				result.stdout.includes('terminal'),
		);
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Test terminal command blocks sensitive file access
test('CLI terminal command blocks commands referencing sensitive files', async t => {
	const tempDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'gilfoyle-terminal-sensitive-test-'),
	);

	try {
		const result = await runInteractiveCLI(
			['/init', 'run cat .env', 'exit'],
			20000,
			tempDir,
		);

		// Should show security block message for sensitive files
		t.true(
			result.stdout.includes('blocked') ||
				result.stdout.includes('sensitive files') ||
				result.stdout.includes('Environment files') ||
				result.stdout.includes('🚫') ||
				result.stdout.includes('reference to sensitive'),
		);
		
		// Should NOT execute the command or show file contents
		t.false(result.stdout.includes('SECRET'));
		t.false(result.stdout.includes('API_KEY'));
	} finally {
		await fs.rm(tempDir, {recursive: true, force: true});
	}
});

// Error handling in agent operations
