import test from 'ava';
import {
	collectUsage,
	initializeAgent,
	exportConversation,
	executeTools,
	agentLoop,
	compactConversation,
} from '../source/utils/agent.js';
import type {ThreadState} from '../source/utils/memory.js';
import type {ToolIntent} from '../source/entities/tool.js';

// Create a test state helper
function createTestState(overrides: Partial<ThreadState> = {}): ThreadState {
	return {
		thread: {
			usage: {
				prompt_tokens: 10,
				completion_tokens: 5,
				total_tokens: 15,
			},
			systemMessage: 'Test system message',
			events: [
				{
					intent: 'user_input',
					content: 'Test user input',
					metadata: {},
				},
			],
		},
		...overrides,
	};
}

// ====== Tests for collectUsage function ======
test('collectUsage should return usage statistics from state', t => {
	const state = createTestState({
		thread: {
			usage: {
				prompt_tokens: 100,
				completion_tokens: 50,
				total_tokens: 150,
			},
			systemMessage: 'Test',
			events: [],
		},
	});
	
	const result = collectUsage(state);
	
	t.deepEqual(result, {
		prompt_tokens: 100,
		completion_tokens: 50,
		total_tokens: 150,
	});
});

test('collectUsage should handle zero usage', t => {
	const state = createTestState({
		thread: {
			usage: {
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			},
			systemMessage: 'Test',
			events: [],
		},
	});
	
	const result = collectUsage(state);
	
	t.deepEqual(result, {
		prompt_tokens: 0,
		completion_tokens: 0,
		total_tokens: 0,
	});
});

test('collectUsage should handle edge case values', t => {
	const state = createTestState({
		thread: {
			usage: {
				prompt_tokens: 999999,
				completion_tokens: 0,
				total_tokens: 999999,
			},
			systemMessage: 'Test',
			events: [],
		},
	});
	
	const result = collectUsage(state);
	
	t.is(result.prompt_tokens, 999999);
	t.is(result.completion_tokens, 0);
	t.is(result.total_tokens, 999999);
});

test('collectUsage should preserve exact values', t => {
	const expectedUsage = {
		prompt_tokens: 12345,
		completion_tokens: 6789,
		total_tokens: 19134,
	};
	
	const state = createTestState({
		thread: {
			usage: expectedUsage,
			systemMessage: 'Test',
			events: [],
		},
	});
	
	const result = collectUsage(state);
	
	t.deepEqual(result, expectedUsage);
	t.not(result, expectedUsage); // Should be a copy, not the same object
});

// ====== Tests for initializeAgent function ======
test('initializeAgent should create initial state with default system prompt', async t => {
	const result = await initializeAgent();
	
	t.is(result.thread.usage.prompt_tokens, 0);
	t.is(result.thread.usage.completion_tokens, 0);
	t.is(result.thread.usage.total_tokens, 0);
	t.is(result.thread.events.length, 0);
	t.is(typeof result.thread.systemMessage, 'string');
	t.true(result.thread.systemMessage!.length > 0);
});

test('initializeAgent should use custom system prompt when provided', async t => {
	const customPrompt = 'Custom system prompt for testing';
	const result = await initializeAgent(customPrompt);
	
	t.is(result.thread.systemMessage, customPrompt);
	t.is(result.thread.usage.prompt_tokens, 0);
	t.is(result.thread.usage.completion_tokens, 0);
	t.is(result.thread.usage.total_tokens, 0);
	t.is(result.thread.events.length, 0);
});

test('initializeAgent should create valid ThreadState structure', async t => {
	const result = await initializeAgent();
	
	t.true('thread' in result);
	t.true('usage' in result.thread);
	t.true('systemMessage' in result.thread);
	t.true('events' in result.thread);
	t.true(Array.isArray(result.thread.events));
	t.is(typeof result.thread.usage.prompt_tokens, 'number');
	t.is(typeof result.thread.usage.completion_tokens, 'number');
	t.is(typeof result.thread.usage.total_tokens, 'number');
});

test('initializeAgent should handle multiple calls independently', async t => {
	const state1 = await initializeAgent('Prompt 1');
	const state2 = await initializeAgent('Prompt 2');
	
	// Should create independent states
	t.not(state1, state2);
	t.is(state1.thread.systemMessage, 'Prompt 1');
	t.is(state2.thread.systemMessage, 'Prompt 2');
	
	// Both should have clean initial state
	t.deepEqual(state1.thread.usage, {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0});
	t.deepEqual(state2.thread.usage, {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0});
});

test('initializeAgent should handle empty string prompt', async t => {
	const result = await initializeAgent('');
	
	t.is(result.thread.systemMessage, '');
	t.is(result.thread.events.length, 0);
	t.deepEqual(result.thread.usage, {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0});
});

