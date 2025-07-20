import {ThreadState} from './memory.js';
import {getConfigManager} from './config.js';
import {callModel} from './llm.js';
import ChatModels from '../config/llm.js';
import {agentMemory, getSystemMessage, parseEvents} from './memory.js';
import {classifyIntent} from './classify.js';
import {tools} from './tools.js';

export interface AgentResponse {
	content: string;
	state: ThreadState;
	toolsUsed: string[];
	tokens?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export async function agentLoop(
	query: string,
	state: ThreadState,
	model: ChatModels = ChatModels.OPENAI_GPT_4_1_MINI,
): Promise<AgentResponse> {
	const configManager = getConfigManager();
	const config = await configManager.load();

	// Use configured model or fallback
	const selectedModel =
		model || (config.selectedModel as ChatModels) || ChatModels.OPENAI_GPT_4_1_NANO;
	const toolsUsed: string[] = [];

	// Add user input to memory
	state = await agentMemory('user_input', query, state);

	// Tool execution - classify all tools from the input at once
	const toolIntents = await classifyIntent(query, selectedModel.toString());

	// Execute all identified tools
	for (const toolIntent of toolIntents) {
		const {intent, args} = toolIntent;

		if (intent === 'none') {
			continue;
		}

		if (intent in tools) {
			let toolOutput: string;

			try {
				// Execute the specific tool
				switch (intent) {
					case 'get_weather':
						if ('location' in args) {
							toolOutput = tools.get_weather(args as {location: string});
							toolsUsed.push('get_weather');
						} else {
							toolOutput = 'Missing location parameter for weather tool';
						}
						break;

					case 'get_stock_info':
						if ('ticker' in args) {
							toolOutput = tools.get_stock_info(args as {ticker: string});
							toolsUsed.push('get_stock_info');
						} else {
							toolOutput = 'Missing ticker parameter for stock info tool';
						}
						break;

					case 'web_search':
						if ('query' in args) {
							toolOutput = tools.web_search(args as {query: string});
							toolsUsed.push('web_search');
						} else {
							toolOutput = 'Missing query parameter for web search tool';
						}
						break;

					case 'math_calculator':
						if ('expression' in args) {
							toolOutput = tools.math_calculator(args as {expression: string});
							toolsUsed.push('math_calculator');
						} else {
							toolOutput = 'Missing expression parameter for calculator tool';
						}
						break;

					case 'file_search':
						if ('pattern' in args) {
							toolOutput = await tools.file_search(
								args as {pattern: string; directory?: string},
							);
							toolsUsed.push('file_search');
						} else {
							toolOutput = 'Missing pattern parameter for file search tool';
						}
						break;

					case 'read_file':
						if ('filepath' in args) {
							toolOutput = await tools.read_file(args as {filepath: string});
							toolsUsed.push('read_file');
						} else {
							toolOutput = 'Missing filepath parameter for read file tool';
						}
						break;

					case 'create_file':
						if ('filepath' in args && 'content' in args) {
							toolOutput = await tools.create_file(
								args as {filepath: string; content: string},
							);
							toolsUsed.push('create_file');
						} else {
							toolOutput =
								'Missing filepath or content parameter for create file tool';
						}
						break;

					case 'git_status':
						toolOutput = await tools.git_status();
						toolsUsed.push('git_status');
						break;

					case 'npm_info':
						if ('package' in args) {
							toolOutput = await tools.npm_info(args as {package: string});
							toolsUsed.push('npm_info');
						} else {
							toolOutput = 'Missing package parameter for npm info tool';
						}
						break;

					default:
						toolOutput = `Unknown tool: ${intent}`;
				}

				// Add tool execution as an event
				state = await agentMemory(intent, toolOutput, state);
			} catch (error) {
				const errorMessage = `Tool execution failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`;
				state = await agentMemory(intent, errorMessage, state);
			}
		}
	}

	// Generate LLM response
	const systemMessage = getSystemMessage(state);
	const conversationHistory = buildConversationContext(state);

	try {
		const llmResponse = await callModel(
			conversationHistory,
			systemMessage,
			selectedModel,
		);
		const responseContent =
			typeof llmResponse.content === 'string'
				? llmResponse.content
				: JSON.stringify(llmResponse.content);

		// Add LLM response to memory
		state = await agentMemory('llm_response', responseContent, state);

		// Update token usage if available
		if (llmResponse.usage) {
			state.thread.usage = {
				prompt_tokens:
					state.thread.usage.prompt_tokens +
					(llmResponse.usage.prompt_tokens || 0),
				completion_tokens:
					state.thread.usage.completion_tokens +
					(llmResponse.usage.completion_tokens || 0),
				total_tokens:
					state.thread.usage.total_tokens +
					(llmResponse.usage.total_tokens || 0),
			};
		}

		return {
			content: responseContent,
			state,
			toolsUsed,
			tokens: llmResponse.usage,
		};
	} catch (error) {
		const errorMessage = `LLM call failed: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
		state = await agentMemory('llm_error', errorMessage, state);

		return {
			content: errorMessage,
			state,
			toolsUsed,
		};
	}
}

export async function initializeAgent(
	systemPrompt?: string,
): Promise<ThreadState> {
	const defaultSystemPrompt =
		systemPrompt ||
		`You are Gilfoyle, an AI development assistant. You are helpful, knowledgeable about programming, and can assist with various development tasks. You have access to tools for getting weather information and other utilities. Be concise but thorough in your responses.`;

	return {
		thread: {
			usage: {
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			},
			systemMessage: defaultSystemPrompt,
			events: [],
		},
	};
}

export async function compactConversation(
	state: ThreadState,
): Promise<ThreadState> {
	const configManager = getConfigManager();
	const config = await configManager.load();
	const selectedModel = (config.selectedModel as ChatModels) || ChatModels.OPENAI_GPT_4_1_NANO;

	const events = parseEvents(state);
	if (events.length <= 5) {
		return state; // No need to compact short conversations
	}

	const conversationText = events
		.map(e => `${e.intent}: ${e.content}`)
		.join('\n');

	const compactionPrompt = `Summarize the following conversation while preserving key information, decisions made, and important context. Be concise but ensure no critical information is lost:\n\n${conversationText}`;

	try {
		const summaryResponse = await callModel(
			compactionPrompt,
			'You are a helpful assistant that creates concise summaries of conversations.',
			selectedModel,
		);

		const summary =
			typeof summaryResponse.content === 'string'
				? summaryResponse.content
				: JSON.stringify(summaryResponse.content);

		// Create new compacted state
		return {
			thread: {
				usage: state.thread.usage,
				systemMessage: state.thread.systemMessage,
				events: [
					{
						intent: 'conversation_summary',
						content: summary,
						metadata: {type: 'system', status: 'compacted'},
					},
				],
			},
		};
	} catch (error) {
		console.error('Failed to compact conversation:', error);
		return state; // Return original state if compaction fails
	}
}

export async function exportConversation(
	state: ThreadState,
	format: 'markdown' | 'json' | 'txt' = 'markdown',
): Promise<string> {
	const events = parseEvents(state);
	const timestamp = new Date().toISOString();

	switch (format) {
		case 'markdown':
			return `# Gilfoyle Conversation Export\n\n**Exported:** ${timestamp}\n**Total Events:** ${
				events.length
			}\n**Token Usage:** ${
				state.thread.usage.total_tokens
			} tokens\n\n## Conversation\n\n${events
				.map(e => `### ${e.intent}\n\n${e.content}\n`)
				.join('\n')}`;

		case 'json':
			return JSON.stringify(
				{
					exported: timestamp,
					totalEvents: events.length,
					tokenUsage: state.thread.usage,
					systemMessage: state.thread.systemMessage,
					events,
				},
				null,
				2,
			);

		case 'txt':
			return `Gilfoyle Conversation Export\nExported: ${timestamp}\nTotal Events: ${
				events.length
			}\nToken Usage: ${state.thread.usage.total_tokens} tokens\n\n${events
				.map(e => `[${e.intent}] ${e.content}`)
				.join('\n\n')}`;

		default:
			throw new Error(`Unsupported export format: ${format}`);
	}
}



function buildConversationContext(state: ThreadState): string {
	const events = parseEvents(state);
	const recentEvents = events.slice(-10); // Keep last 10 events for context

	return recentEvents
		.map(e => {
			switch (e.intent) {
				case 'user_input':
					return `Human: ${e.content}`;
				case 'llm_response':
					return `Assistant: ${e.content}`;
				case 'get_weather':
					return `[Weather Tool Result]: ${e.content}`;
				default:
					return `[${e.intent}]: ${e.content}`;
			}
		})
		.join('\n\n');
}
