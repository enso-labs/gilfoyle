import {ThreadState} from '../../../utils/memory.js';

export type ChatState = {
	agentState?: ThreadState;
	history: string[];
	isProcessing: boolean;
	processedEventCount: number;
};

export const initialChatState: ChatState = {
	agentState: undefined,
	history: [],
	isProcessing: false,
	processedEventCount: 0,
};
