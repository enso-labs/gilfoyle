import {searchFiles, isBlockedFile} from './utils.js';

/**
 * Search for files in the current directory
 * @param pattern - The pattern to search for
 * @param directory - The directory to search in
 * @returns The search results
 */
export async function fileSearch({
	pattern,
	directory = '.',
}: {
	pattern: string;
	directory?: string;
}) {
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
} 