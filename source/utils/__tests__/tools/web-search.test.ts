// Mock the TavilySearch and YAML modules
const mockInvoke = jest.fn();
const mockTavilySearch = jest.fn();

jest.mock('@langchain/tavily', () => ({
	TavilySearch: mockTavilySearch,
}));

jest.mock('yaml', () => ({
	Document: jest.fn().mockImplementation(() => ({
		contents: null,
		toString: () => 'mocked yaml output',
	})),
}));

describe('webSearch', () => {
	let originalEnv: string | undefined;

	beforeEach(async () => {
		jest.clearAllMocks();
		originalEnv = process.env['TAVILY_API_KEY'];

		// Clear the environment variable by default
		delete process.env['TAVILY_API_KEY'];

		// Reset the module to clear any cached instances
		jest.resetModules();

		// Default mock setup
		mockTavilySearch.mockImplementation(() => ({
			invoke: mockInvoke,
		}));
	});

	afterEach(() => {
		// Restore original environment
		if (originalEnv !== undefined) {
			process.env['TAVILY_API_KEY'] = originalEnv;
		} else {
			delete process.env['TAVILY_API_KEY'];
		}
	});

	it('should return fallback results when TAVILY_API_KEY is not configured', async () => {
		// Ensure no API key is set
		delete process.env['TAVILY_API_KEY'];

		// Import the function after setting up the environment
		const {webSearch} = await import('../../tools/web-search.js');

		const result = await webSearch({query: 'test query'});

		expect(result).toContain('Web search for "test query"');
		expect(result).toContain('⚠️  Tavily API key not configured');
		expect(result).toContain('Search Results (fallback)');
		expect(result).toContain('Latest documentation and guides for test query');
		expect(mockTavilySearch).not.toHaveBeenCalled();
	});

	it('should perform real search when TAVILY_API_KEY is configured', async () => {
		// Set up environment variable
		process.env['TAVILY_API_KEY'] = 'test-api-key';

		// Mock successful search
		mockInvoke.mockResolvedValue({
			results: [
				{
					title: 'Test Result',
					content: 'Test content',
					url: 'https://example.com',
					score: 0.9,
				},
			],
		});

		// Import the function after setting up the environment
		const {webSearch} = await import('../../tools/web-search.js');

		const result = await webSearch({query: 'test query'});

		expect(result).toContain('🔍 Web search results for "test query"');
		expect(result).toContain('mocked yaml output');
		expect(result).toContain(
			'Search completed successfully using Tavily web search',
		);
		expect(mockTavilySearch).toHaveBeenCalled();
		expect(mockInvoke).toHaveBeenCalledWith({query: 'test query'});
	});

	it('should handle search errors gracefully', async () => {
		// Set up environment variable
		process.env['TAVILY_API_KEY'] = 'test-api-key';

		// Mock search error
		mockInvoke.mockRejectedValue(new Error('API Error'));

		// Import the function after setting up the environment
		const {webSearch} = await import('../../tools/web-search.js');

		const result = await webSearch({query: 'test query'});

		expect(result).toContain('Error performing web search: API Error');
		expect(mockTavilySearch).toHaveBeenCalled();
	});

	it('should handle TavilySearch initialization errors', async () => {
		// Set up environment variable
		process.env['TAVILY_API_KEY'] = 'test-api-key';

		// Mock console.error to avoid noise in tests
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

		// Mock TavilySearch constructor to throw an error
		mockTavilySearch.mockImplementation(() => {
			throw new Error('Initialization failed');
		});

		// Import the function after setting up the environment and mocks
		const {webSearch} = await import('../../tools/web-search.js');

		const result = await webSearch({query: 'test query'});

		expect(result).toContain('⚠️  Tavily API key not configured');
		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to initialize Tavily search:',
			expect.any(Error),
		);

		consoleSpy.mockRestore();
	});

	it('should handle missing results in search response', async () => {
		// Set up environment variable
		process.env['TAVILY_API_KEY'] = 'test-api-key';

		// Mock search with empty results
		mockInvoke.mockResolvedValue({results: []});

		// Import the function after setting up the environment
		const {webSearch} = await import('../../tools/web-search.js');

		const result = await webSearch({query: 'test query'});

		expect(result).toContain('🔍 Web search results for "test query"');
		expect(result).toContain(
			'Search completed successfully using Tavily web search',
		);
		expect(mockInvoke).toHaveBeenCalledWith({query: 'test query'});
	});
});
