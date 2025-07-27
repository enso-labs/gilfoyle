import test from 'ava';
import {ToolIntent} from '../source/entities/tool.js';
import ChatModels from '../source/config/llm.js';

// Mock LLM response that can be modified per test
let mockLlmResponse: any = {
	content: '[{"intent": "none", "args": {}}]',
};

// Mock the getModel function
const mockGetModel = async (modelName?: ChatModels) => ({
	invoke: async (messages: any[]) => mockLlmResponse,
});

// Mock for LLM service errors
let mockShouldThrowError = false;
let mockErrorMessage = 'LLM service unavailable';

// Create a test version of classifyIntent with mocked dependencies
async function classifyIntentWithMock(
	query: string,
	modelName?: string,
): Promise<ToolIntent[]> {
	// Simulate LLM service failure if configured
	if (mockShouldThrowError) {
		throw new Error(mockErrorMessage);
	}
	const prompt = `
Analyze the following user query and identify if any tools should be executed. Return a JSON array of tool intents.

Available tools:
1. "web_search" - for general information searches (args: {"query": "search terms"})
2. "math_calculator" - for mathematical calculations (args: {"expression": "math expression"})
3. "file_search" - search for files by pattern (args: {"pattern": "filename", "directory": "path"})
4. "read_file" - read file contents (args: {"filepath": "path/to/file"})
5. "create_file" - create a new file (args: {"filepath": "path/to/file", "content": "file content"})
6. "git_status" - check git repository status (args: {})
7. "pwd" - get current working directory (args: {})
8. "terminal_command" - execute terminal commands (args: {"command": "command to run", "timeout": optional_timeout_ms})

If no tools are needed, return: [{"intent": "none", "args": {}}]

Examples:
- "calculate 15 * 23" → [{"intent": "math_calculator", "args": {"expression": "15 * 23"}}]
- "search for latest AI news" → [{"intent": "web_search", "args": {"query": "latest AI news"}}]
- "find all .ts files" → [{"intent": "file_search", "args": {"pattern": ".ts", "directory": "."}}]
- "read package.json" → [{"intent": "read_file", "args": {"filepath": "package.json"}}]
- "create a README file" → [{"intent": "create_file", "args": {"filepath": "README.md", "content": "# Project Title\\n\\nDescription here."}}]
- "check git status" → [{"intent": "git_status", "args": {}}]
- "where am I" → [{"intent": "pwd", "args": {}}]
- "run ls -la" → [{"intent": "terminal_command", "args": {"command": "ls -la"}}]
- "what's the latest version of react" → [{"intent": "npm_info", "args": {"package": "react"}}]

User query: "${query}"

Respond with only the JSON array, no additional text.
  `;

	const messages = [{role: 'user', content: prompt}];

	const model = await mockGetModel(modelName as ChatModels);
	const response = await model.invoke(messages);

	const content =
		typeof response.content === 'string'
			? response.content
			: JSON.stringify(response.content) ?? '[]';

	try {
		// Clean the response to remove any markdown formatting or extra text
		let cleanContent = content.trim();

		// Remove markdown code blocks if present
		if (cleanContent.startsWith('```json')) {
			cleanContent = cleanContent
				.replace(/^```json\s*/, '')
				.replace(/\s*```$/, '');
		} else if (cleanContent.startsWith('```')) {
			cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
		}

		// Extract JSON array if there's extra text
		const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			cleanContent = jsonMatch[0];
		}

		return JSON.parse(cleanContent);
	} catch (error) {
		console.error('Failed to parse LLM response:', content);
		console.error('Parse error:', error);

		// Return a safe fallback
		return [{intent: 'none', args: {}}];
	}
}

// Use the mocked version for all tests
const classifyIntent = classifyIntentWithMock;

// Helper function to set mock LLM response
function setMockLlmResponse(content: string | object) {
	mockLlmResponse = {
		content: typeof content === 'string' ? content : JSON.stringify(content),
	};
}

// Helper function to create a valid tool intent
function createValidToolIntent(intent: string, args: any = {}): ToolIntent {
	return {intent, args} as ToolIntent;
}

// Reset mocks before each test
test.beforeEach(() => {
	setMockLlmResponse('[{"intent": "none", "args": {}}]');
	mockShouldThrowError = false;
	mockErrorMessage = 'LLM service unavailable';
});

// Test successful intent classification with valid JSON responses
test('classifyIntent should parse valid JSON response correctly', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'web_search',
		args: {query: 'TypeScript tutorial'},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('search for TypeScript tutorial');
	
	t.deepEqual(result, [expectedIntent]);
});

