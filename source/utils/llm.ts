import {BaseChatModel} from '@langchain/core/language_models/chat_models';
import ChatModels from '../config/llm.js';
import {initChatModel} from 'langchain/chat_models/universal';
import {getConfigManager} from './config.js';

let model: BaseChatModel | null = null;
let currentModelId: string | null = null;

export async function getModel(modelName?: ChatModels): Promise<BaseChatModel> {
	let selectedModel: string;

	if (modelName !== undefined) {
		selectedModel = modelName.toString();
	} else {
		// Get the selected model from config
		try {
			const configManager = getConfigManager();
			const config = await configManager.load();
			selectedModel = config.selectedModel || ChatModels.OPENAI_GPT_4_1_NANO;
		} catch (error) {
			// Fallback to default if config loading fails
			selectedModel = ChatModels.OPENAI_GPT_4_1_NANO;
		}
	}

	// Always create a new model instance if a specific model is requested or if the model changed
	if (
		modelName !== undefined ||
		model === null ||
		currentModelId !== selectedModel
	) {
		model = await initChatModel(selectedModel, {
			// temperature: 0.7,
		});
		currentModelId = selectedModel;
	}

	// TypeScript expects a non-null return, so ensure model is not null
	if (model === null) {
		throw new Error('Failed to initialize chat model.');
	}
	return model;
}

export async function callModel(
	ctxWindow: string,
	systemMessage: string,
	modelName?: ChatModels,
	stream: boolean = false,
): Promise<any> {
	// eslint-disable-line @typescript-eslint/no-explicit-any
	const messages = [
		{role: 'system', content: systemMessage},
		{role: 'user', content: ctxWindow},
	];

	const model = await getModel(modelName);
	if (stream) {
		return model.stream(messages);
	} else {
		return model.invoke(messages);
	}
}