// ====== Tests for exportConversation function ======
test('exportConversation should export conversation in markdown format', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150},
			systemMessage: 'Test system message',
			events: [
				{intent: 'user_input', content: 'Hello', metadata: {}},
				{intent: 'llm_response', content: 'Hi there', metadata: {}},
			],
		},
	});
	
	const result = await exportConversation(state, 'markdown');
	
	t.true(result.includes('# Gilfoyle Conversation Export'));
	t.true(result.includes('**Total Events:** 2'));
	t.true(result.includes('**Token Usage:** 150 tokens'));
	t.true(result.includes('### user_input'));
	t.true(result.includes('Hello'));
	t.true(result.includes('### llm_response'));
	t.true(result.includes('Hi there'));
});

test('exportConversation should export conversation in JSON format', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150},
			systemMessage: 'Test system message',
			events: [
				{intent: 'user_input', content: 'Hello', metadata: {}},
				{intent: 'llm_response', content: 'Hi there', metadata: {}},
			],
		},
	});
	
	const result = await exportConversation(state, 'json');
	
	const parsed = JSON.parse(result);
	t.is(parsed.totalEvents, 2);
	t.deepEqual(parsed.tokenUsage, {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150});
	t.is(parsed.systemMessage, 'Test system message');
	t.is(parsed.events.length, 2);
	t.is(parsed.events[0].intent, 'user_input');
	t.is(parsed.events[0].content, 'Hello');
});

test('exportConversation should export conversation in text format', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150},
			systemMessage: 'Test system message',
			events: [
				{intent: 'user_input', content: 'Hello', metadata: {}},
				{intent: 'llm_response', content: 'Hi there', metadata: {}},
			],
		},
	});
	
	const result = await exportConversation(state, 'txt');
	
	t.true(result.includes('Gilfoyle Conversation Export'));
	t.true(result.includes('Total Events: 2'));
	t.true(result.includes('Token Usage: 150 tokens'));
	t.true(result.includes('[user_input] Hello'));
	t.true(result.includes('[llm_response] Hi there'));
});

test('exportConversation should default to markdown format', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150},
			systemMessage: 'Test system message',
			events: [
				{intent: 'user_input', content: 'Hello', metadata: {}},
			],
		},
	});
	
	const result = await exportConversation(state);
	
	t.true(result.includes('# Gilfoyle Conversation Export'));
	t.true(result.includes('### user_input'));
});

test('exportConversation should throw error for unsupported format', async t => {
	const state = createTestState();
	
	await t.throwsAsync(
		async () => await exportConversation(state, 'xml' as any),
		{message: 'Unsupported export format: xml'}
	);
});

test('exportConversation should handle empty events list', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0},
			systemMessage: 'Test system message',
			events: [],
		},
	});
	
	const result = await exportConversation(state, 'markdown');
	
	t.true(result.includes('# Gilfoyle Conversation Export'));
	t.true(result.includes('**Total Events:** 0'));
	t.true(result.includes('**Token Usage:** 0 tokens'));
});

test('exportConversation should include timestamp in export', async t => {
	const state = createTestState();
	
	const result = await exportConversation(state, 'json');
	const parsed = JSON.parse(result);
	
	t.true('exported' in parsed);
	t.true(new Date(parsed.exported).getTime() > 0);
});

test('exportConversation should handle large event lists', async t => {
	const largeEventList = Array.from({length: 1000}, (_, i) => ({
		intent: `event_${i}`,
		content: `Content for event ${i}`,
		metadata: {index: i},
	}));
	
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500},
			systemMessage: 'Large test',
			events: largeEventList,
		},
	});
	
	const result = await exportConversation(state, 'json');
	const parsed = JSON.parse(result);
	
	t.is(parsed.totalEvents, 1000);
	t.is(parsed.events.length, 1000);
	t.is(parsed.events[999].intent, 'event_999');
	t.is(parsed.events[999].content, 'Content for event 999');
});

test('exportConversation should handle special characters in content', async t => {
	const specialContent = 'Content with "quotes", \\backslashes\\, and \n newlines \t tabs';
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 10, completion_tokens: 5, total_tokens: 15},
			systemMessage: 'Special char test',
			events: [
				{intent: 'special_test', content: specialContent, metadata: {}},
			],
		},
	});
	
	const json = await exportConversation(state, 'json');
	const parsed = JSON.parse(json);
	
	t.is(parsed.events[0].content, specialContent);
	
	const markdown = await exportConversation(state, 'markdown');
	t.true(markdown.includes(specialContent));
	
	const txt = await exportConversation(state, 'txt');
	t.true(txt.includes(specialContent));
});

