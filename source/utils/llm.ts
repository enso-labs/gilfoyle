import {BaseChatModel} from '@langchain/core/language_models/chat_models';
import ChatModels from '../config/llm.js';
import {initChatModel} from 'langchain/chat_models/universal';

let model: BaseChatModel | null = null;

export async function getModel(modelName?: ChatModels): Promise<BaseChatModel> {
	const selectedModel = modelName ?? ChatModels.OPENAI_GPT_4_1_MINI;

	// Always create a new model instance if a specific model is requested
	if (modelName !== undefined || model === null) {
		model = await initChatModel(selectedModel.toString(), {
			// temperature: 0.7,
		});
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
	modelName: ChatModels = ChatModels.OPENAI_GPT_4_1_MINI,
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
