#!/usr/bin/env node

const {spawn} = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// ANSI color codes for better output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

async function checkBuilt() {
	try {
		await fs.access(path.join(process.cwd(), 'dist', 'cli.js'));
		return true;
	} catch {
		return false;
	}
}

async function buildCLI() {
	log('📦 Building CLI...', colors.yellow);

	return new Promise((resolve, reject) => {
		const build = spawn('npm', ['run', 'build'], {
			stdio: 'inherit',
			shell: true,
		});

		build.on('close', code => {
			if (code === 0) {
				log('✅ CLI built successfully', colors.green);
				resolve();
			} else {
				log('❌ Build failed', colors.red);
				reject(new Error(`Build failed with code ${code}`));
			}
		});

		build.on('error', reject);
	});
}

async function runTests(pattern = '', options = {}) {
	const {watch = false, verbose = false, timeout = false} = options;

	log(`🧪 Running CLI tests${pattern ? ` (${pattern})` : ''}...`, colors.cyan);

	const avaArgs = [
		'test',
		'--timeout=60s',
		'--serial', // Run tests serially to avoid conflicts
	];

	if (watch) {
		avaArgs.push('--watch');
	}

	if (verbose) {
		avaArgs.push('--verbose');
	}

	if (timeout) {
		avaArgs.push(`--timeout=${timeout}`);
	}

	if (pattern) {
		avaArgs.push(`test/${pattern}.test.ts`);
	} else {
		avaArgs.push('test/*.test.ts');
	}

	return new Promise((resolve, reject) => {
		// Use npm script to ensure ava config from package.json is picked up
		const test = spawn('npm', ['run', 'test:ava', '--', ...avaArgs], {
			stdio: 'inherit',
			shell: true,
		});

		test.on('close', code => {
			if (code === 0) {
				log('✅ All tests passed!', colors.green);
				resolve();
			} else {
				log('❌ Some tests failed', colors.red);
				reject(new Error(`Tests failed with code ${code}`));
			}
		});

		test.on('error', reject);
	});
}

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	try {
		// Check if CLI is built
		const isBuilt = await checkBuilt();
		if (!isBuilt && command !== 'build') {
			log('⚠️  CLI not built. Building first...', colors.yellow);
			await buildCLI();
		}

		switch (command) {
			case 'build':
				await buildCLI();
				break;

			case 'basic':
				log('🔍 Running basic CLI tests...', colors.blue);
				await runTests('cli');
				break;

			case 'config':
				log('⚙️  Running configuration tests...', colors.blue);
				await runTests('config');
				break;

			case 'agent':
				log('🤖 Running agent and tool tests...', colors.blue);
				await runTests('agent', {timeout: '120s'});
				break;

			case 'stress':
				log('💪 Running stress and performance tests...', colors.blue);
				await runTests('stress', {timeout: '180s'});
				break;

			case 'watch':
				log('👀 Running tests in watch mode...', colors.blue);
				await runTests('', {watch: true});
				break;

			case 'all':
			case undefined:
				log('🚀 Running all CLI tests...', colors.blue);
				await runTests('', {timeout: '300s'});
				break;

			case 'help':
			case '--help':
			case '-h':
				displayHelp();
				break;

			default:
				log(`❓ Unknown command: ${command}`, colors.yellow);
				displayHelp();
				process.exit(1);
		}
	} catch (error) {
		log(`💥 Error: ${error.message}`, colors.red);
		process.exit(1);
	}
}

function displayHelp() {
	log(
		`
${colors.bright}Gilfoyle CLI Test Runner${colors.reset}

${colors.cyan}Commands:${colors.reset}
  ${colors.green}build${colors.reset}      Build the CLI before testing
  ${colors.green}basic${colors.reset}      Run basic CLI functionality tests
  ${colors.green}config${colors.reset}     Run configuration and setup tests
  ${colors.green}agent${colors.reset}      Run agent and tool integration tests
  ${colors.green}stress${colors.reset}     Run stress tests and edge cases
  ${colors.green}watch${colors.reset}      Run tests in watch mode
  ${colors.green}all${colors.reset}        Run all tests (default)
  ${colors.green}help${colors.reset}       Show this help message

${colors.cyan}Examples:${colors.reset}
  ${colors.yellow}node test.cjs${colors.reset}          Run all tests
  ${colors.yellow}node test.cjs basic${colors.reset}    Run only basic tests
  ${colors.yellow}node test.cjs watch${colors.reset}    Watch and re-run tests on changes
  ${colors.yellow}node test.cjs stress${colors.reset}   Run stress tests only

${colors.cyan}Notes:${colors.reset}
  • Tests are run serially to avoid conflicts
  • The CLI is automatically built if not present
  • Longer timeouts are used for agent and stress tests
  • Use Ctrl+C to stop watch mode
`,
		colors.reset,
	);
}

if (require.main === module) {
	main();
}

module.exports = {runTests, buildCLI, checkBuilt};
