import {ThreadState} from './memory.js';
import {getConfigManager} from './config.js';
import {callModel} from './llm.js';
import ChatModels from '../config/llm.js';
import {
	agentMemory,
	getSystemMessage,
	parseEvents,
	convertStateToXML,
} from './memory.js';
import {classifyIntent} from './classify.js';
import {toolsArray} from './tools/index.js';
import {ToolIntent} from '../entities/tool.js';
import Prompt from '../config/prompt.js';
import {Tool} from 'langchain/tools';

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

function eventStatus({status}: EventStatusOptions = {}) {
	const map: Record<string, {icon: string; label: string}> = {
		error: {icon: '❌', label: 'error'},
		success: {icon: '✅', label: 'success'},
		pending: {icon: '⏳', label: 'pending'},
		waiting_for_feedback: {icon: '🕒', label: 'waiting_for_feedback'},
	};
	const statusKey = status ?? '';
	const {icon, label} = map[statusKey] || {icon: '❓', label: 'unknown'};
	return {
		icon,
		status: label,
	};
}

export async function executeTools(
	toolIntents: ToolIntent[],
	state: ThreadState,
	tools: Tool[] = toolsArray as Tool[],
) {
	// Execute all identified tools
	for (const toolIntent of toolIntents) {
		const {intent, args} = toolIntent;

		if (intent === 'none') {
			continue;
		}

		// Check if tool exists in the tools object or handle special cases
		let toolOutput: string;
		let metadata: any = eventStatus({status: 'success'});
		try {
			const tool = tools.find(t => t.name === intent);
			if (!tool) {
				throw new Error(`Tool ${intent} not found`);
			}
			toolOutput = await tool.invoke(args);

			// Add tool execution as an event
			state = await agentMemory(toolIntent, toolOutput, state, metadata);
		} catch (error) {
			const errorMessage = `Tool execution failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
			state = await agentMemory(toolIntent, errorMessage, state);
		}
	}
	return state;
}

export async function agentLoop(
	query: string,
	state: ThreadState,
	model: ChatModels = ChatModels.OPENAI_GPT_4_1_NANO,
	tools: Tool[] = toolsArray as Tool[],
): Promise<AgentResponse> {
	// Add user input to memory
	state = await agentMemory('user_input', query, state);

	// Tool execution - classify all tools from the input at once
	const [toolIntents, usage_metadata] = await classifyIntent(
		query,
		model.toString(),
		tools,
	);

	// Execute all identified tools
	state = await executeTools(toolIntents, state);

	// Generate LLM response
	const systemMessage = getSystemMessage(state);
	const conversationHistory = convertStateToXML(state);

	try {
		const llmResponse = await callModel(
			conversationHistory,
			systemMessage,
			model,
		);
		const responseContent =
			typeof llmResponse.content === 'string'
				? llmResponse.content
				: JSON.stringify(llmResponse.content);

		// Add LLM response to memory
		state = await agentMemory('llm_response', responseContent, state, {
			model: model,
		});

		state.thread.usage = (() => {
			const u1 = llmResponse.usage || {};
			const u2 = usage_metadata || {};
			return {
				prompt_tokens:
					(u1.prompt_tokens || u1.input_tokens || 0) +
					(u2.input_tokens || u2.prompt_tokens || 0),
				completion_tokens:
					(u1.completion_tokens || u1.output_tokens || 0) +
					(u2.output_tokens || u2.completion_tokens || 0),
				total_tokens:
					(u1.total_tokens || u1.input_tokens + u1.output_tokens || 0) +
					(u2.total_tokens || u2.input_tokens + u2.output_tokens || 0),
			};
		})();

		return {
			content: responseContent,
			state,
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
		};
	}
}

export async function initializeAgent(
	systemPrompt?: string,
): Promise<ThreadState> {
	const defaultSystemPrompt =
		systemPrompt !== undefined ? systemPrompt : Prompt.DEFAULT_SYSTEM_PROMPT;
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
	const selectedModel =
		(config.selectedModel as ChatModels) || ChatModels.OPENAI_GPT_4_1_NANO;

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
				state.thread.usage?.total_tokens
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
			}\nToken Usage: ${state.thread.usage?.total_tokens} tokens\n\n${events
				.map(e => `[${e.intent}] ${e.content}`)
				.join('\n\n')}`;

		default:
			throw new Error(`Unsupported export format: ${format}`);
	}
}
