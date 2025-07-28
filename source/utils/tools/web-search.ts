import {TavilySearch, TopicType} from '@langchain/tavily';
import YAML from 'yaml';

// Lazy initialization of Tavily search - only create when needed
let tavilySearch: any = null;

function getTavilySearch(
	maxResults: number = 5,
	topic: TopicType = 'general',
): any {
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

/**
 * Query based on current conversation context
 * @param query - The query to search for
 * @returns The search results
 */
export async function webSearch({query}: {query: string}) {
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
		doc.contents = search.results.map(
			(result: {
				title: string;
				content: string;
				url: string;
				score: number;
			}) => ({
				title: result.title,
				content: result.content,
				url: result.url,
				score: result.score,
			}),
		);
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
}
