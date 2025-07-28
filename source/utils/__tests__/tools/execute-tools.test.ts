import {executeTools} from '../../agent.js';
import {ToolIntent} from '../../../entities/tool.js';
import {createMockState, createMockAgentMemory} from './test-helpers.js';

// Mock the dependencies
jest.mock('../../memory.js', () => ({
	agentMemory: jest.fn(),
}));

jest.mock('../../tools/index.js', () => ({
	tools: {
		web_search: jest.fn(),
		math_calculator: jest.fn(),
		file_search: jest.fn(),
		read_file: jest.fn(),
		create_file: jest.fn(),
		git_status: jest.fn(),
		pwd: jest.fn(),
		terminal_command: jest.fn(),
	},
}));

describe('executeTools Integration', () => {
	let mockState: ReturnType<typeof createMockState>;
	let mockAgentMemory: ReturnType<typeof createMockAgentMemory>;
	const {tools} = require('../../tools/index.js');
	const {agentMemory} = require('../../memory.js');

	beforeEach(() => {
		jest.clearAllMocks();
		mockState = createMockState();
		mockAgentMemory = createMockAgentMemory();
		agentMemory.mockImplementation(mockAgentMemory);
	});

	describe('tool orchestration', () => {
		it('should skip tools with "none" intent', async () => {
			const toolIntents: ToolIntent[] = [{intent: 'none', args: {}}];

			const result = await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).not.toHaveBeenCalled();
			expect(result).toBe(mockState);
		});

		it('should execute implemented tools successfully', async () => {
			tools.web_search.mockResolvedValue('Search results');
			tools.math_calculator.mockReturnValue('2 + 2 = 4');
			tools.pwd.mockReturnValue('/current/dir');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
				{intent: 'math_calculator', args: {expression: '2 + 2'}},
				{intent: 'pwd', args: {}},
			];

			await executeTools(toolIntents, mockState);

			expect(tools.web_search).toHaveBeenCalledWith({query: 'test'});
			expect(tools.math_calculator).toHaveBeenCalledWith({expression: '2 + 2'});
			expect(tools.pwd).toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledTimes(3);
		});

		it('should handle unimplemented tools', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'get_weather', args: {location: 'New York'}},
				{intent: 'get_stock_info', args: {ticker: 'AAPL'}},
				{intent: 'npm_info', args: {package: 'react'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledTimes(3);
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Weather tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'},
			);
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[1],
				'Stock info tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'},
			);
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[2],
				'NPM info tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'},
			);
		});

		it('should handle missing parameters for tools', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {}} as ToolIntent,
				{intent: 'math_calculator', args: {}} as ToolIntent,
				{intent: 'file_search', args: {}} as ToolIntent,
				{intent: 'read_file', args: {}} as ToolIntent,
				{intent: 'create_file', args: {filepath: './test.txt'}} as ToolIntent,
				{intent: 'terminal_command', args: {}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledTimes(6);

			// Verify all tools report missing parameters
			const calls = mockAgentMemory.mock.calls;
			expect(calls[0][1]).toContain(
				'Missing query parameter for web search tool',
			);
			expect(calls[1][1]).toContain(
				'Missing expression parameter for calculator tool',
			);
			expect(calls[2][1]).toContain(
				'Missing pattern parameter for file search tool',
			);
			expect(calls[3][1]).toContain(
				'Missing filepath parameter for read file tool',
			);
			expect(calls[4][1]).toContain(
				'Missing filepath or content parameter for create file tool',
			);
			expect(calls[5][1]).toContain(
				'Missing command parameter for terminal command tool',
			);

			// All should have error status
			calls.forEach(call => {
				expect(call[3]).toEqual({icon: '❌', status: 'error'});
			});
		});

		it('should handle tool execution errors gracefully', async () => {
			tools.web_search.mockRejectedValue(new Error('Network error'));
			tools.math_calculator.mockImplementation(() => {
				throw new Error('Calculation error');
			});

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
				{intent: 'math_calculator', args: {expression: '2 + 2'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledTimes(2);
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Tool execution failed: Network error',
				expect.any(Object),
			);
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[1],
				'Tool execution failed: Calculation error',
				expect.any(Object),
			);
		});

		it('should handle non-Error exceptions', async () => {
			tools.web_search.mockRejectedValue('String error');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Tool execution failed: Unknown error',
				expect.any(Object),
			);
		});

		it('should continue execution even when tools fail', async () => {
			tools.web_search.mockRejectedValue(new Error('First tool failed'));
			tools.pwd.mockReturnValue('/current/dir');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
				{intent: 'pwd', args: {}},
			];

			await executeTools(toolIntents, mockState);

			expect(tools.web_search).toHaveBeenCalled();
			expect(tools.pwd).toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledTimes(2);
		});

		it('should handle unknown tool intents', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'unknown_tool', args: {}} as any,
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Unknown tool: unknown_tool',
				expect.any(Object),
				{icon: '❌', status: 'error'},
			);
		});

		it('should return updated state from agentMemory', async () => {
			const updatedState = {
				...mockState,
				thread: {
					...mockState.thread,
					events: [
						...mockState.thread.events,
						{intent: 'pwd', content: '/test/dir', metadata: {}},
					],
				},
			};

			mockAgentMemory.mockResolvedValue(updatedState);
			tools.pwd.mockReturnValue('/test/dir');

			const toolIntents: ToolIntent[] = [{intent: 'pwd', args: {}}];

			const result = await executeTools(toolIntents, mockState);

			expect(result).toBe(updatedState);
		});
	});

	describe('tool success status', () => {
		it('should add success metadata for successful tool execution', async () => {
			tools.web_search.mockResolvedValue('Search results');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Search results',
				expect.any(Object),
				{icon: '✅', status: 'success'},
			);
		});

		it('should add error metadata for failed tool execution', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'get_weather', args: {location: 'NYC'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Weather tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'},
			);
		});
	});
});
