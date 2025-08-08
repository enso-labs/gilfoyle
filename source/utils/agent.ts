import {ThreadState, parseEvents} from './memory.js';
import Prompt from '../config/prompt.js';

export interface AgentResponse {
	content: string;
	state: ThreadState;
	tokens?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
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
