import {promises as fs} from 'fs';
import {join} from 'path';

// List of file patterns that should not be readable for security
export const BLOCKED_FILE_PATTERNS = [
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
export function isBlockedFile(filepath: string): boolean {
	const normalizedPath = filepath.replace(/\\/g, '/');
	return BLOCKED_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

/**
 * Search for files in a directory
 * @param directory - The directory to search in
 * @param pattern - The pattern to search for
 * @returns The search results
 */
export async function searchFiles(
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