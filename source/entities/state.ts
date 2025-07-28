import {ThreadState} from '../utils/memory.js';

export type AppState = {
	currentView:
		| 'home'
		| 'help'
		| 'models'
		| 'init'
		| 'api-config'
		| 'chat'
		| 'config';
	history: string[];
	status: string;
	selectedModel?: string;
	configLoaded: boolean;
	agentState?: ThreadState;
	isProcessing: boolean;
	initProgress?: string;
	processedEventCount?: number;
};

export type InteractiveAppProps = {
	name?: string;
	version?: string;
};
