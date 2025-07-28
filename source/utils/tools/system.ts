import {exec} from 'child_process';
import {promisify} from 'util';
import {BLOCKED_FILE_PATTERNS} from './utils.js';

const execAsync = promisify(exec);

/**
 * Get the current working directory
 * @returns The current working directory path
 */
export function pwd() {
	try {
		const currentDir = process.cwd();
		return `Current directory: ${currentDir}`;
	} catch (error) {
		return `Error getting current directory: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
	}
}

/**
 * Execute a terminal command with security restrictions
 * @param command - The command to execute
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns The command output or error
 */
export async function terminalCommand({
	command,
	timeout = 30000,
}: {
	command: string;
	timeout?: number;
}) {
	try {
		// Security: Block dangerous commands
		const blockedCommands = [
			/^sudo\s/i,
			/^su\s/i,
			/\brm\s+(-[rf]*\s+)?\/\b/i, // rm -rf /
			/\bmv\s+.*\/\s*$/i, // mv to /
			/\bchmod\s+777\s+\/\b/i,
			/\bchown\s+.*\/\b/i,
			/\bpasswd\b/i,
			/\buseradd\b/i,
			/\buserdel\b/i,
			/\bmkfs\b/i,
			/\bformat\b/i,
			/\bfdisk\b/i,
			/\bdiskpart\b/i,
			/\bdd\s+if=/i,
			/\breboot\b/i,
			/\bshutdown\b/i,
			/\bhalt\b/i,
			/\bpoweroff\b/i,
			/\bkill\s+-9\s+1\b/i, // kill init
			/\bkillall\s+.*\b/i,
			/\b:\(\)\s*\{.*\}\s*;\s*:\b/i, // fork bomb
			/\bcat\s+\/etc\/passwd\b/i,
			/\bcat\s+\/etc\/shadow\b/i,
			/\bwget\s+.*\|\s*sh\b/i, // wget | sh
			/\bcurl\s+.*\|\s*sh\b/i, // curl | sh
			/\beval\s+/i,
			/\bexec\s+/i,
			/>\s*\/dev\/\w+/i, // redirect to device files
		];

		// Check if command contains blocked patterns
		if (blockedCommands.some(pattern => pattern.test(command))) {
			throw new Error(`Command blocked for security reasons: "${command}"

🚫 Blocked commands include:
- System administration commands (sudo, su)
- Destructive file operations (rm -rf /)
- User management commands
- System restart/shutdown commands
- Potentially dangerous redirects
- Code injection attempts

💡 Try simpler, safer commands like:
- ls, pwd, cd
- cat, head, tail (for reading files)
- grep, find (for searching)
- git commands
- npm/yarn commands`);
		}

		// Security: Check for sensitive file patterns in the command
		// Use the same BLOCKED_FILE_PATTERNS from the file reading function
		const sensitiveFileFound = BLOCKED_FILE_PATTERNS.some(pattern =>
			pattern.test(command),
		);

		if (sensitiveFileFound) {
			throw new Error(`Command blocked - contains reference to sensitive files: "${command}"

🚫 Commands cannot reference sensitive files such as:
- Environment files (.env, .env.local, etc.)
- Private keys (.key, .pem, id_rsa, etc.)
- Certificates (.p12, .pfx, .jks, etc.)
- Credential files (.npmrc, .aws/credentials, etc.)
- SSH configuration files
- Password/token files

💡 This protects against accidental exposure of sensitive information.`);
		}

		// Limit command length
		if (command.length > 500) {
			throw new Error('Command too long (maximum 500 characters)');
		}

		// Set a reasonable timeout (max 60 seconds)
		const safeTimeout = Math.min(timeout, 60000);

		// Execute command with timeout
		const {stdout, stderr} = await execAsync(command, {
			timeout: safeTimeout,
			maxBuffer: 1024 * 1024, // 1MB max output
			cwd: process.cwd(),
		});

		const output = stdout || stderr || 'Command completed (no output)';

		// Truncate very long output
		if (output.length > 5000) {
			return `Command: ${command}

Output (first 5000 characters):
${output.slice(0, 5000)}

... [Output truncated - ${output.length} total characters]`;
		}

		return `Command: ${command}

${output}`;
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes('timeout')) {
				return `Command timed out after ${timeout}ms: "${command}"`;
			}
			if (error.message.includes('ENOENT')) {
				return `Command not found: "${command}"`;
			}
			if (error.message.includes('EACCES')) {
				return `Permission denied: "${command}"`;
			}

			// Handle command exit codes
			if ('code' in error && typeof error.code === 'number') {
				const stderr = 'stderr' in error ? error.stderr : '';
				return `Command failed with exit code ${error.code}: "${command}"
${stderr || error.message}`;
			}
		}

		return `Error executing command "${command}": ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
	}
} 