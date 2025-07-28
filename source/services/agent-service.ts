import { agentLoop } from "../utils/agent.js";
import { ThreadState } from "../utils/memory.js";

export class AgentService {
	constructor(
		private readonly state: ThreadState,
	) {}

	async run(query: string) {
		const result = await agentLoop(query, this.state);
		return result;
	}	
}