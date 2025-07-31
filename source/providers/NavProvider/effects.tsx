import {useCallback} from 'react';
import {NavigationState} from './state.js';

export const useNavigationEffects = (
	setState: React.Dispatch<React.SetStateAction<NavigationState>>,
) => {
	const navigateToHome = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'home',
		}));
	}, [setState]);

	const navigateToHelp = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'help',
		}));
	}, [setState]);

	const navigateToModels = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'models',
		}));
	}, [setState]);

	const navigateToApiConfig = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'api-config',
		}));
	}, [setState]);

	const navigateToConfig = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'config',
		}));
	}, [setState]);

	const navigateToChat = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'chat',
		}));
	}, [setState]);

	const navigateToInit = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'init',
		}));
	}, [setState]);

	return {
		navigateToHome,
		navigateToHelp,
		navigateToModels,
		navigateToApiConfig,
		navigateToConfig,
		navigateToChat,
		navigateToInit,
	};
};
