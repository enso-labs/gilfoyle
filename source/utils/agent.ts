import {ThreadState} from './memory.js';
import {ChatModels} from '../config/llm.js';
import {agentMemory} from './memory.js';
import {classifyIntent} from './classify.js';
import {tools} from './tools.js';

export async function agentLoop(
	query: string,
	state: ThreadState,
	model: ChatModels = ChatModels.OPENAI_GPT_4_1_MINI,
) {
	// Tool execution - classify all tools from the input at once
	const toolIntents = await classifyIntent(query, model.toString());

	// Execute all identified tools
	for (const toolIntent of toolIntents) {
		const {intent, args} = toolIntent;

		if (intent === 'none') {
			// No tools to execute, continue to LLM response
			continue;
		}

		if (intent in tools) {
			let toolOutput: string;

			// Execute the specific tool
			if (intent === 'get_weather' && 'location' in args) {
				toolOutput = tools.get_weather(args as {location: string});
			} else {
				toolOutput = `Invalid arguments for tool: ${intent}`;
			}

			// Add tool execution as an event
			state = await agentMemory(intent, toolOutput, state);
		}
	}
	return state;
}
