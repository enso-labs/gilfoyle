import {getModel} from './llm.js';
import ChatModels from '../config/llm.js';
import {ToolIntent} from '../entities/tool.js';

export async function classifyIntent(
	query: string,
	modelName?: string,
): Promise<ToolIntent[]> {
	const prompt = `
Analyze the following user query and identify if any tools should be executed. Return a JSON array of tool intents.

Available tools:
1. "get_weather" - for weather information requests (args: {"location": "city name"})
2. "get_stock_info" - for stock price requests (args: {"ticker": "STOCK_SYMBOL"}) 
3. "web_search" - for general information searches (args: {"query": "search terms"})
4. "math_calculator" - for mathematical calculations (args: {"expression": "math expression"})

If no tools are needed, return: [{"intent": "none", "args": {}}]

Examples:
- "weather in NYC" → [{"intent": "get_weather", "args": {"location": "New York City"}}]
- "TSLA stock price" → [{"intent": "get_stock_info", "args": {"ticker": "TSLA"}}]
- "weather in Boston and price of AAPL" → [{"intent": "get_weather", "args": {"location": "Boston"}}, {"intent": "get_stock_info", "args": {"ticker": "AAPL"}}]
- "calculate 15 * 23" → [{"intent": "math_calculator", "args": {"expression": "15 * 23"}}]
- "search for latest AI news" → [{"intent": "web_search", "args": {"query": "latest AI news"}}]

User query: "${query}"

Respond with only the JSON array, no additional text.
  `;

	const messages = [{role: 'user', content: prompt}];

	const model = await getModel(modelName as ChatModels);
	const response = await model.invoke(messages);

	const content =
		typeof response.content === 'string'
			? response.content
			: JSON.stringify(response.content) ?? '[]';

	try {
		// Clean the response to remove any markdown formatting or extra text
		let cleanContent = content.trim();

		// Remove markdown code blocks if present
		if (cleanContent.startsWith('```json')) {
			cleanContent = cleanContent
				.replace(/^```json\s*/, '')
				.replace(/\s*```$/, '');
		} else if (cleanContent.startsWith('```')) {
			cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
		}

		// Extract JSON array if there's extra text
		const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			cleanContent = jsonMatch[0];
		}

		return JSON.parse(cleanContent);
	} catch (error) {
		console.error('Failed to parse LLM response:', content);
		console.error('Parse error:', error);

		// Return a safe fallback
		return [{intent: 'none', args: {}}];
	}
}
