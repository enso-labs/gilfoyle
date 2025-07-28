import {executeTools} from '../agent.js';
import {agentMemory, ThreadState} from '../memory.js';
import {tools} from '../tools/index.js';
import {ToolIntent} from '../../entities/tool.js';

// Mock the dependencies
jest.mock('../memory.js', () => ({
	agentMemory: jest.fn(),
}));

jest.mock('../tools/index.js', () => ({
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

describe('executeTools', () => {
	let mockState: ThreadState;
	let mockAgentMemory: jest.MockedFunction<typeof agentMemory>;
	let mockTools: jest.Mocked<typeof tools>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Setup mock state
		mockState = {
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

		// Setup mocked functions
		mockAgentMemory = agentMemory as jest.MockedFunction<typeof agentMemory>;
		mockTools = tools as jest.Mocked<typeof tools>;

		// Default agentMemory mock - returns updated state
		mockAgentMemory.mockImplementation(async (intent, content, state, metadata) => ({
			...state,
			thread: {
				...state.thread,
				events: [
					...state.thread.events,
					{
						intent: typeof intent === 'string' ? intent : intent.intent,
						content,
						metadata: metadata || {},
						...(typeof intent !== 'string' && intent.args ? {args: intent.args} : {}),
					},
				],
			},
		}));
	});

	describe('tool execution', () => {
		it('should skip tools with "none" intent', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'none', args: {}},
			];

			const result = await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).not.toHaveBeenCalled();
			expect(result).toBe(mockState);
		});

		it('should execute web_search tool successfully', async () => {
			const mockSearchResult = 'Search results for test query';
			mockTools.web_search.mockResolvedValue(mockSearchResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test query'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.web_search).toHaveBeenCalledWith({query: 'test query'});
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockSearchResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute math_calculator tool successfully', async () => {
			const mockCalculationResult = '2 + 2 = 4';
			mockTools.math_calculator.mockReturnValue(mockCalculationResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'math_calculator', args: {expression: '2 + 2'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.math_calculator).toHaveBeenCalledWith({expression: '2 + 2'});
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockCalculationResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute file_search tool successfully', async () => {
			const mockFileSearchResult = 'Found 3 files matching pattern';
			mockTools.file_search.mockResolvedValue(mockFileSearchResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'file_search', args: {pattern: '*.ts', directory: './src'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.file_search).toHaveBeenCalledWith({pattern: '*.ts', directory: './src'});
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockFileSearchResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute read_file tool successfully', async () => {
			const mockFileContent = 'File content here';
			mockTools.read_file.mockResolvedValue(mockFileContent);

			const toolIntents: ToolIntent[] = [
				{intent: 'read_file', args: {filepath: './test.txt'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.read_file).toHaveBeenCalledWith({filepath: './test.txt'});
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockFileContent,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute create_file tool successfully', async () => {
			const mockCreateResult = 'File created successfully';
			mockTools.create_file.mockResolvedValue(mockCreateResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'create_file', args: {filepath: './new.txt', content: 'Hello World'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.create_file).toHaveBeenCalledWith({filepath: './new.txt', content: 'Hello World'});
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockCreateResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute git_status tool successfully', async () => {
			const mockGitResult = 'Git status output';
			mockTools.git_status.mockResolvedValue(mockGitResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'git_status', args: {}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.git_status).toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockGitResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute pwd tool successfully', async () => {
			const mockPwdResult = '/current/directory';
			mockTools.pwd.mockReturnValue(mockPwdResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'pwd', args: {}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.pwd).toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockPwdResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});

		it('should execute terminal_command tool successfully', async () => {
			const mockCommandResult = 'Command output';
			mockTools.terminal_command.mockResolvedValue(mockCommandResult);

			const toolIntents: ToolIntent[] = [
				{intent: 'terminal_command', args: {command: 'ls -la', timeout: 5000}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.terminal_command).toHaveBeenCalledWith({command: 'ls -la', timeout: 5000});
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				mockCommandResult,
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});
	});

	describe('unimplemented tools', () => {
		it('should handle get_weather tool (not implemented)', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'get_weather', args: {location: 'New York'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Weather tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle get_stock_info tool (not implemented)', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'get_stock_info', args: {ticker: 'AAPL'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Stock info tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle npm_info tool (not implemented)', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'npm_info', args: {package: 'react'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'NPM info tool is not implemented yet.',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});
	});

	describe('error handling', () => {
		it('should handle missing query parameter for web_search', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.web_search).not.toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Missing query parameter for web search tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle missing expression parameter for math_calculator', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'math_calculator', args: {}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.math_calculator).not.toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Missing expression parameter for calculator tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle missing pattern parameter for file_search', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'file_search', args: {}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.file_search).not.toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Missing pattern parameter for file search tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle missing filepath parameter for read_file', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'read_file', args: {}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.read_file).not.toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Missing filepath parameter for read file tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle missing parameters for create_file', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'create_file', args: {filepath: './test.txt'}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.create_file).not.toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Missing filepath or content parameter for create file tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle missing command parameter for terminal_command', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'terminal_command', args: {}} as ToolIntent,
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.terminal_command).not.toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Missing command parameter for terminal command tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle unknown tool intent', async () => {
			const toolIntents: ToolIntent[] = [
				{intent: 'unknown_tool', args: {}} as any,
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Unknown tool: unknown_tool',
				expect.any(Object),
				{icon: '❌', status: 'error'}
			);
		});

		it('should handle tool execution errors', async () => {
			const errorMessage = 'Tool execution failed';
			mockTools.web_search.mockRejectedValue(new Error(errorMessage));

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				`Tool execution failed: ${errorMessage}`,
				expect.any(Object)
			);
		});

		it('should handle non-Error exceptions', async () => {
			mockTools.web_search.mockRejectedValue('String error');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockAgentMemory).toHaveBeenCalledWith(
				toolIntents[0],
				'Tool execution failed: Unknown error',
				expect.any(Object)
			);
		});
	});

	describe('multiple tool execution', () => {
		it('should execute multiple tools in sequence', async () => {
			mockTools.web_search.mockResolvedValue('Search result');
			mockTools.math_calculator.mockReturnValue('2 + 2 = 4');
			mockTools.pwd.mockReturnValue('/current/dir');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
				{intent: 'math_calculator', args: {expression: '2 + 2'}},
				{intent: 'pwd', args: {}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.web_search).toHaveBeenCalledWith({query: 'test'});
			expect(mockTools.math_calculator).toHaveBeenCalledWith({expression: '2 + 2'});
			expect(mockTools.pwd).toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledTimes(3);
		});

		it('should continue execution if one tool fails', async () => {
			mockTools.web_search.mockRejectedValue(new Error('Search failed'));
			mockTools.pwd.mockReturnValue('/current/dir');

			const toolIntents: ToolIntent[] = [
				{intent: 'web_search', args: {query: 'test'}},
				{intent: 'pwd', args: {}},
			];

			await executeTools(toolIntents, mockState);

			expect(mockTools.web_search).toHaveBeenCalled();
			expect(mockTools.pwd).toHaveBeenCalled();
			expect(mockAgentMemory).toHaveBeenCalledTimes(2);
			
			// Check that error was logged for first tool
			expect(mockAgentMemory).toHaveBeenNthCalledWith(1,
				toolIntents[0],
				'Tool execution failed: Search failed',
				expect.any(Object)
			);
			
			// Check that second tool executed successfully
			expect(mockAgentMemory).toHaveBeenNthCalledWith(2,
				toolIntents[1],
				'/current/dir',
				expect.any(Object),
				{icon: '✅', status: 'success'}
			);
		});
	});

	describe('state updates', () => {
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
			mockTools.pwd.mockReturnValue('/test/dir');

			const toolIntents: ToolIntent[] = [
				{intent: 'pwd', args: {}},
			];

			const result = await executeTools(toolIntents, mockState);

			expect(result).toBe(updatedState);
		});
		
	});
});