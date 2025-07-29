export type ConfigurationState = {
	selectedModel?: string;
	configLoaded: boolean;
};

export const initialConfigurationState: ConfigurationState = {
	selectedModel: undefined,
	configLoaded: false,
};
