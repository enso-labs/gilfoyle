export type AppStateState = {
	status: string;
	initProgress?: string;
};

export const initialAppStateState: AppStateState = {
	status: 'Loading configuration...',
	initProgress: undefined,
};
