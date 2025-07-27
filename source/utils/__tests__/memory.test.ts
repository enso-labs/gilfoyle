import {
	agentMemory,
	updateSystemMessage,
	getSystemMessage,
	parseEvents,
	getLatestContext,
	convertStateToXML,
	type ThreadState,
} from '../memory.js';

describe('Memory Utilities', () => {
	let mockState: ThreadState;

	beforeEach(() => {
		mockState = {
			thread: {
				usage: {
					prompt_tokens: 10,
					completion_tokens: 20,
					total_tokens: 30,
				},
				systemMessage: 'Test system message',
				events: [
					{
						intent: 'user_input',
						content: 'Hello',
						metadata: {timestamp: '2023-01-01'},
					},
					{
						intent: 'llm_response',
						content: 'Hi there!',
						metadata: {timestamp: '2023-01-02'},
					},
				],
			},
		};
	});

	describe('agentMemory', () => {
		it('should add a new event with string intent', async () => {
			const result = await agentMemory('user_input', 'New message', mockState, {
				timestamp: '2023-01-03',
			});

			expect(result.thread.events).toHaveLength(3);
			expect(result.thread.events[2]).toEqual({
				intent: 'user_input',
				content: 'New message',
				metadata: {timestamp: '2023-01-03'},
			});
		});

		it('should add a new event with object intent and args for tool events', async () => {
			const toolIntent = {intent: 'tool_call', args: {param: 'value'}};
			const result = await agentMemory(toolIntent, 'Tool executed', mockState, {
				timestamp: '2023-01-03',
			});

			expect(result.thread.events).toHaveLength(3);
			expect(result.thread.events[2]).toEqual({
				intent: 'tool_call',
				content: 'Tool executed',
				args: {param: 'value'},
				metadata: {timestamp: '2023-01-03'},
			});
		});

		it('should not add args for user_input or llm_response events', async () => {
			const toolIntent = {intent: 'user_input', args: {param: 'value'}};
			const result = await agentMemory(toolIntent, 'User message', mockState);

			expect(result.thread.events[2]).not.toHaveProperty('args');
		});

		it('should preserve original state immutably', async () => {
			await agentMemory('test_intent', 'Test content', mockState);

			expect(mockState.thread.events).toHaveLength(2);
		});
	});

	describe('updateSystemMessage', () => {
		it('should update the system message', () => {
			const newMessage = 'Updated system message';
			const result = updateSystemMessage(mockState, newMessage);

			expect(result.thread.systemMessage).toBe(newMessage);
			expect(result.thread.events).toEqual(mockState.thread.events);
			expect(result.thread.usage).toEqual(mockState.thread.usage);
		});

		it('should preserve original state immutably', () => {
			const originalMessage = mockState.thread.systemMessage;
			updateSystemMessage(mockState, 'New message');

			expect(mockState.thread.systemMessage).toBe(originalMessage);
		});
	});

	describe('getSystemMessage', () => {
		it('should return the system message when it exists', () => {
			const result = getSystemMessage(mockState);
			expect(result).toBe('Test system message');
		});

		it('should return default message when system message is undefined', () => {
			const stateWithoutMessage = {
				...mockState,
				thread: {...mockState.thread, systemMessage: undefined},
			};
			const result = getSystemMessage(stateWithoutMessage);
			expect(result).toBe('You are a helpful AI assistant.');
		});
	});

	describe('parseEvents', () => {
		it('should return simplified event objects with intent and content', () => {
			const result = parseEvents(mockState);

			expect(result).toEqual([
				{intent: 'user_input', content: 'Hello'},
				{intent: 'llm_response', content: 'Hi there!'},
			]);
		});

		it('should handle empty events array', () => {
			const emptyState = {
				...mockState,
				thread: {...mockState.thread, events: []},
			};
			const result = parseEvents(emptyState);

			expect(result).toEqual([]);
		});
	});

	describe('getLatestContext', () => {
		it('should return formatted string of recent events', () => {
			const result = getLatestContext(mockState);
			expect(result).toBe('user_input: Hello\nllm_response: Hi there!');
		});

		it('should return last 3 events when more than 3 exist', () => {
			const stateWithManyEvents = {
				...mockState,
				thread: {
					...mockState.thread,
					events: [
						...mockState.thread.events,
						{intent: 'event1', content: 'content1', metadata: {}},
						{intent: 'event2', content: 'content2', metadata: {}},
						{intent: 'event3', content: 'content3', metadata: {}},
					],
				},
			};

			const result = getLatestContext(stateWithManyEvents);
			expect(result).toBe(
				'event1: content1\nevent2: content2\nevent3: content3',
			);
		});

		it('should return empty string for empty events', () => {
			const emptyState = {
				...mockState,
				thread: {...mockState.thread, events: []},
			};
			const result = getLatestContext(emptyState);

			expect(result).toBe('');
		});
	});

	describe('convertStateToXML', () => {
		it('should convert state to XML format', () => {
			const result = convertStateToXML(mockState);
			const expected = `<thread>
<event intent="user_input" timestamp="2023-01-01">Hello</event>
  <event intent="llm_response" timestamp="2023-01-02">Hi there!</event>
</thread>`;

			expect(result).toBe(expected);
		});

		it('should handle events with no metadata', () => {
			const stateWithoutMetadata = {
				...mockState,
				thread: {
					...mockState.thread,
					events: [{intent: 'test', content: 'content', metadata: {}}],
				},
			};

			const result = convertStateToXML(stateWithoutMetadata);
			expect(result).toBe(`<thread>
<event intent="test">content</event>
</thread>`);
		});

		it('should handle metadata with null and undefined values', () => {
			const stateWithNullMetadata = {
				...mockState,
				thread: {
					...mockState.thread,
					events: [
						{
							intent: 'test',
							content: 'content',
							metadata: {
								valid: 'value',
								nullValue: null,
								undefinedValue: undefined,
							},
						},
					],
				},
			};

			const result = convertStateToXML(stateWithNullMetadata);
			expect(result).toBe(`<thread>
<event intent="test" valid="value">content</event>
</thread>`);
		});
	});
});
