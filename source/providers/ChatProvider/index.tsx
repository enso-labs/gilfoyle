import React, {createContext, useContext, useState} from 'react';
import {ChatState, initialChatState, useChatEffects} from './actions/index.js';

interface ChatContextType {
	state: ChatState;
	initAgent: () => Promise<{
		success: boolean;
		agentState?: any;
		message: string;
	}>;
	processChatMessage: (
		userInput: string,
		agentState: any,
	) => Promise<{success: boolean; response?: string; message?: string}>;
	addToHistory: (message: string) => void;
	clearHistory: () => void;
	resetAgent: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({children}: {children: React.ReactNode}) {
	const [state, setState] = useState<ChatState>(initialChatState);
	const effects = useChatEffects(setState);

	return (
		<ChatContext.Provider
			value={{
				state,
				...effects,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
}

export function useChat() {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error('useChat must be used within ChatProvider');
	}
	return context;
}
