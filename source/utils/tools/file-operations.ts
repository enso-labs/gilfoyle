import {promises as fs} from 'fs';
import {isBlockedFile} from './utils.js';

/**
 * Read the content of a file
 * @param filepath - The path to the file
 * @returns The content of the file
 */
export async function readFile({filepath}: {filepath: string}) {
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
}

/**
 * Edit the content of a file
 * @param filepath - The path to the file
 * @param old_str - The string to replace
 * @param new_str - The string to replace with
 * @returns The result of the file edit
 */
export async function editFile(
	{
		filepath,
		old_str,
		new_str,
	}: {
		filepath: string;
		old_str: string;
		new_str: string;
	}) {
		try {
			const content = await readFile({filepath});
			const new_content = content.replace(old_str, new_str);
			await createFile({filepath, content: new_content});
			return `Successfully replaced string in file "${filepath}" ${old_str} with ${new_str} with ${new_content.length} characters.`;
		} catch (error) {
			return `Error replacing string in file "${filepath}" ${old_str} with ${new_str}: ${
				error instanceof Error ? error.message : 'String not found'
			}`;
		}
}

/**
 * Create a new file
 * @param filepath - The path to the file
 * @param content - The content of the file
 * @returns The result of the file creation
 */
export async function createFile({
	filepath,
	content,
}: {
	filepath: string;
	content: string;
}) {
	try {
		await fs.writeFile(filepath, content, 'utf8');
		return `Successfully created file "${filepath}" with ${content.length} characters.`;
	} catch (error) {
		return `Error creating file "${filepath}": ${
			error instanceof Error ? error.message : 'Write failed'
		}`;
	}
}
