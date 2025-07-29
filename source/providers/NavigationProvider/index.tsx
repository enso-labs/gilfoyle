import React, {createContext, useContext, useState} from 'react';
import {
	NavigationState,
	initialNavigationState,
	useNavigationEffects,
} from './actions/index.js';

interface NavigationContextType {
	state: NavigationState;
	navigateToHome: () => void;
	navigateToHelp: () => void;
	navigateToModels: () => void;
	navigateToApiConfig: () => void;
	navigateToConfig: () => void;
	navigateToChat: () => void;
	navigateToInit: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
	undefined,
);

export function NavigationProvider({children}: {children: React.ReactNode}) {
	const [state, setState] = useState<NavigationState>(initialNavigationState);
	const effects = useNavigationEffects(setState);

	return (
		<NavigationContext.Provider
			value={{
				state,
				...effects,
			}}
		>
			{children}
		</NavigationContext.Provider>
	);
}

export function useNavigation() {
	const context = useContext(NavigationContext);
	if (!context) {
		throw new Error('useNavigation must be used within NavigationProvider');
	}
	return context;
}
