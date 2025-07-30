import {ThreadState} from '../memory.js';
import {agentLoop} from '../agent.js';
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
		const state: ThreadState = {
			thread: {
				usage: {
					prompt_tokens: 0,
					completion_tokens: 0,
					total_tokens: 0,
				},
				events: [],
			},
		};
		console.log(state);
		const result = await agentLoop(
			'What is current dir?',
			state,
			ChatModels.OPENAI_GPT_4_1_NANO,
			toolsArray as Tool[],
		);
		expect(result).toBeDefined();
		// expect(result.content).toBe('Hello');
	});
});