test('exportConversation formats should be consistent', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150},
			systemMessage: 'Test system message',
			events: [
				{intent: 'user_input', content: 'Test message', metadata: {}},
			],
		},
	});
	
	const markdown = await exportConversation(state, 'markdown');
	const json = await exportConversation(state, 'json');
	const txt = await exportConversation(state, 'txt');
	
	// All formats should contain the message content
	t.true(markdown.includes('Test message'));
	t.true(json.includes('Test message'));
	t.true(txt.includes('Test message'));
	
	// All formats should contain usage information
	t.true(markdown.includes('150 tokens'));
	t.true(json.includes('"total_tokens": 150'));
	t.true(txt.includes('150 tokens'));
	
	// JSON should be valid
	const parsed = JSON.parse(json);
	t.is(parsed.totalEvents, 1);
	t.is(parsed.tokenUsage.total_tokens, 150);
});

// ====== Tests for executeTools function ======
test('executeTools should handle no tool intents gracefully', async t => {
	const toolIntents: ToolIntent[] = [];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	// Should return the state unchanged when no tools to execute
	t.deepEqual(result.thread.usage, state.thread.usage);
	t.is(result.thread.systemMessage, state.thread.systemMessage);
});

test('executeTools should handle none intent', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'none', args: {}}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	// Should skip none intent and return state unchanged
	t.deepEqual(result.thread.usage, state.thread.usage);
	t.is(result.thread.systemMessage, state.thread.systemMessage);
});

test('executeTools should handle unimplemented tools (weather)', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'get_weather', args: {location: 'NYC'}}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	// Should add an event indicating the tool is not implemented
	t.true(result.thread.events.length > state.thread.events.length);
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'get_weather');
	t.true(lastEvent.content.includes('not implemented yet'));
});

test('executeTools should handle unimplemented tools (stock)', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'get_stock_info', args: {ticker: 'AAPL'}}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'get_stock_info');
	t.true(lastEvent.content.includes('not implemented yet'));
});

test('executeTools should handle unimplemented tools (npm)', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'npm_info', args: {package: 'react'}}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'npm_info');
	t.true(lastEvent.content.includes('not implemented yet'));
});

test('executeTools should handle missing parameters for web_search', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'web_search', args: {} as any}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'web_search');
	t.true(lastEvent.content.includes('Missing query parameter'));
});

test('executeTools should handle missing parameters for math_calculator', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'math_calculator', args: {} as any}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'math_calculator');
	t.true(lastEvent.content.includes('Missing expression parameter'));
});

test('executeTools should handle missing parameters for terminal_command', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'terminal_command', args: {} as any}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'terminal_command');
	t.true(lastEvent.content.includes('Missing command parameter'));
});

test('executeTools should handle unknown tool intent', async t => {
	const toolIntents: ToolIntent[] = [{intent: 'unknown_tool' as any, args: {}}];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	const lastEvent = result.thread.events[result.thread.events.length - 1];
	t.is(lastEvent.intent, 'unknown_tool');
	t.true(lastEvent.content.includes('Unknown tool'));
});

test('executeTools should handle multiple tool intents', async t => {
	const toolIntents: ToolIntent[] = [
		{intent: 'pwd', args: {}},
		{intent: 'git_status', args: {}},
		{intent: 'get_weather', args: {location: 'NYC'}},
	];
	const state = createTestState();
	
	const result = await executeTools(toolIntents, state);
	
	// Should process all three tools
	t.is(result.thread.events.length, state.thread.events.length + 3);
	
	// Check that all three intents were processed
	const addedEvents = result.thread.events.slice(state.thread.events.length);
	t.is(addedEvents[0].intent, 'pwd');
	t.is(addedEvents[1].intent, 'git_status');
	t.is(addedEvents[2].intent, 'get_weather');
});

// ====== Tests for compactConversation function ======
test('compactConversation should return original state for short conversations', async t => {
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 10, completion_tokens: 5, total_tokens: 15},
			systemMessage: 'Test',
			events: [
				{intent: 'user_input', content: 'Hello', metadata: {}},
				{intent: 'llm_response', content: 'Hi there', metadata: {}},
			],
		},
	});
	
	const result = await compactConversation(state);
	
	// For conversations with 5 or fewer events, should return original state
	t.deepEqual(result, state);
});

test('compactConversation should preserve usage and system message', async t => {
	const longEvents = Array.from({length: 10}, (_, i) => ({
		intent: i % 2 === 0 ? 'user_input' : 'llm_response',
		content: `Message ${i}`,
		metadata: {},
	}));
	
	const state = createTestState({
		thread: {
			usage: {prompt_tokens: 100, completion_tokens: 50, total_tokens: 150},
			systemMessage: 'Test system message',
			events: longEvents,
		},
	});
	
	const result = await compactConversation(state);
	
	// Usage and system message should be preserved
	t.deepEqual(result.thread.usage, state.thread.usage);
	t.is(result.thread.systemMessage, state.thread.systemMessage);
});

