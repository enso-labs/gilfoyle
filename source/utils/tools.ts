import {promises as fs} from 'fs';
import {join} from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';
import {TavilySearch, TopicType} from '@langchain/tavily';
import YAML from 'yaml';

const execAsync = promisify(exec);

// Lazy initialization of Tavily search - only create when needed
let tavilySearch: TavilySearch | null = null;

function getTavilySearch(maxResults: number = 5, topic: TopicType = 'general'): TavilySearch | null {
	if (tavilySearch) {
		return tavilySearch;
	}

	try {
		// Check if API key is available
		if (!process.env['TAVILY_API_KEY']) {
			return null;
		}

		tavilySearch = new TavilySearch({
			maxResults,
			topic,
			// includeAnswer: false,
			// includeRawContent: false,
			// includeImages: false,
			// includeImageDescriptions: false,
			// searchDepth: "basic",
			// timeRange: "day",
			// includeDomains: [],
			// excludeDomains: [],
		});

		return tavilySearch;
	} catch (error) {
		console.error('Failed to initialize Tavily search:', error);
		return null;
	}
}

// List of file patterns that should not be readable for security
const BLOCKED_FILE_PATTERNS = [
	/\.env(\.|$)/i, // .env, .env.local, .env.production, etc.
	/\.key$/i, // private keys
	/\.pem$/i, // certificates
	/\.p12$/i, // certificates
	/\.pfx$/i, // certificates
	/\.jks$/i, // java keystores
	/\.keystore$/i, // keystores
	/id_rsa$/i, // SSH private keys
	/id_ed25519$/i, // SSH private keys
	/\.ssh\/.*$/i, // SSH directory contents
	/\.aws\/credentials$/i, // AWS credentials
	/\.docker\/config\.json$/i, // Docker credentials
	/\.npmrc$/i, // NPM credentials (can contain auth tokens)
	/\.pypirc$/i, // PyPI credentials
	/secrets?\//i, // secrets directories
	/credentials?$/i, // credential files
	/password$/i, // password files
	/token$/i, // token files
];

/**
 * Check if a file path should be blocked from reading
 * @param filepath - The file path to check
 * @returns True if the file should be blocked
 */
