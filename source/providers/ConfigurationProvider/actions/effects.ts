import {useCallback, useEffect} from 'react';
import {ConfigurationState} from './state.js';
import {getConfigManager} from '../../../utils/config.js';
import {ChatModels} from '../../../config/llm.js';

const configManager = getConfigManager();

export const useConfigurationEffects = (
	setState: React.Dispatch<React.SetStateAction<ConfigurationState>>,
) => {
	// Load configuration on mount
	useEffect(() => {
		const loadConfig = async () => {
			try {
				const config = await configManager.load();

				// Get the display name for the selected model
				let selectedModelName =
					config.selectedModel || ChatModels.OPENAI_GPT_4_1_NANO;
				if (config.selectedModel) {
					const allModels = await configManager.getAllModels();
					const selectedModel = allModels.find(
						m => m.id === config.selectedModel,
					);
					if (selectedModel) {
						selectedModelName = selectedModel.config.name;
					}
				}

				setState(prev => ({
					...prev,
					selectedModel: selectedModelName,
					configLoaded: true,
				}));
			} catch (error) {
				setState(prev => ({
					...prev,
					configLoaded: true,
				}));
			}
		};

		loadConfig();
	}, [setState]);

	const selectModel = useCallback(
		async (model: any) => {
			try {
				await configManager.setSelectedModel(model.id);
				setState(prev => ({
					...prev,
					selectedModel: model.config.name,
				}));
				return {
					success: true,
					message: `Model changed to ${model.config.name}`,
				};
			} catch (error) {
				return {success: false, message: 'Error saving model selection'};
			}
		},
		[setState],
	);

	const resetConfig = useCallback(async () => {
		try {
			await configManager.reset();
			setState(prev => ({
				...prev,
				selectedModel: 'GPT-4.1 Nano',
			}));
			return {success: true, message: 'Configuration reset to defaults'};
		} catch (error) {
			return {success: false, message: 'Error resetting configuration'};
		}
	}, [setState]);

	return {
		selectModel,
		resetConfig,
	};
};
