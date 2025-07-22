import {getModel} from './llm.js';
import ChatModels from '../config/llm.js';
import {ToolIntent} from '../entities/tool.js';
import {TOOL_PROMPT} from '../config/prompt.js';

export async function classifyIntent(
	query: string,
	modelName?: string,
): Promise<ToolIntent[]> {
	const prompt = `
Analyze the following user query and identify if any tools should be executed. Return a JSON array of tool intents.

${TOOL_PROMPT}

User query: "${query}"

Respond with only the JSON array, no additional text.
  `;

	const messages = [{role: 'user', content: prompt}];

	const model = await getModel(modelName as ChatModels);
	const response = await model.invoke(messages);

	const content =
		typeof response.content === 'string'
			? response.content
			: JSON.stringify(response.content) ?? '[]';

	try {
		// Clean the response to remove any markdown formatting or extra text
		let cleanContent = content.trim();

		// Remove markdown code blocks if present
		if (cleanContent.startsWith('```json')) {
			cleanContent = cleanContent
				.replace(/^```json\s*/, '')
				.replace(/\s*```$/, '');
		} else if (cleanContent.startsWith('```')) {
			cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
		}

		// Extract JSON array if there's extra text
		const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			cleanContent = jsonMatch[0];
		}

		return JSON.parse(cleanContent);
	} catch (error) {
		console.error('Failed to parse LLM response:', content);
		console.error('Parse error:', error);

		// Return a safe fallback
		return [{intent: 'none', args: {}}];
	}
}
