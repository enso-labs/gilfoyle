import React, {createContext, useContext, useState} from 'react';
import {
	ConfigurationState,
	initialConfigurationState,
	useConfigurationEffects,
} from './actions/index.js';

interface ConfigurationContextType {
	state: ConfigurationState;
	selectModel: (model: any) => Promise<{success: boolean; message: string}>;
	resetConfig: () => Promise<{success: boolean; message: string}>;
}

const ConfigurationContext = createContext<
	ConfigurationContextType | undefined
>(undefined);

export function ConfigurationProvider({children}: {children: React.ReactNode}) {
	const [state, setState] = useState<ConfigurationState>(
		initialConfigurationState,
	);
	const effects = useConfigurationEffects(setState);

	return (
		<ConfigurationContext.Provider
			value={{
				state,
				...effects,
			}}
		>
			{children}
		</ConfigurationContext.Provider>
	);
}

export function useConfiguration() {
	const context = useContext(ConfigurationContext);
	if (!context) {
		throw new Error(
			'useConfiguration must be used within ConfigurationProvider',
		);
	}
	return context;
}
