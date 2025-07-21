import {ThreadState} from './memory.js';
import {getConfigManager} from './config.js';
import {callModel} from './llm.js';
import ChatModels from '../config/llm.js';
import {agentMemory, getSystemMessage, parseEvents, convertStateToXML} from './memory.js';
import {classifyIntent} from './classify.js';
import {tools} from './tools.js';
import { ToolIntent } from '../entities/tool.js';


export interface AgentResponse {
	content: string;
	state: ThreadState;
	tokens?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

type EventStatusOptions = {
  status?: string;
  message?: string;
};

function eventStatus({ status }: EventStatusOptions = {}) {
  const map: Record<string, { icon: string; label: string }> = {
    error: { icon: '❌', label: 'error' },
    success: { icon: '✅', label: 'success' },
    pending: { icon: '⏳', label: 'pending' },
    waiting_for_feedback: { icon: '🕒', label: 'waiting_for_feedback' },
  };
  const statusKey = status ?? '';
  const { icon, label } = map[statusKey] || { icon: '❓', label: 'unknown' };
  return {
    icon,
    status: label,
  };
}

export async function executeTools(toolIntents: ToolIntent[], state: ThreadState) {
	// Execute all identified tools
	for (const toolIntent of toolIntents) {
		const {intent, args} = toolIntent;

		if (intent === 'none') {
			continue;
		}

		if (intent in tools) {
			let toolOutput: string;
      let metadata: any = eventStatus({ status: 'success' });
			try {
				// Execute the specific tool
				switch (intent) {
					case 'get_weather':
						if ('location' in args) {
							toolOutput = tools.get_weather(args as {location: string});
						} else {
							toolOutput = 'Missing location parameter for weather tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'get_stock_info':
						if ('ticker' in args) {
							toolOutput = tools.get_stock_info(args as {ticker: string});
						} else {
							toolOutput = 'Missing ticker parameter for stock info tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'web_search':
						if ('query' in args) {
							toolOutput = tools.web_search(args as {query: string});
						} else {
							toolOutput = 'Missing query parameter for web search tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'math_calculator':
						if ('expression' in args) {
							toolOutput = tools.math_calculator(args as {expression: string});
						} else {
							toolOutput = 'Missing expression parameter for calculator tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'file_search':
						if ('pattern' in args) {
							toolOutput = await tools.file_search(
								args as {pattern: string; directory?: string},
							);
						} else {
							toolOutput = 'Missing pattern parameter for file search tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'read_file':
						if ('filepath' in args) {
							toolOutput = await tools.read_file(args as {filepath: string});
						} else {
							toolOutput = 'Missing filepath parameter for read file tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'create_file':
						if ('filepath' in args && 'content' in args) {
							toolOutput = await tools.create_file(
								args as {filepath: string; content: string},
							);
						} else {
							toolOutput =
								'Missing filepath or content parameter for create file tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					case 'git_status':
						toolOutput = await tools.git_status();
						break;

					case 'npm_info':
						if ('package' in args) {
							toolOutput = await tools.npm_info(args as {package: string});
						} else {
							toolOutput = 'Missing package parameter for npm info tool';
              metadata = eventStatus({ status: 'error' });
						}
						break;

					default:
						toolOutput = `Unknown tool: ${intent}`;
            metadata = eventStatus({ status: 'error' });
				}

				// Add tool execution as an event
				state = await agentMemory(toolIntent, toolOutput, state, metadata);
			} catch (error) {
				const errorMessage = `Tool execution failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`;
				state = await agentMemory(toolIntent, errorMessage, state);
			}
		}
	}
  return state;
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

	// Add user input to memory
	state = await agentMemory("user_input", query, state);

	// Tool execution - classify all tools from the input at once
	const toolIntents = await classifyIntent(query, selectedModel.toString());

	// Execute all identified tools
	state = await executeTools(toolIntents, state);

	// Generate LLM response
	const systemMessage = getSystemMessage(state);
	const conversationHistory = convertStateToXML(state);

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
		state = await agentMemory("llm_response", responseContent, state, {model: selectedModel});

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
			tokens: llmResponse.usage,
		};
	} catch (error) {
		const errorMessage = `LLM call failed: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
		state = await agentMemory("llm_error", errorMessage, state);

		return {
			content: errorMessage,
			state,
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