function isBlockedFile(filepath: string): boolean {
	const normalizedPath = filepath.replace(/\\/g, '/');
	return BLOCKED_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

export const tools = {
	/**
	 * Query based on current conversation context
	 * @param query - The query to search for
	 * @returns The search results
	 */
	web_search: async ({query}: {query: string}) => {
		try {
			const tavily = getTavilySearch();
			if (!tavily) {
				return `Web search for "${query}":

⚠️  Tavily API key not configured. Set TAVILY_API_KEY environment variable to enable real web search.

🔍 Search Results (fallback):
1. Latest documentation and guides for ${query}
2. Stack Overflow discussions and solutions
3. GitHub repositories and code examples  
4. Official documentation and API references
5. Tutorial articles and blog posts

💡 To enable real web search:
1. Get an API key from https://tavily.com
2. Set TAVILY_API_KEY in your environment variables
3. Restart the application`;
			}

			// Use Tavily for real web search
			const search = await tavily.invoke({query});

			let searchResults = '';
			const doc = new YAML.Document();
			doc.contents = search.results.map((result: {title: string, content: string, url: string, score: number}) => ({
				title: result.title,
				content: result.content,
				url: result.url,
				score: result.score,
			}));
			searchResults += doc.toString();

			// Format the results nicely
			return `🔍 Web search results for "${query}":
			
${searchResults}

Search completed successfully using Tavily web search.`;
		} catch (error) {
			return `Error performing web search: ${
				error instanceof Error ? error.message : 'Search service unavailable'
			}`;
		}
	},

	/**
	 * Calculate the result of a mathematical expression
	 * @param expression - The expression to calculate
	 * @returns The result of the expression
	 */
	math_calculator: ({expression}: {expression: string}) => {
		try {
			// Basic math evaluation (be careful with eval in production!)
			// This is a simplified version - in production you'd want a proper math parser
			const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
			if (sanitizedExpression !== expression) {
				return `Invalid characters in expression. Only numbers and basic operators (+, -, *, /, parentheses) are allowed.`;
			}

			const result = Function(
				`"use strict"; return (${sanitizedExpression})`,
			)();
			return `${expression} = ${result}`;
		} catch (error) {
			return `Error calculating "${expression}": Invalid mathematical expression.`;
		}
	},

	/**
	 * Search for files in the current directory
	 * @param pattern - The pattern to search for
	 * @param directory - The directory to search in
	 * @returns The search results
	 */
	file_search: async ({
		pattern,
		directory = '.',
	}: {
		pattern: string;
		directory?: string;
	}) => {
		try {
			const files = await searchFiles(directory, pattern);
			// Filter out blocked files for security
			const allowedFiles = files.filter(file => !isBlockedFile(file));

			if (allowedFiles.length === 0) {
				if (files.length > allowedFiles.length) {
					return `No accessible files found matching pattern "${pattern}" in directory "${directory}". Some files were excluded for security reasons.`;
				}
				return `No files found matching pattern "${pattern}" in directory "${directory}".`;
			}

			const securityNote =
				files.length > allowedFiles.length
					? `\n\n[Note: ${
							files.length - allowedFiles.length
					  } files were excluded for security reasons]`
					: '';

			return `Found ${
				allowedFiles.length
			} files matching "${pattern}":\n${allowedFiles
				.slice(0, 10)
				.map(f => `- ${f}`)
				.join('\n')}${
				allowedFiles.length > 10
					? `\n... and ${allowedFiles.length - 10} more`
					: ''
			}${securityNote}`;
		} catch (error) {
			return `Error searching files: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
		}
	},

	/**
	 * Read the content of a file
	 * @param filepath - The path to the file
	 * @returns The content of the file
	 */
	read_file: async ({filepath}: {filepath: string}) => {
		try {
			if (isBlockedFile(filepath)) {
				return `Error reading file "${filepath}": Access denied. This file contains sensitive information.`;
			}
			const content = await fs.readFile(filepath, 'utf8');
			if (content.length > 1000) {
				return `File content (first 1000 characters):\n\n${content.slice(
					0,
					1000,
				)}...\n\n[File truncated - ${content.length} total characters]`;
			}
			return `File content:\n\n${content}`;
		} catch (error) {
			return `Error reading file "${filepath}": ${
				error instanceof Error ? error.message : 'File not found'
			}`;
		}
	},

	/**
	 * Create a new file
	 * @param filepath - The path to the file
	 * @param content - The content of the file
	 * @returns The result of the file creation
	 */
	create_file: async ({
		filepath,
		content,
	}: {
		filepath: string;
		content: string;
	}) => {
		try {
			await fs.writeFile(filepath, content, 'utf8');
			return `Successfully created file "${filepath}" with ${content.length} characters.`;
		} catch (error) {
			return `Error creating file "${filepath}": ${
				error instanceof Error ? error.message : 'Write failed'
			}`;
		}
	},

	/**
	 * Get the status of the git repository
	 * @returns The status of the git repository
	 */
	git_status: async () => {
		try {
			// Check if we're in a git repository first
			await execAsync('git rev-parse --git-dir');

			// Get git status
			const {stdout} = await execAsync('git status --porcelain=v1');
			const {stdout: branch} = await execAsync('git branch --show-current');

			if (stdout.trim() === '') {
				return `Git status:
Branch: ${branch.trim() || 'unknown'}
Working tree clean - no changes to commit.`;
			}

			const lines = stdout.trim().split('\n');
			const modified = lines.filter(
				line => line.startsWith(' M') || line.startsWith('M '),
			).length;
			const added = lines.filter(line => line.startsWith('A ')).length;
			const deleted = lines.filter(
				line => line.startsWith(' D') || line.startsWith('D '),
			).length;
			const untracked = lines.filter(line => line.startsWith('??')).length;
			const staged = lines.filter(
				line => !line.startsWith(' ') && !line.startsWith('??'),
			).length;

			let statusSummary = `Git status:\nBranch: ${
				branch.trim() || 'unknown'
			}\n`;

			if (staged > 0) statusSummary += `Staged changes: ${staged}\n`;
			if (modified > 0) statusSummary += `Modified files: ${modified}\n`;
			if (added > 0) statusSummary += `Added files: ${added}\n`;
			if (deleted > 0) statusSummary += `Deleted files: ${deleted}\n`;
			if (untracked > 0) statusSummary += `Untracked files: ${untracked}\n`;

			return statusSummary;
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes('not a git repository')
			) {
				return 'Error: Not in a git repository.';
			}
			return `Error getting git status: ${
				error instanceof Error ? error.message : 'Git not available'
			}`;
		}
	},

	/**
	 * Get the current working directory
	 * @returns The current working directory path
	 */
	pwd: () => {
		try {
			const currentDir = process.cwd();
			return `Current directory: ${currentDir}`;
		} catch (error) {
			return `Error getting current directory: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
		}
	},

	/**
	 * Execute a terminal command with security restrictions
	 * @param command - The command to execute
	 * @param timeout - Timeout in milliseconds (default: 30000)
	 * @returns The command output or error
	 */
	terminal_command: async ({
		command,
		timeout = 30000,
	}: {
		command: string;
		timeout?: number;
	}) => {
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
				pattern.test(command)
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
	},
};

/**
 * Search for files in a directory
 * @param directory - The directory to search in
 * @param pattern - The pattern to search for
 * @returns The search results
 */
async function searchFiles(
	directory: string,
	pattern: string,
): Promise<string[]> {
	const results: string[] = [];

	try {
		const items = await fs.readdir(directory, {withFileTypes: true});

		for (const item of items) {
			const fullPath = join(directory, item.name);

			if (
				item.isDirectory() &&
				!item.name.startsWith('.') &&
				item.name !== 'node_modules'
			) {
				// Recursively search subdirectories
				const subResults = await searchFiles(fullPath, pattern);
				results.push(...subResults);
			} else if (item.isFile() && item.name.includes(pattern)) {
				results.push(fullPath);
			}
		}
	} catch (error) {
		// Ignore directories we can't read
	}

	return results;
}
