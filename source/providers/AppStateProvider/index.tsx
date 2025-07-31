import React, {createContext, useContext, useState} from 'react';
import {
	AppStateState,
	initialAppStateState,
	useAppStateEffects,
} from './actions/index.js';

interface AppStateContextType {
	state: AppStateState;
	setStatus: (status: string) => void;
	setInitProgress: (progress?: string) => void;
	updateStatusFromResult: (result: {
		success: boolean;
		message?: string;
	}) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(
	undefined,
);

export function AppStateProvider({children}: {children: React.ReactNode}) {
	const [state, setState] = useState<AppStateState>(initialAppStateState);
	const effects = useAppStateEffects(setState);

	return (
		<AppStateContext.Provider
			value={{
				state,
				...effects,
			}}
		>
			{children}
		</AppStateContext.Provider>
	);
}

export function useAppState() {
	const context = useContext(AppStateContext);
	if (!context) {
		throw new Error('useAppState must be used within AppStateProvider');
	}
	return context;
}
