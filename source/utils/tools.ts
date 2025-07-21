import {promises as fs} from 'fs';
import {join} from 'path';

export const tools = {
	get_weather: ({location}: {location: string}) => {
		return `The weather in ${location} is sunny and 72°F with light clouds. Perfect coding weather! 🌤️`;
	},

	get_stock_info: ({ticker}: {ticker: string}) => {
		// Mock stock data for demo purposes
		const mockPrices: Record<string, string> = {
			AAPL: '$150.25 (+2.1%)',
			GOOGL: '$2,650.80 (+1.8%)',
			MSFT: '$310.45 (+0.9%)',
			TSLA: '$220.15 (-1.2%)',
			NVDA: '$450.30 (+3.2%)',
		};

		const price =
			mockPrices[ticker.toUpperCase()] || '$XX.XX (Market data unavailable)';
		return `${ticker.toUpperCase()} current price: ${price}`;
	},

	web_search: ({query}: {query: string}) => {
		// Mock web search results
		return `Search results for "${query}":\n\n1. Latest documentation and tutorials\n2. Stack Overflow discussions\n3. GitHub repositories\n4. Official guides and best practices\n\n[Note: This is a simulated search result. In production, this would integrate with a real search API.]`;
	},

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

	file_search: async ({
		pattern,
		directory = '.',
	}: {
		pattern: string;
		directory?: string;
	}) => {
		try {
			const files = await searchFiles(directory, pattern);
			if (files.length === 0) {
				return `No files found matching pattern "${pattern}" in directory "${directory}".`;
			}

			return `Found ${files.length} files matching "${pattern}":\n${files
				.slice(0, 10)
				.map(f => `- ${f}`)
				.join('\n')}${
				files.length > 10 ? `\n... and ${files.length - 10} more` : ''
			}`;
		} catch (error) {
			return `Error searching files: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
		}
	},

	read_file: async ({filepath}: {filepath: string}) => {
		try {
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

	git_status: async () => {
		try {
			// This is a mock implementation - in production you'd use a proper git library
			return `Git status (simulated):
- Modified: 3 files
- Untracked: 1 file
- Branch: main
- Commits ahead: 0

Use 'git add .' to stage all changes.`;
		} catch (error) {
			return `Error getting git status: ${
				error instanceof Error ? error.message : 'Git not available'
			}`;
		}
	},

	npm_info: async ({package: packageName}: {package: string}) => {
		try {
			// Mock npm package info
			const mockInfo = {
				react:
					'React v18.2.0 - A JavaScript library for building user interfaces',
				typescript: 'TypeScript v5.0.3 - A typed superset of JavaScript',
				node: "Node.js v18+ - JavaScript runtime built on Chrome's V8 engine",
				npm: 'npm v9.6.4 - Package manager for JavaScript',
			};

			const info =
				mockInfo[packageName as keyof typeof mockInfo] ||
				`Package "${packageName}" - Check npm registry for details`;
			return `Package Info: ${info}`;
		} catch (error) {
			return `Error getting package info: ${
				error instanceof Error ? error.message : 'NPM unavailable'
			}`;
		}
	},
};

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
