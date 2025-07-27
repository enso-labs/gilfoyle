/**
 * Fuzzy search utilities for smart command filtering
 */

export interface SearchableCommand {
	key: string;
	label: string;
	description: string;
}

/**
 * Performs fuzzy matching between a query and target string
 * @param query - The search query
 * @param target - The target string to match against
 * @returns true if the query fuzzy matches the target
 */
export function fuzzyMatch(query: string, target: string): boolean {
	if (!query || !target) {
		return !query; // Empty query matches everything, empty target matches nothing
	}

	const lowerQuery = query.toLowerCase();
	const lowerTarget = target.toLowerCase();

	let queryIndex = 0;
	let targetIndex = 0;

	while (queryIndex < lowerQuery.length && targetIndex < lowerTarget.length) {
		if (lowerQuery[queryIndex] === lowerTarget[targetIndex]) {
			queryIndex++;
		}
		targetIndex++;
	}

	return queryIndex === lowerQuery.length;
}

/**
 * Calculates a score for how well a query matches a target string
 * Higher scores indicate better matches
 * @param query - The search query
 * @param target - The target string to score
 * @returns A numeric score (higher = better match)
 */
function calculateMatchScore(query: string, target: string): number {
	if (!query || !target) {
		return query ? 0 : 1; // Empty query gets perfect score, no target gets zero
	}

	const lowerQuery = query.toLowerCase();
	const lowerTarget = target.toLowerCase();

	// Exact match gets highest score
	if (lowerTarget === lowerQuery) {
		return 1000;
	}

	// Starts with query gets high score
	if (lowerTarget.startsWith(lowerQuery)) {
		return 900;
	}

	// Contains query as substring gets medium-high score
	if (lowerTarget.includes(lowerQuery)) {
		return 800;
	}

	// Fuzzy match gets lower score based on position and gaps
	if (!fuzzyMatch(query, target)) {
		return 0;
	}

	let score = 100;
	let queryIndex = 0;
	let lastMatchIndex = -1;

	for (
		let targetIndex = 0;
		targetIndex < lowerTarget.length && queryIndex < lowerQuery.length;
		targetIndex++
	) {
		if (lowerQuery[queryIndex] === lowerTarget[targetIndex]) {
			// Bonus for consecutive matches
			if (targetIndex === lastMatchIndex + 1) {
				score += 10;
			}
			// Bonus for early matches
			score += Math.max(0, 50 - targetIndex);

			lastMatchIndex = targetIndex;
			queryIndex++;
		}
	}

	return score;
}

/**
 * Searches through commands using fuzzy matching
 * @param commands - Array of commands to search through
 * @param query - The search query
 * @returns Filtered and sorted array of matching commands
 */
export function fuzzySearch(
	commands: SearchableCommand[],
	query: string,
): SearchableCommand[] {
	if (!query?.trim()) {
		return commands;
	}

	const results: Array<{command: SearchableCommand; score: number}> = [];

	for (const command of commands) {
		const keyScore = calculateMatchScore(query, command.key || '');
		const labelScore = calculateMatchScore(query, command.label || '');
		const descriptionScore = calculateMatchScore(
			query,
			command.description || '',
		);

		// Use the highest score from any field, with key matches weighted higher
		const bestScore = Math.max(
			keyScore * 1.2, // Prefer key matches
			labelScore,
			descriptionScore * 0.8, // Lower weight for description matches
		);

		if (bestScore > 0) {
			results.push({command, score: bestScore});
		}
	}

	// Sort by score (highest first), then by key for deterministic ordering
	results.sort((a, b) => {
		if (b.score !== a.score) {
			return b.score - a.score;
		}
		return a.command.key.localeCompare(b.command.key);
	});

	return results.map(result => result.command);
}

/**
 * Highlights matching characters in text based on query
 * @param text - The text to highlight
 * @param query - The search query
 * @returns Text with highlighted matches (for terminal rendering)
 */
export function highlightMatches(text: string, query: string): string {
	if (!query?.trim() || !text) {
		return text;
	}

	try {
		// Escape special regex characters in query
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`(${escapedQuery})`, 'gi');

		// For now, just return the original text since Ink has limited styling
		// In a real implementation, you might use chalk or Ink's color components
		return text.replace(regex, '$1'); // Placeholder for highlighting
	} catch {
		// Fallback if regex fails
		return text;
	}
}

/**
 * Debounces a function call
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}
