export type ThreadState = {
	thread: {
		usage: {
			prompt_tokens: number;
			completion_tokens: number;
			total_tokens: number;
		};
		systemMessage?: string;
		events: {
			intent: string;
			content: string;
			args?: any;
			metadata: any;
		}[];
	};
};

export async function agentMemory(
	toolIntent: {intent: string; args: any} | string,
	content: string,
	state: ThreadState,
	metadata: any = {},
): Promise<ThreadState> {
	const intent =
		typeof toolIntent === 'string' ? toolIntent : toolIntent.intent;
	// Create event object
	const event: ThreadState['thread']['events'][0] = {
		intent,
		content,
		metadata,
	};

	// Add additional attributes for tool events
	if (
		intent !== 'user_input' &&
		intent !== 'lm_response' &&
		typeof toolIntent !== 'string' &&
		'args' in toolIntent
	) {
		event.args = toolIntent.args;
	}

	// Add the new event to the state
	const newState = {
		thread: {
			usage: state.thread.usage,
			systemMessage: state.thread.systemMessage,
			events: [...state.thread.events, event],
		},
	};

	return newState;
}

export function updateSystemMessage(
	state: ThreadState,
	systemMessage: string,
): ThreadState {
	return {
		thread: {
			...state.thread,
			systemMessage,
		},
	};
}

export function getSystemMessage(state: ThreadState): string {
	return state.thread.systemMessage || 'You are a helpful AI assistant.';
}

export function parseEvents(
	state: ThreadState,
): {intent: string; content: string}[] {
	return state.thread.events.map(event => ({
		intent: event.intent,
		content: event.content,
	}));
}

export function getLatestContext(state: ThreadState): string {
	const events = parseEvents(state);
	if (events.length === 0) return '';

	// Get the last few events to understand current context
	const recentEvents = events.slice(-3);
	return recentEvents.map(e => `${e.intent}: ${e.content}`).join('\n');
}

export function convertStateToXML(state: ThreadState): string {
	// Convert to XML format for components that still expect it
	const events = state.thread.events
		.map(event => {
			const attrs = [`intent="${event.intent}"`];

			// Add all metadata properties as attributes
			if (event.metadata) {
				Object.entries(event.metadata).forEach(([key, value]) => {
					if (value !== undefined && value !== null) {
						attrs.push(`${key}="${value}"`);
					}
				});
			}

			return `<event ${attrs.join(' ')}>${event.content}</event>`;
		})
		.join('\n  ');

	return `<thread>\n${events}\n</thread>`;
}
