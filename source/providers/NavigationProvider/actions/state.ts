export type NavigationState = {
	currentView:
		| 'home'
		| 'help'
		| 'models'
		| 'init'
		| 'api-config'
		| 'chat'
		| 'config';
};

export const initialNavigationState: NavigationState = {
	currentView: 'home',
};
