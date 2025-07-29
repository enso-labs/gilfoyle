import {useCallback} from 'react';
import {ChatState} from './state.js';
import {
	initializeAgent,
	agentLoop,
	AgentResponse,
} from '../../../utils/agent.js';
import {getConfigManager} from '../../../utils/config.js';
import {ChatModels} from '../../../config/llm.js';

const configManager = getConfigManager();

export const useChatEffects = (
	setState: React.Dispatch<React.SetStateAction<ChatState>>,
) => {
	const initAgent = useCallback(async () => {
		try {
			const newAgentState = await initializeAgent();
			setState(prev => ({
				...prev,
				agentState: newAgentState,
				processedEventCount: 0,
			}));
			return {
				success: true,
				agentState: newAgentState,
				message: 'Agent initialized successfully',
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to initialize agent: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			};
		}
	}, [setState]);

	const processChatMessage = useCallback(
		async (userInput: string, agentState: any) => {
			setState(prev => ({
				...prev,
				isProcessing: true,
			}));

			try {
				const config = await configManager.load();
				const response: AgentResponse = await agentLoop(
					userInput,
					agentState,
					config.selectedModel as ChatModels,
				);

				setState(prev => {
					// Get only the NEW events since last interaction
					const allEvents = response.state.thread.events;
					const lastProcessedCount = prev.processedEventCount;
					const newEvents = allEvents.slice(lastProcessedCount);

					// Extract tool events and llm_response events from the new events
					const newToolEvents = newEvents.filter(
						e => e.intent !== 'user_input' && e.intent !== 'llm_response',
					);
					const llmResponseEvent = newEvents.find(
						e => e.intent === 'llm_response',
					);

					// Build history with each new tool as individual message in order
					const newHistoryItems = [...prev.history];

					// Add each new tool event individually with output
					newToolEvents.forEach(event => {
						const toolOutput = event.content ? ` → ${event.content}` : '';
						newHistoryItems.push(
							`🛠️  Tool: ${event.intent} ${event.metadata?.icon} ${toolOutput}`,
						);
					});

					// Extract model information from llm_response event
					const modelUsed = llmResponseEvent?.metadata?.model || 'Unknown';

					// Then add assistant response with model information
					newHistoryItems.push(
						`🤖 Assistant (${modelUsed}): ${response.content}\n---`,
					);

					return {
						...prev,
						agentState: response.state,
						isProcessing: false,
						history: newHistoryItems,
						processedEventCount: allEvents.length,
					};
				});

				return {success: true, response: response.content};
			} catch (error) {
				setState(prev => ({
					...prev,
					isProcessing: false,
				}));

				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				setState(prev => ({
					...prev,
					history: [...prev.history, `Error: ${errorMessage}`],
				}));

				return {success: false, message: errorMessage};
			}
		},
		[setState],
	);

	const addToHistory = useCallback(
		(message: string) => {
			setState(prev => ({
				...prev,
				history: [...prev.history, message],
			}));
		},
		[setState],
	);

	const clearHistory = useCallback(() => {
		setState(prev => ({
			...prev,
			history: [],
			processedEventCount: 0,
		}));
	}, [setState]);

	const resetAgent = useCallback(() => {
		setState(prev => ({
			...prev,
			agentState: undefined,
			processedEventCount: 0,
		}));
	}, [setState]);

	return {
		initAgent,
		processChatMessage,
		addToHistory,
		clearHistory,
		resetAgent,
	};
};
