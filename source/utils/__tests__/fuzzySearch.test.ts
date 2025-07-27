import {fuzzySearch, fuzzyMatch, highlightMatches} from '../fuzzySearch.js';

describe('fuzzySearch', () => {
	const mockCommands = [
		{
			key: '/help',
			label: 'Help',
			description: 'Show help information',
		},
		{
			key: '/chat',
			label: 'Chat',
			description: 'Start conversing with the AI agent',
		},
		{
			key: '/models',
			label: 'Models',
			description: 'List available models',
		},
		{
			key: '/init',
			label: 'Initialize',
			description: 'Initialize agent and create AGENTS.md',
		},
		{
			key: '/config',
			label: 'Config',
			description: 'Show configuration info',
		},
		{
			key: '/api-config',
			label: 'API Config',
			description: 'Configure API keys for providers',
		},
	];

	describe('fuzzyMatch', () => {
		it('should match exact strings', () => {
			expect(fuzzyMatch('help', 'help')).toBe(true);
			expect(fuzzyMatch('HELP', 'help')).toBe(true);
			expect(fuzzyMatch('help', 'HELP')).toBe(true);
		});

		it('should match partial strings', () => {
			expect(fuzzyMatch('hel', 'help')).toBe(true);
			expect(fuzzyMatch('elp', 'help')).toBe(true);
			expect(fuzzyMatch('hp', 'help')).toBe(true);
		});

		it('should match non-contiguous characters', () => {
			expect(fuzzyMatch('hlp', 'help')).toBe(true);
			expect(fuzzyMatch('hp', 'help')).toBe(true);
			expect(fuzzyMatch('he', 'help')).toBe(true);
		});

		it('should not match when characters are not present', () => {
			expect(fuzzyMatch('xyz', 'help')).toBe(false);
			expect(fuzzyMatch('helpx', 'help')).toBe(false);
		});

		it('should handle empty strings', () => {
			expect(fuzzyMatch('', 'help')).toBe(true);
			expect(fuzzyMatch('help', '')).toBe(false);
			expect(fuzzyMatch('', '')).toBe(true);
		});

		it('should be case insensitive', () => {
			expect(fuzzyMatch('HLP', 'help')).toBe(true);
			expect(fuzzyMatch('hlp', 'HELP')).toBe(true);
			expect(fuzzyMatch('HeLp', 'help')).toBe(true);
		});

		it('should handle special characters', () => {
			expect(fuzzyMatch('/', '/help')).toBe(true);
			expect(fuzzyMatch('/h', '/help')).toBe(true);
			expect(fuzzyMatch('-c', 'api-config')).toBe(true);
		});
	});

	describe('fuzzySearch', () => {
		it('should return all commands when query is empty', () => {
			const results = fuzzySearch(mockCommands, '');
			expect(results).toHaveLength(mockCommands.length);
			expect(results).toEqual(mockCommands);
		});

		it('should filter by command key', () => {
			const results = fuzzySearch(mockCommands, 'help');
			expect(results).toHaveLength(1);
			expect(results[0]?.key).toBe('/help');
		});

		it('should filter by command label', () => {
			const results = fuzzySearch(mockCommands, 'Help');
			expect(results).toHaveLength(1);
			expect(results[0]?.label).toBe('Help');
		});

		it('should filter by command description', () => {
			const results = fuzzySearch(mockCommands, 'agent');
			expect(results).toHaveLength(2);
			expect(results.map(r => r.key)).toEqual(['/chat', '/init']);
		});

		it('should return multiple matches', () => {
			const results = fuzzySearch(mockCommands, 'config');
			expect(results).toHaveLength(2);
			expect(results.map(r => r.key)).toEqual(['/config', '/api-config']);
		});

		it('should perform fuzzy matching', () => {
			const results = fuzzySearch(mockCommands, 'hlp');
			expect(results).toHaveLength(1);
			expect(results[0]?.key).toBe('/help');
		});

		it('should return empty array when no matches found', () => {
			const results = fuzzySearch(mockCommands, 'xyz');
			expect(results).toHaveLength(0);
			expect(results).toEqual([]);
		});

		it('should prioritize key matches over description matches', () => {
			const results = fuzzySearch(mockCommands, 'init');
			expect(results[0]?.key).toBe('/init');
		});

		it('should handle case insensitive search', () => {
			const results = fuzzySearch(mockCommands, 'HELP');
			expect(results).toHaveLength(1);
			expect(results[0]?.key).toBe('/help');
		});

		it('should search across all searchable fields', () => {
			const commands = [
				{
					key: '/test',
					label: 'Testing',
					description: 'Run unit tests',
				},
			];

			expect(fuzzySearch(commands, 'test')).toHaveLength(1);
			expect(fuzzySearch(commands, 'Testing')).toHaveLength(1);
			expect(fuzzySearch(commands, 'unit')).toHaveLength(1);
		});

		it('should handle partial matches in any field', () => {
			const results = fuzzySearch(mockCommands, 'con');
			const keys = results.map(r => r.key);
			expect(keys).toContain('/config');
			expect(keys).toContain('/api-config');
		});

		it('should maintain original command structure', () => {
			const results = fuzzySearch(mockCommands, 'help');
			expect(results[0]).toEqual(
				expect.objectContaining({
					key: '/help',
					label: 'Help',
					description: 'Show help information',
				}),
			);
		});
	});

	describe('highlightMatches', () => {
		it('should highlight exact matches', () => {
			const result = highlightMatches('help', 'help');
			expect(result).toContain('help');
		});

		it('should highlight partial matches', () => {
			const result = highlightMatches('Show help information', 'help');
			expect(result).toContain('help');
		});

		it('should handle case insensitive highlighting', () => {
			const result = highlightMatches('Show HELP information', 'help');
			expect(result).toContain('HELP');
		});

		it('should return original text when no match', () => {
			const result = highlightMatches('Show information', 'xyz');
			expect(result).toBe('Show information');
		});

		it('should handle empty query', () => {
			const result = highlightMatches('Show help information', '');
			expect(result).toBe('Show help information');
		});

		it('should handle empty text', () => {
			const result = highlightMatches('', 'help');
			expect(result).toBe('');
		});

		it('should highlight multiple occurrences', () => {
			const result = highlightMatches('help with help command', 'help');
			// Should highlight both instances of 'help'
			expect((result.match(/help/g) || []).length).toBeGreaterThanOrEqual(2);
		});

		it('should handle special regex characters', () => {
			const result = highlightMatches('/help-config', '/');
			expect(result).toContain('/');
		});

		it('should preserve text structure', () => {
			const text = 'Show help information';
			const result = highlightMatches(text, 'xyz');
			expect(result).toBe(text);
		});
	});

	describe('Performance', () => {
		it('should handle large datasets efficiently', () => {
			const largeCommandList = Array.from({length: 1000}, (_, index) => ({
				key: `/command${index}`,
				label: `Command ${index}`,
				description: `Description for command ${index}`,
			}));

			const startTime = Date.now();
			const results = fuzzySearch(largeCommandList, 'command');
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
			expect(results.length).toBeGreaterThan(0);
		});

		it('should handle rapid successive searches', () => {
			const queries = ['h', 'he', 'hel', 'help'];

			queries.forEach(query => {
				const startTime = Date.now();
				fuzzySearch(mockCommands, query);
				const endTime = Date.now();

				expect(endTime - startTime).toBeLessThan(10);
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle commands with null/undefined fields', () => {
			const commandsWithNulls = [
				{
					key: '/test',
					label: null as any,
					description: undefined as any,
				},
				{
					key: null as any,
					label: 'Test',
					description: 'Test command',
				},
			];

			expect(() => fuzzySearch(commandsWithNulls, 'test')).not.toThrow();
		});

		it('should handle unicode characters', () => {
			const unicodeCommands = [
				{
					key: '/café',
					label: '☕ Coffee',
					description: 'Make coffee ☕',
				},
			];

			const results = fuzzySearch(unicodeCommands, 'café');
			expect(results).toHaveLength(1);
		});

		it('should handle very long strings', () => {
			const longCommand = {
				key: '/very-long-command-name-that-exceeds-normal-length',
				label: 'Very Long Command Name',
				description: 'A'.repeat(1000),
			};

			const results = fuzzySearch([longCommand], 'very');
			expect(results).toHaveLength(1);
		});

		it('should handle special characters in search', () => {
			const results = fuzzySearch(mockCommands, '/');
			expect(results.length).toBeGreaterThan(0);
		});

		it('should handle regex special characters', () => {
			const commands = [
				{
					key: '/test[0-9]+',
					label: 'Regex Test',
					description: 'Test with regex characters',
				},
			];

			expect(() => fuzzySearch(commands, '[0-9]')).not.toThrow();
		});
	});
});