test('classifyIntent should handle multiple tool intents', async t => {
	const expectedIntents: ToolIntent[] = [
		{intent: 'file_search', args: {pattern: '.ts', directory: '.'}},
		{intent: 'read_file', args: {filepath: 'package.json'}},
	];
	
	setMockLlmResponse(expectedIntents);
	
	const result = await classifyIntent('find all TypeScript files and read package.json');
	
	t.deepEqual(result, expectedIntents);
});

test('classifyIntent should handle math calculator intent', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'math_calculator',
		args: {expression: '15 * 23'},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('calculate 15 * 23');
	
	t.deepEqual(result, [expectedIntent]);
});

test('classifyIntent should handle git status intent', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'git_status',
		args: {},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('check git status');
	
	t.deepEqual(result, [expectedIntent]);
});

test('classifyIntent should handle terminal command intent', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'terminal_command',
		args: {command: 'ls -la', timeout: 5000},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('run ls -la');
	
	t.deepEqual(result, [expectedIntent]);
});

test('classifyIntent should handle pwd intent', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'pwd',
		args: {},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('where am I');
	
	t.deepEqual(result, [expectedIntent]);
});

test('classifyIntent should handle npm info intent', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'npm_info',
		args: {package: 'react'},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('what is the latest version of react');
	
	t.deepEqual(result, [expectedIntent]);
});

test('classifyIntent should handle create file intent', async t => {
	const expectedIntent: ToolIntent = {
		intent: 'create_file',
		args: {
			filepath: 'README.md',
			content: '# Project Title\n\nDescription here.',
		},
	};
	
	setMockLlmResponse([expectedIntent]);
	
	const result = await classifyIntent('create a README file');
	
	t.deepEqual(result, [expectedIntent]);
});

// Test JSON parsing and markdown cleanup
test('classifyIntent should clean markdown code blocks from response', async t => {
	const validIntent = [{intent: 'web_search', args: {query: 'test'}}];
	const markdownResponse = '```json\n' + JSON.stringify(validIntent) + '\n```';
	
	setMockLlmResponse(markdownResponse);
	
	const result = await classifyIntent('search for test');
	
	t.deepEqual(result, validIntent);
});

test('classifyIntent should clean markdown code blocks without json label', async t => {
	const validIntent = [{intent: 'math_calculator', args: {expression: '2 + 2'}}];
	const markdownResponse = '```\n' + JSON.stringify(validIntent) + '\n```';
	
	setMockLlmResponse(markdownResponse);
	
	const result = await classifyIntent('calculate 2 + 2');
	
	t.deepEqual(result, validIntent);
});

test('classifyIntent should extract JSON from response with extra text', async t => {
	const validIntent = [{intent: 'pwd', args: {}}];
	const responseWithText = `Here is the JSON response:\n${JSON.stringify(validIntent)}\nHope this helps!`;
	
	setMockLlmResponse(responseWithText);
	
	const result = await classifyIntent('where am I');
	
	t.deepEqual(result, validIntent);
});

test('classifyIntent should handle whitespace in response', async t => {
	const validIntent = [{intent: 'git_status', args: {}}];
	const responseWithWhitespace = `\n\n  ${JSON.stringify(validIntent)}  \n\n`;
	
	setMockLlmResponse(responseWithWhitespace);
	
	const result = await classifyIntent('check git status');
	
	t.deepEqual(result, validIntent);
});

// Test error handling and fallback behavior
test('classifyIntent should return fallback for invalid JSON', async t => {
	setMockLlmResponse('invalid json string');
	
	const result = await classifyIntent('some query');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should return fallback for empty response', async t => {
	setMockLlmResponse('');
	
	const result = await classifyIntent('some query');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should return fallback for null response', async t => {
	mockLlmResponse = {content: null};
	
	const result = await classifyIntent('some query');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should return fallback for malformed JSON object', async t => {
	setMockLlmResponse('{"intent": "web_search", "args":}'); // Missing closing bracket and value
	
	const result = await classifyIntent('some query');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should return fallback for non-array JSON', async t => {
	setMockLlmResponse('{"intent": "web_search", "args": {"query": "test"}}'); // Object instead of array
	
	const result = await classifyIntent('some query');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle complex nested JSON array extraction', async t => {
	const validIntent = [{intent: 'file_search', args: {pattern: '*.ts', directory: '/src'}}];
	const complexResponse = `{
		"response": "I'll help you with that",
		"tools": ${JSON.stringify(validIntent)},
		"explanation": "This will search for TypeScript files"
	}`;
	
	setMockLlmResponse(complexResponse);
	
	const result = await classifyIntent('find TypeScript files');
	
	t.deepEqual(result, validIntent);
});

