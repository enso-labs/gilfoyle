import React, {createContext, useContext, useState} from 'react';
import {
	CommandState,
	initialCommandState,
	useCommandEffects,
} from './actions/index.js';

interface CommandContextType {
	state: CommandState;
	processCommand: (
		command: string,
	) => Promise<{success: boolean; message?: string}>;
}

interface CommandProviderProps {
	children: React.ReactNode;
	onNavigate: (view: string) => void;
	onChatInput: (input: string) => Promise<void>;
	onInitAgent: () => Promise<{success: boolean; message: string}>;
	onResetConfig: () => Promise<{success: boolean; message: string}>;
	onClearHistory: () => void;
	onExit: () => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export function CommandProvider({
	children,
	onNavigate,
	onChatInput,
	onInitAgent,
	onResetConfig,
	onClearHistory,
	onExit,
}: CommandProviderProps) {
	const [state, setState] = useState<CommandState>(initialCommandState);
	const effects = useCommandEffects(setState, {
		onNavigate,
		onChatInput,
		onInitAgent,
		onResetConfig,
		onClearHistory,
		onExit,
	});

	return (
		<CommandContext.Provider
			value={{
				state,
				...effects,
			}}
		>
			{children}
		</CommandContext.Provider>
	);
}

export function useCommand() {
	const context = useContext(CommandContext);
	if (!context) {
		throw new Error('useCommand must be used within CommandProvider');
	}
	return context;
}
