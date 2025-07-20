// Define tool intent interfaces
interface WeatherIntent {
	intent: 'get_weather';
	args: {location: string};
}

interface StockIntent {
	intent: 'get_stock_info';
	args: {ticker: string};
}

interface WebSearchIntent {
	intent: 'web_search';
	args: {query: string};
}

interface MathIntent {
	intent: 'math_calculator';
	args: {expression: string};
}

interface NoIntent {
	intent: 'none';
	args: Record<string, never>;
}

type ToolIntent =
	| WeatherIntent
	| StockIntent
	| WebSearchIntent
	| MathIntent
	| NoIntent;

export type {ToolIntent};