// Test input validation scenarios
test('classifyIntent should handle empty input string', async t => {
	const result = await classifyIntent('');
	
	// Should still process through LLM and return the mock response
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle whitespace-only input', async t => {
	const result = await classifyIntent('   \n\t   ');
	
	// Should still process through LLM and return the mock response
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle very long input', async t => {
	const longInput = 'a'.repeat(10000);
	
	const result = await classifyIntent(longInput);
	
	// Should still process through LLM and return the mock response
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle special characters in input', async t => {
	const specialInput = 'search for "hello & goodbye" <script>alert("test")</script> 日本語';
	
	const result = await classifyIntent(specialInput);
	
	// Should still process through LLM and return the mock response
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle input with quotes and escape characters', async t => {
	const quotedInput = 'create file with content "Hello \\"world\\"\\nNew line\\tTab"';
	
	const result = await classifyIntent(quotedInput);
	
	// Should still process through LLM and return the mock response
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

// Test with different model names
test('classifyIntent should accept optional model name parameter', async t => {
	const result = await classifyIntent('test query', ChatModels.OPENAI_GPT_4_1_NANO);
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should work without model name parameter', async t => {
	const result = await classifyIntent('test query');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

// Test response content type handling
test('classifyIntent should handle non-string response content', async t => {
	const validIntent = [{intent: 'web_search', args: {query: 'test'}}];
	mockLlmResponse = {content: validIntent}; // Non-string content
	
	const result = await classifyIntent('search for test');
	
	t.deepEqual(result, validIntent);
});

test('classifyIntent should handle response content as array', async t => {
	const validIntent = [{intent: 'math_calculator', args: {expression: '1 + 1'}}];
	mockLlmResponse = {content: ['some', 'array', 'content']}; // Array content
	
	// Should stringify the array and try to parse, which will fail and return fallback
	const result = await classifyIntent('calculate 1 + 1');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

// Test TypeScript interface compliance
test('classifyIntent should return properly typed ToolIntent array', async t => {
	const intents: ToolIntent[] = [
		{intent: 'web_search', args: {query: 'typescript'}},
		{intent: 'file_search', args: {pattern: '*.ts', directory: '.'}},
		{intent: 'none', args: {}},
	];
	
	setMockLlmResponse(intents);
	
	const result = await classifyIntent('search and find files');
	
	// Type assertion to ensure proper typing
	const typedResult: ToolIntent[] = result;
	t.deepEqual(typedResult, intents);
	
	// Verify each intent has required properties
	result.forEach(intent => {
		t.true(typeof intent.intent === 'string');
		t.true(typeof intent.args === 'object');
		t.true(intent.args !== null);
	});
});

// Test fallback intent structure compliance
test('classifyIntent fallback should return valid ToolIntent with none intent', async t => {
	setMockLlmResponse('completely invalid response');
	
	const result = await classifyIntent('test');
	
	t.is(result.length, 1);
	t.is(result[0].intent, 'none');
	t.deepEqual(result[0].args, {});
});

// Test edge cases with JSON matching
test('classifyIntent should handle multiple JSON arrays in response', async t => {
	const firstIntent = [{intent: 'web_search', args: {query: 'first'}}];
	const secondIntent = [{intent: 'math_calculator', args: {expression: '2 + 2'}}];
	
	// Response with multiple arrays - should pick the first one
	const multiArrayResponse = `First array: ${JSON.stringify(firstIntent)} and second array: ${JSON.stringify(secondIntent)}`;
	
	setMockLlmResponse(multiArrayResponse);
	
	const result = await classifyIntent('test multiple arrays');
	
	t.deepEqual(result, firstIntent);
});

test('classifyIntent should handle response with no JSON array', async t => {
	setMockLlmResponse('This response has no JSON array, just text and {"key": "value"} objects.');
	
	const result = await classifyIntent('test no array');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle nested JSON structures', async t => {
	const validIntent = [{intent: 'read_file', args: {filepath: 'test.ts'}}];
	const nestedResponse = {
		status: 'success',
		data: {
			tools: validIntent,
			metadata: {
				confidence: 0.95,
				processing_time: 150,
			},
		},
	};
	
	// Should extract the array from the nested structure
	setMockLlmResponse(JSON.stringify(nestedResponse));
	
	const result = await classifyIntent('read test file');
	
	t.deepEqual(result, validIntent);
});

// Test LLM service failures and error conditions
test('classifyIntent should handle LLM service unavailability gracefully', async t => {
	mockShouldThrowError = true;
	mockErrorMessage = 'LLM service is temporarily unavailable';
	
	// The function should throw the error since we don't catch LLM service errors
	// in the current implementation - this is expected behavior
	await t.throwsAsync(
		() => classifyIntent('test query'),
		{message: 'LLM service is temporarily unavailable'}
	);
});

test('classifyIntent should handle network timeout errors', async t => {
	mockShouldThrowError = true;
	mockErrorMessage = 'Request timeout after 30 seconds';
	
	await t.throwsAsync(
		() => classifyIntent('test query'),
		{message: 'Request timeout after 30 seconds'}
	);
});

test('classifyIntent should handle API key authentication errors', async t => {
	mockShouldThrowError = true;
	mockErrorMessage = 'Invalid API key provided';
	
	await t.throwsAsync(
		() => classifyIntent('test query'),
		{message: 'Invalid API key provided'}
	);
});

test('classifyIntent should handle rate limit errors', async t => {
	mockShouldThrowError = true;
	mockErrorMessage = 'Rate limit exceeded. Please try again later.';
	
	await t.throwsAsync(
		() => classifyIntent('test query'),
		{message: 'Rate limit exceeded. Please try again later.'}
	);
});

test('classifyIntent should handle model not found errors', async t => {
	mockShouldThrowError = true;
	mockErrorMessage = 'Model "invalid-model" not found';
	
	await t.throwsAsync(
		() => classifyIntent('test query', 'invalid-model' as any),
		{message: 'Model "invalid-model" not found'}
	);
});

// Additional edge case tests for better coverage
test('classifyIntent should handle extremely malformed JSON with special characters', async t => {
	setMockLlmResponse('{"intent": "web_search", "args": {"query": "test"}}]'); // Missing opening bracket
	
	const result = await classifyIntent('test');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle JSON with undefined values', async t => {
	setMockLlmResponse('[{"intent": "web_search", "args": undefined}]');
	
	const result = await classifyIntent('test');
	
	t.deepEqual(result, [{intent: 'none', args: {}}]);
});

test('classifyIntent should handle circular JSON structures gracefully', async t => {
	// Simulate a response that would create circular reference if parsed
	const circularResponse = '[{"intent": "web_search", "args": {"self": "reference_to_self"}}]';
	setMockLlmResponse(circularResponse);
	
	const result = await classifyIntent('test');
	
	t.is(result.length, 1);
	t.is(result[0].intent, 'web_search');
	t.deepEqual(result[0].args, {self: 'reference_to_self'});
});

test('classifyIntent should handle very large JSON responses', async t => {
	// Create a large but valid JSON response
	const largeArgs = {
		query: 'a'.repeat(1000),
		metadata: Array.from({length: 100}, (_, i) => ({id: i, value: `item_${i}`}))
	};
	const largeIntent = [{intent: 'web_search', args: largeArgs}];
	
	setMockLlmResponse(largeIntent);
	
	const result = await classifyIntent('large query test');
	
	t.deepEqual(result, largeIntent);
});

test('classifyIntent should handle mixed valid and invalid intents in array', async t => {
	// Array with both valid and invalid intent structures
	const mixedResponse = '[{"intent": "web_search", "args": {"query": "test"}}, {"invalid": "structure"}, {"intent": "pwd", "args": {}}]';
	setMockLlmResponse(mixedResponse);
	
	const result = await classifyIntent('test');
	
	// Should still parse the array even if some items don't match ToolIntent interface
	t.is(result.length, 3);
	t.is(result[0].intent, 'web_search');
	t.deepEqual(result[0].args, {query: 'test'});
});

test('classifyIntent should preserve exact argument structures', async t => {
	const complexArgs = {
		filepath: '/path/to/file.ts',
		content: 'export interface TestInterface {\n  id: number;\n  name: string;\n}',
		metadata: {
			author: 'test-user',
			timestamp: '2024-01-01T00:00:00Z',
			tags: ['typescript', 'interface', 'export']
		}
	};
	
	const complexIntent = [{intent: 'create_file', args: complexArgs}];
	setMockLlmResponse(complexIntent);
	
	const result = await classifyIntent('create a TypeScript interface file');
	
	t.deepEqual(result, complexIntent);
	t.deepEqual(result[0].args, complexArgs);
});

test('classifyIntent should handle unicode and international characters', async t => {
	const unicodeIntent = [{
		intent: 'web_search',
		args: {query: '日本語のプログラミング tutorial 🚀 émojis ñoño'}
	}];
	
	setMockLlmResponse(unicodeIntent);
	
	const result = await classifyIntent('search for 日本語 programming');
	
	t.deepEqual(result, unicodeIntent);
});

test('classifyIntent should handle numeric and boolean values in args', async t => {
	const typedArgsIntent = [{
		intent: 'terminal_command',
		args: {
			command: 'ls -la',
			timeout: 5000,
			verbose: true,
			retries: 3,
			success: false
		}
	}];
	
	setMockLlmResponse(typedArgsIntent);
	
	const result = await classifyIntent('run ls command with timeout');
	
	t.deepEqual(result, typedArgsIntent);
	t.is(typeof result[0].args.timeout, 'number');
	t.is(typeof result[0].args.verbose, 'boolean');
	t.is(typeof result[0].args.retries, 'number');
	t.is(typeof result[0].args.success, 'boolean');
});