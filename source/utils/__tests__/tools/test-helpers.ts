import {ThreadState} from '../../memory.js';

/**
 * Creates a mock ThreadState for testing
 */
export function createMockState(): ThreadState {
	return {
		thread: {
			usage: {
				prompt_tokens: 10,
				completion_tokens: 20,
				total_tokens: 30,
			},
			systemMessage: 'Test system message',
			events: [],
		},
	};
}

/**
 * Creates a mock agentMemory function that returns an updated state
 */
export function createMockAgentMemory() {
	return jest
		.fn()
		.mockImplementation(async (intent, content, state, metadata) => ({
			...state,
			thread: {
				...state.thread,
				events: [
					...state.thread.events,
					{
						intent: typeof intent === 'string' ? intent : intent.intent,
						content,
						metadata: metadata || {},
						...(typeof intent !== 'string' && intent.args
							? {args: intent.args}
							: {}),
					},
				],
			},
		}));
}
