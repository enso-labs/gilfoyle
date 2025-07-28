import {initializeAgent} from '../utils/agent.js';

// Mock dependencies that don't need to be tested
jest.mock('../utils/config.js', () => ({
	getConfigManager: () => ({
		load: jest.fn().mockResolvedValue({
			version: '0.3.43',
			selectedModel: 'gpt-4',
			user: {name: 'TestUser'},
		}),
		getConfigPath: jest.fn().mockReturnValue('/test/config.json'),
		getAllModels: jest.fn().mockResolvedValue([
			{config: {name: 'GPT-4'}, providerName: 'OpenAI'},
			{config: {name: 'Claude'}, providerName: 'Anthropic'},
		]),
	}),
}));

jest.mock('fs/promises', () => ({
	writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/memory.js', () => ({
	updateSystemMessage: jest.fn(),
	getSystemMessage: jest.fn().mockReturnValue('Test system message'),
}));

jest.mock('../config/prompt.js', () => ({
	default: {
		DEFAULT_SYSTEM_PROMPT: 'You are Gilfoyle, an AI development assistant.',
	},
	DEFAULT_SYSTEM_PROMPT: 'You are Gilfoyle, an AI development assistant.',
}));

jest.mock('../utils/tools.js', () => ({
	executeTools: jest.fn(),
}));

describe('React Init Functionality', () => {
	describe('initializeAgent', () => {
		it('should initialize agent with default system prompt', async () => {
			const result = await initializeAgent();

			expect(result).toEqual({
				thread: {
					usage: {
						prompt_tokens: 0,
						completion_tokens: 0,
						total_tokens: 0,
					},
					systemMessage: 'You are Gilfoyle, an AI development assistant.',
					events: [],
				},
			});
		});

		it('should initialize agent with custom system prompt', async () => {
			const customPrompt = 'Custom system prompt';
			const result = await initializeAgent(customPrompt);

			expect(result.thread.systemMessage).toBe(customPrompt);
			expect(result.thread.events).toEqual([]);
			expect(result.thread.usage).toEqual({
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			});
		});

		it('should initialize with zero token usage', async () => {
			const result = await initializeAgent();

			expect(result.thread.usage).toEqual({
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			});
		});

		it('should initialize with empty events array', async () => {
			const result = await initializeAgent();

			expect(result.thread.events).toEqual([]);
		});

		it('should handle undefined prompt gracefully', async () => {
			const agentState = await initializeAgent(undefined);

			expect(agentState.thread.systemMessage).toBe(
				'You are Gilfoyle, an AI development assistant.',
			);
		});

		it('should handle empty string prompt', async () => {
			const agentState = await initializeAgent('');

			expect(agentState.thread.systemMessage).toBe('');
		});
	});

	describe('Integration Tests', () => {
		it('should handle initialization workflow', async () => {
			// Test the complete initialization workflow
			const agentState = await initializeAgent();

			expect(agentState.thread.events).toHaveLength(0);
			expect(agentState.thread.usage?.total_tokens).toBe(0);
			expect(agentState.thread.systemMessage).toBe(
				'You are Gilfoyle, an AI development assistant.',
			);
		});

		it('should handle initialization with custom configuration', async () => {
			const customPrompt = 'You are Gilfoyle, a specialized AI assistant.';
			const agentState = await initializeAgent(customPrompt);

			expect(agentState.thread.systemMessage).toBe(customPrompt);
			expect(agentState.thread.events).toEqual([]);
			expect(agentState.thread.usage).toEqual({
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			});
		});
	});

	describe('Agent State Structure', () => {
		it('should return proper thread state structure', async () => {
			const result = await initializeAgent();

			expect(result).toHaveProperty('thread');
			expect(result.thread).toHaveProperty('usage');
			expect(result.thread).toHaveProperty('systemMessage');
			expect(result.thread).toHaveProperty('events');

			expect(typeof result.thread.usage.prompt_tokens).toBe('number');
			expect(typeof result.thread.usage.completion_tokens).toBe('number');
			expect(typeof result.thread.usage.total_tokens).toBe('number');
			expect(typeof result.thread.systemMessage).toBe('string');
			expect(Array.isArray(result.thread.events)).toBe(true);
		});

		it('should initialize with immutable state structure', async () => {
			const state1 = await initializeAgent('Test prompt 1');
			const state2 = await initializeAgent('Test prompt 2');

			expect(state1.thread.systemMessage).toBe('Test prompt 1');
			expect(state2.thread.systemMessage).toBe('Test prompt 2');
			expect(state1.thread.systemMessage).not.toBe(state2.thread.systemMessage);
		});
	});
});
