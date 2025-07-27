import {
	useContext,
	createContext,
	useState,
	useCallback,
	useEffect,
} from 'react';
import {useInput, useApp} from 'ink';
import {AppState} from '../../entities/state.js';
import {ChatModels} from '../../config/llm.js';
import {getConfigManager} from '../../utils/config.js';
import {agentLoop, initializeAgent, AgentResponse} from '../../utils/agent.js';
import {promises as fs} from 'fs';

const configManager = getConfigManager();
export const AppContext = createContext({});

export default function AppProvider({children}: {children: React.ReactNode}) {
	const {exit} = useApp();

	const [state, setState] = useState<AppState>({
		currentView: 'home',
		input: '',
		history: [],
		status: 'Loading configuration...',
		selectedModel: ChatModels.OPENAI_GPT_4_1_NANO,
		configLoaded: false,
		isProcessing: false,
		processedEventCount: 0,
	});

	// Load configuration on startup
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
					status: 'Ready',
					configLoaded: true,
				}));
			} catch (error) {
				setState(prev => ({
					...prev,
					status: 'Error loading configuration',
					configLoaded: true,
				}));
			}
		};

		loadConfig();
	}, []);

	const handleBackToHome = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'home',
			status: 'Ready',
		}));
	}, []);

	const handleModelSelect = useCallback(async (model: any) => {
		try {
			await configManager.setSelectedModel(model.id);

			setState(prev => ({
				...prev,
				selectedModel: model.config.name,
				currentView: 'home',
				status: `Model changed to ${model.config.name}`,
				history: [...prev.history, `Selected model: ${model.config.name}`],
			}));
		} catch (error) {
			setState(prev => ({
				...prev,
				status: 'Error saving model selection',
			}));
		}
	}, []);

	const handleChatInput = useCallback(
		async (userInput: string) => {
			// Initialize agent if not already initialized
			if (!state.agentState) {
				try {
					const newAgentState = await initializeAgent();
					setState(prev => ({
						...prev,
						currentView: 'chat',
						status: 'Chat Mode - Ready',
						agentState: newAgentState,
						processedEventCount: 0,
						history: [...prev.history, 'Agent initialized successfully'],
					}));

					// Process the user input with the newly initialized agent
					await processChatMessage(userInput, newAgentState);
				} catch (error) {
					setState(prev => ({
						...prev,
						status: 'Failed to initialize agent',
						history: [
							...prev.history,
							`Error: ${
								error instanceof Error ? error.message : 'Unknown error'
							}`,
						],
					}));
				}
			} else {
				// Agent already initialized, switch to chat view and process message
				setState(prev => ({
					...prev,
					currentView: 'chat',
					status: 'Chat Mode - Ready',
				}));
				await processChatMessage(userInput, state.agentState);
			}
		},
		[state.agentState],
	);

	const processChatMessage = useCallback(
		async (userInput: string, agentState: any) => {
			setState(prev => ({
				...prev,
				isProcessing: true,
				status: 'Processing...',
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
						status: 'Chat Mode - Ready',
						history: newHistoryItems,
						processedEventCount: allEvents.length,
					};
				});
			} catch (error) {
				setState(prev => ({
					...prev,
					isProcessing: false,
					status: 'Chat Error',
					history: [
						...prev.history,
						`Error: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`,
					],
				}));
			}
		},
		[],
	);

	const handleCommand = useCallback(
		async (command: string) => {
			const trimmedCommand = command.trim().toLowerCase();

			setState(prev => ({
				...prev,
				history: [...prev.history, `👤 User: ${command}`],
				input: '',
			}));

			switch (trimmedCommand) {
				case '/config':
					setState(prev => ({
						...prev,
						currentView: 'home',
						status: 'Config loaded',
						history: [
							...prev.history,
							`Config file: ${getConfigManager().getConfigPath()}`,
						],
					}));
					break;
				case '/api-config':
					setState(prev => ({
						...prev,
						currentView: 'api-config',
						status: 'Configuring API keys',
					}));
					break;
				case '/help':
					setState(prev => ({
						...prev,
						currentView: 'help',
						status: 'Viewing Help',
					}));
					break;
				case '/models':
					setState(prev => ({
						...prev,
						currentView: 'models',
						status: 'Listing Models',
					}));
					break;
				case '/chat':
					if (!state.agentState) {
						try {
							const newAgentState = await initializeAgent();
							setState(prev => ({
								...prev,
								currentView: 'chat',
								status: 'Chat Mode - Ready',
								agentState: newAgentState,
								processedEventCount: 0,
								history: [...prev.history, 'Agent initialized successfully'],
							}));
						} catch (error) {
							setState(prev => ({
								...prev,
								status: 'Failed to initialize agent',
								history: [
									...prev.history,
									`Error: ${
										error instanceof Error ? error.message : 'Unknown error'
									}`,
								],
							}));
						}
					} else {
						setState(prev => ({
							...prev,
							currentView: 'chat',
							status: 'Chat Mode - Ready',
						}));
					}
					break;
				case '/init':
					setState(prev => ({
						...prev,
						currentView: 'init',
						status: 'Initializing Agent',
						isProcessing: true,
						initProgress: 'Starting initialization...',
					}));

					try {
						setState(prev => ({
							...prev,
							initProgress: 'Checking configuration...',
						}));

						const config = await configManager.load();

						setState(prev => ({
							...prev,
							initProgress: 'Initializing agent memory and system prompts...',
						}));

						const newAgentState = await initializeAgent();

						setState(prev => ({
							...prev,
							initProgress: 'Creating AGENTS.md documentation...',
						}));

						// Create AGENTS.md file
						const agentsContent = `# AI Agent Configuration

## System Information
- **Agent Name**: Gilfoyle
- **Version**: ${config.version || '0.3.43'}
- **Selected Model**: ${config.selectedModel}
- **Initialized**: ${new Date().toISOString()}

## Configuration
- **Config File**: ${configManager.getConfigPath()}
- **User**: ${config.user?.name || 'Developer'}
- **Theme**: ${config.user?.preferences?.theme || 'dark'}

## Available Models
${(await configManager.getAllModels())
	.map(m => `- ${m.config.name} (${m.providerName})`)
	.join('\n')}

## Usage
- Use \`/chat\` to start a conversation with the agent
- Use \`/models\` to change the active model

Agent is ready for interaction!
`;

						await fs.writeFile('AGENTS.md', agentsContent, 'utf8');

						setState(prev => ({
							...prev,
							agentState: newAgentState,
							processedEventCount: 0,
							isProcessing: false,
							initProgress: 'Agent initialized successfully!',
							status: 'Initialization Complete',
							history: [
								...prev.history,
								'Agent initialized and AGENTS.md created',
							],
						}));
					} catch (error) {
						setState(prev => ({
							...prev,
							isProcessing: false,
							initProgress: `Initialization failed: ${
								error instanceof Error ? error.message : 'Unknown error'
							}`,
							status: 'Initialization Error',
						}));
					}
					break;
				case '/reset-config':
					try {
						await configManager.reset();
						setState(prev => ({
							...prev,
							selectedModel: 'GPT-4.1 Nano',
							status: 'Configuration reset to defaults',
							history: [...prev.history, 'Configuration reset to defaults'],
							agentState: undefined,
							processedEventCount: 0,
						}));
					} catch (error) {
						setState(prev => ({
							...prev,
							status: 'Error resetting configuration',
						}));
					}
					break;
				case '/home':
				case 'home':
					setState(prev => ({
						...prev,
						currentView: 'home',
						status: 'Ready',
					}));
					break;
				case 'exit':
				case 'quit':
				case '/exit':
				case '/quit':
					exit();
					break;
				case 'clear':
					setState(prev => ({
						...prev,
						history: [],
						processedEventCount: 0,
						status: 'Cleared',
					}));
					break;
				default:
					// If input doesn't start with "/", treat it as chat input
					if (!command.startsWith('/')) {
						await handleChatInput(command);
					} else {
						// Handle unknown slash commands
						setState(prev => ({
							...prev,
							history: [
								...prev.history,
								`Unknown command: ${command}. Type /help for available commands.`,
							],
							status: 'Error',
						}));
					}
			}
		},
		[exit, state.agentState, handleChatInput],
	);

	// Centralized input handling
	useInput((input, key) => {
		// Only handle input when not in specialized views
		if (state.currentView === 'models' || state.currentView === 'api-config') {
			return;
		}

		// Prevent input during processing
		if (state.isProcessing && key.return) {
			return;
		}

		if (key.ctrl && input === 'c') {
			exit();
			return;
		}

		if (key.return) {
			if (state.input.trim()) {
				handleCommand(state.input).catch(console.error);
			}
			return;
		}

		if (key.backspace || key.delete) {
			setState(prev => ({
				...prev,
				input: prev.input.slice(0, -1),
			}));
			return;
		}

		if (key.escape) {
			setState(prev => ({
				...prev,
				currentView: 'home',
				status: 'Ready',
			}));
			return;
		}

		// Regular character input (but not during processing)
		if (!state.isProcessing) {
			setState(prev => ({
				...prev,
				input: prev.input + input,
			}));
		}
	});

	return (
		<AppContext.Provider
			value={{
				state,
				setState,
				handleBackToHome,
				handleModelSelect,
				handleCommand,
			}}
		>
			{children}
		</AppContext.Provider>
	);
}

export function useAppContext(): any {
	return useContext(AppContext);
}
