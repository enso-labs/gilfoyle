import {agentLoop} from '@enso-labs/agent-core';
import ChatModels from '../../config/llm.js';
import {toolsArray} from '../tools/index.js';
import {Tool} from 'langchain/tools';

function handleEnv(test: boolean = false) {
	if (test) {
		process.env['NODE_ENV'] = 'test';
		process.env['OPENAI_API_KEY'] = 'test';
		process.env['ANTHROPIC_API_KEY'] = 'test';
		process.env['GOOGLE_API_KEY'] = 'test';
	}
}

describe.skip('Agent Utilities', () => {
	beforeAll(() => {
		handleEnv(true);
	});
	afterAll(() => {
		handleEnv();
	});
	it('should be able to create an agent', async () => {
		const result = await agentLoop({
			prompt: 'What is current dir?',
			model: ChatModels.OPENAI_GPT_4_1_NANO,
			tools: toolsArray as Tool[],
		});
		expect(result).toBeDefined();
	});
});
