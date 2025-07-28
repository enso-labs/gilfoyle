import {BaseChatModel} from '@langchain/core/language_models/chat_models';
import ChatModels from '../config/llm.js';
import {initChatModel} from 'langchain/chat_models/universal';

export async function getModel(modelName?: ChatModels): Promise<BaseChatModel> {
	if (!modelName) {
		modelName = ChatModels.OPENAI_GPT_4_1_NANO;
	}
	const modelNameString = modelName.toString();
	const model = await initChatModel(modelNameString, {
		// temperature: 0.7,
	});
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