// ====== Tests for agentLoop function ======
// Note: These are integration tests that require external dependencies
// Testing basic structure and error handling without mocking

test('agentLoop should be a function that accepts required parameters', t => {
	t.is(typeof agentLoop, 'function');
	
	// Should be able to call the function (though it may fail due to missing dependencies)
	const query = 'test query';
	const state = createTestState();
	
	// Just test that the function call structure is correct
	const result = agentLoop(query, state);
	t.true(result instanceof Promise);
});

// ====== Data integrity and type safety tests ======
test('ThreadState should maintain type safety', t => {
	const state = createTestState();
	
	// Verify required properties exist and have correct types
	t.is(typeof state.thread.usage.prompt_tokens, 'number');
	t.is(typeof state.thread.usage.completion_tokens, 'number');
	t.is(typeof state.thread.usage.total_tokens, 'number');
	t.is(typeof state.thread.systemMessage, 'string');
	t.true(Array.isArray(state.thread.events));
	
	// Verify event structure
	if (state.thread.events.length > 0) {
		const event = state.thread.events[0];
		t.is(typeof event.intent, 'string');
		t.is(typeof event.content, 'string');
		t.is(typeof event.metadata, 'object');
	}
});

test('createTestState helper should create valid state structure', t => {
	const state = createTestState();
	
	t.true('thread' in state);
	t.true('usage' in state.thread);
	t.true('systemMessage' in state.thread);
	t.true('events' in state.thread);
	t.true(Array.isArray(state.thread.events));
	t.is(state.thread.events.length, 1);
	t.is(state.thread.events[0].intent, 'user_input');
});

test('createTestState should allow overrides', t => {
	const overrides = {
		thread: {
			usage: {prompt_tokens: 999, completion_tokens: 888, total_tokens: 1887},
			systemMessage: 'Override message',
			events: [],
		},
	};
	
	const state = createTestState(overrides);
	
	t.is(state.thread.usage.prompt_tokens, 999);
	t.is(state.thread.usage.completion_tokens, 888);
	t.is(state.thread.usage.total_tokens, 1887);
	t.is(state.thread.systemMessage, 'Override message');
	t.is(state.thread.events.length, 0);
});

// ====== Function existence and signature tests ======
test('agent utility functions should be importable', t => {
	t.is(typeof collectUsage, 'function');
	t.is(typeof initializeAgent, 'function');
	t.is(typeof exportConversation, 'function');
	t.is(typeof executeTools, 'function');
	t.is(typeof agentLoop, 'function');
	t.is(typeof compactConversation, 'function');
});

test('async functions should return promises', async t => {
	// Test that async functions return promises
	const initPromise = initializeAgent();
	t.true(initPromise instanceof Promise);
	
	const state = await initPromise;
	const exportPromise = exportConversation(state);
	t.true(exportPromise instanceof Promise);
	
	const result = await exportPromise;
	t.is(typeof result, 'string');
});

// ====== Edge cases and error handling ======
test('functions should handle null/undefined inputs appropriately', async t => {
	// Test exportConversation with minimal state
	const minimalState: ThreadState = {
		thread: {
			usage: {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0},
			systemMessage: '',
			events: [],
		},
	};
	
	const result = await exportConversation(minimalState);
	t.is(typeof result, 'string');
	t.true(result.includes('Gilfoyle Conversation Export'));
});

test('collectUsage should work with various numeric values', t => {
	const testCases = [
		{prompt_tokens: 0, completion_tokens: 0, total_tokens: 0},
		{prompt_tokens: 1, completion_tokens: 1, total_tokens: 2},
		{prompt_tokens: 999999999, completion_tokens: 999999999, total_tokens: 1999999998},
	];
	
	testCases.forEach(usage => {
		const state = createTestState({
			thread: {
				usage,
				systemMessage: 'Test',
				events: [],
			},
		});
		
		const result = collectUsage(state);
		t.deepEqual(result, usage);
	});
});

test('initializeAgent should handle various prompt types', async t => {
	const prompts = [
		undefined,
		'',
		'Simple prompt',
		'Multi\nline\nprompt',
		'Prompt with special characters: @#$%^&*()',
		'Very long prompt '.repeat(100),
	];
	
	for (const prompt of prompts) {
		const result = await initializeAgent(prompt);
		t.is(typeof result.thread.systemMessage, 'string');
		t.is(result.thread.events.length, 0);
		t.deepEqual(result.thread.usage, {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0});
	}
});