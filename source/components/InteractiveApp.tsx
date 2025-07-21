import {useState, useCallback, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import HomePage from './HomePage.js';
import ModelSelection from './ModelSelection.js';
import ApiConfig from './ApiConfig.js';
import {getConfigManager} from '../utils/config.js';
import {
	agentLoop,
	initializeAgent,
	compactConversation,
	exportConversation,
	AgentResponse,
} from '../utils/agent.js';
import {ThreadState} from '../utils/memory.js';
import {promises as fs} from 'fs';
import ChatModels from '../config/llm.js';

type AppState = {
	currentView:
		| 'home'
		| 'help'
		| 'editor'
		| 'models'
		| 'init'
		| 'compact'
		| 'export'
		| 'api-config'
		| 'chat';
	input: string;
	history: string[];
	status: string;
	selectedModel?: string;
	configLoaded: boolean;
	agentState?: ThreadState;
	isProcessing: boolean;
	exportProgress?: string;
	compactProgress?: string;
	initProgress?: string;
	processedEventCount?: number;
};

type InteractiveAppProps = {
	name?: string;
	version?: string;
};

export default function InteractiveApp({name, version}: InteractiveAppProps) {
	const {exit} = useApp();
	const [state, setState] = useState<AppState>({
		currentView: 'home',
		input: '',
		history: [],
		status: 'Loading configuration...',
		selectedModel: 'GPT-4.1 Nano',
		configLoaded: false,
		isProcessing: false,
		processedEventCount: 0,
	});

	// Load configuration on startup
	useEffect(() => {
		const loadConfig = async () => {
			try {
				const configManager = getConfigManager();
				const config = await configManager.load();

				// Update user name in config if provided via CLI
				if (name && name !== config.user?.name) {
					await configManager.setUser({name});
				}

				// Get the display name for the selected model
				let selectedModelName = config.selectedModel || ChatModels.OPENAI_GPT_4_1_NANO;
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
	}, [name]);

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
				case '/editor':
					setState(prev => ({
						...prev,
						currentView: 'editor',
						status: 'Editor Mode',
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

						const configManager = getConfigManager();
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
- Use \`/compact\` to summarize long conversations
- Use \`/export\` to save conversation history
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
						const configManager = getConfigManager();
						await configManager.reset();
						setState(prev => ({
							...prev,
							selectedModel: 'GPT-4.1 Nano',
							status: 'Configuration reset to defaults',
							history: [...prev.history, 'Configuration reset to defaults'],
							agentState: undefined, // Reset agent state
							processedEventCount: 0,
						}));
					} catch (error) {
						setState(prev => ({
							...prev,
							status: 'Error resetting configuration',
						}));
					}
					break;
				case '/compact':
					if (!state.agentState) {
						setState(prev => ({
							...prev,
							status: 'No agent session to compact',
							history: [...prev.history, 'Initialize agent first with /init'],
						}));
						break;
					}

					setState(prev => ({
						...prev,
						currentView: 'compact',
						status: 'Compacting Session',
						isProcessing: true,
						compactProgress: 'Analyzing conversation history...',
					}));

					try {
						setState(prev => ({
							...prev,
							compactProgress: 'Generating conversation summary...',
						}));

						const compactedState = await compactConversation(state.agentState);

						setState(prev => ({
							...prev,
							compactProgress: 'Optimizing memory usage...',
						}));

						// Simulate a brief delay for UX
						await new Promise(resolve => setTimeout(resolve, 1000));

						setState(prev => ({
							...prev,
							agentState: compactedState,
							processedEventCount: compactedState.thread.events.length,
							isProcessing: false,
							compactProgress: 'Session compacted successfully!',
							status: 'Compaction Complete',
							history: [
								...prev.history,
								`Conversation compacted: ${compactedState.thread.events.length} events processed`,
							],
						}));
					} catch (error) {
						setState(prev => ({
							...prev,
							isProcessing: false,
							compactProgress: `Compaction failed: ${
								error instanceof Error ? error.message : 'Unknown error'
							}`,
							status: 'Compaction Error',
						}));
					}
					break;
				case '/export':
					if (!state.agentState) {
						setState(prev => ({
							...prev,
							status: 'No agent session to export',
							history: [...prev.history, 'Initialize agent first with /init'],
						}));
						break;
					}

					setState(prev => ({
						...prev,
						currentView: 'export',
						status: 'Exporting Conversation',
						isProcessing: true,
						exportProgress: 'Preparing conversation data...',
					}));

					try {
						setState(prev => ({
							...prev,
							exportProgress: 'Formatting conversation history...',
						}));

						const configManager = getConfigManager();
						const config = await configManager.load();
						const exportFormat = config.export?.format || 'markdown';

						const exportContent = await exportConversation(
							state.agentState,
							exportFormat,
						);

						setState(prev => ({
							...prev,
							exportProgress: 'Saving to file...',
						}));

						const filename = `gilfoyle-export-${new Date()
							.toISOString()
							.slice(0, 19)
							.replace(/:/g, '-')}.${exportFormat}`;
						await fs.writeFile(filename, exportContent, 'utf8');

						setState(prev => ({
							...prev,
							isProcessing: false,
							exportProgress: `Exported to ${filename}`,
							status: 'Export Complete',
							history: [
								...prev.history,
								`Conversation exported to ${filename}`,
							],
						}));
					} catch (error) {
						setState(prev => ({
							...prev,
							isProcessing: false,
							exportProgress: `Export failed: ${
								error instanceof Error ? error.message : 'Unknown error'
							}`,
							status: 'Export Error',
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
					// Handle agent conversation
					if (state.currentView === 'chat' && state.agentState) {
						setState(prev => ({
							...prev,
							isProcessing: true,
							status: 'Processing...',
						}));

						try {
							const response: AgentResponse = await agentLoop(
								command,
								state.agentState,
							);

							setState(prev => {
								// Get only the NEW events since last interaction
								const allEvents = response.state.thread.events;
								const lastProcessedCount = prev.processedEventCount || 0;
								const newEvents = allEvents.slice(lastProcessedCount);
								
								// Extract tool events and llm_response events from the new events
								const newToolEvents = newEvents
									.filter(e => e.intent !== 'user_input' && e.intent !== 'llm_response');
								const llmResponseEvent = newEvents
									.find(e => e.intent === 'llm_response');
								
								// Build history with each new tool as individual message in order
								const newHistoryItems = [...prev.history];
								
								// Add each new tool event individually with output
								newToolEvents.forEach(event => {
									const toolOutput = event.content ? ` → ${event.content}` : '';
									newHistoryItems.push(`🛠️  Tool: ${event.intent} ${event.metadata?.icon} ${toolOutput}`);
								});
								
								// Extract model information from llm_response event
								const modelUsed = llmResponseEvent?.metadata?.model || 'Unknown';
								
								// Then add assistant response with model information
								newHistoryItems.push(`🤖 Assistant (${modelUsed}): ${response.content}\n---`);

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
					} else {
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
		[exit, state.agentState],
	);

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

	const handleModelSelect = useCallback(async (model: any) => {
		try {
			const configManager = getConfigManager();
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

	const handleBackToHome = useCallback(() => {
		setState(prev => ({
			...prev,
			currentView: 'home',
			status: 'Ready',
		}));
	}, []);

	const renderCurrentView = () => {
		switch (state.currentView) {
			case 'api-config':
				return <ApiConfig onBack={handleBackToHome} />;
			case 'models':
				return (
					<ModelSelection
						onSelect={handleModelSelect}
						onBack={handleBackToHome}
					/>
				);
			case 'help':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Help - Available Commands:
						</Text>
						<Text color="green">/help</Text>
						<Text> Show this help message</Text>
						<Text color="green">/chat</Text>
						<Text> Start conversing with the AI agent</Text>
						<Text color="green">/editor</Text>
						<Text> Open the text editor</Text>
						<Text color="green">/models</Text>
						<Text> List available AI models</Text>
						<Text color="green">/init</Text>
						<Text> Initialize agent and create AGENTS.md</Text>
						<Text color="green">/compact</Text>
						<Text> Compact and summarize conversation history</Text>
						<Text color="green">/export</Text>
						<Text> Export conversation to file</Text>
						<Text color="green">/home</Text>
						<Text> Return to home screen</Text>
						<Text color="green">clear</Text>
						<Text> Clear command history</Text>
						<Text color="green">exit/quit</Text>
						<Text> Exit the application</Text>
						<Text color="green">/config</Text>
						<Text> Show configuration file location</Text>
						<Text color="green">/reset-config</Text>
						<Text> Reset configuration to defaults</Text>
						<Text color="green">/api-config</Text>
						<Text> Configure API keys for model providers</Text>
						<Box marginTop={1}>
							<Text color="gray">Press ESC to return home</Text>
						</Box>
					</Box>
				);
			case 'editor':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Editor Mode
						</Text>
						<Text>Text editor functionality would go here.</Text>
						<Text color="gray">Press ESC to return home</Text>
					</Box>
				);
			case 'chat':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Chat with Agent
						</Text>
						{state.agentState && (
							<Box marginY={1}>
								<Text color="cyan">
									Agent ready! Type your message below and press Enter.
								</Text>
								<Text color="gray" dimColor>
									Token usage: {state.agentState.thread.usage.total_tokens}{' '}
									total
								</Text>
							</Box>
						)}
						{state.isProcessing && (
							<Box marginY={1}>
								<Text color="yellow">🤖 Agent is thinking...</Text>
							</Box>
						)}
						<Box marginTop={1}>
							<Text color="gray">Press ESC to return home</Text>
						</Box>
					</Box>
				);
			case 'init':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Initialize Agent
						</Text>
						{state.isProcessing ? (
							<Box flexDirection="column" marginY={1}>
								<Text color="cyan">{state.initProgress}</Text>
								<Text color="yellow">⏳ Processing...</Text>
							</Box>
						) : (
							<Box flexDirection="column" marginY={1}>
								<Text color="green">✓ {state.initProgress}</Text>
								<Text color="cyan">Agent is ready for use!</Text>
							</Box>
						)}
						<Box marginTop={1}>
							<Text color="gray">Press ESC to return home</Text>
						</Box>
					</Box>
				);
			case 'compact':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Compacting Session
						</Text>
						{state.isProcessing ? (
							<Box flexDirection="column" marginY={1}>
								<Text color="cyan">{state.compactProgress}</Text>
								<Text color="yellow">⏳ Processing...</Text>
							</Box>
						) : (
							<Box flexDirection="column" marginY={1}>
								<Text color="green">✓ {state.compactProgress}</Text>
								<Text color="cyan">Memory has been optimized!</Text>
							</Box>
						)}
						<Box marginTop={1}>
							<Text color="gray">Press ESC to return home</Text>
						</Box>
					</Box>
				);
			case 'export':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Export Conversation
						</Text>
						{state.isProcessing ? (
							<Box flexDirection="column" marginY={1}>
								<Text color="cyan">{state.exportProgress}</Text>
								<Text color="yellow">⏳ Processing...</Text>
							</Box>
						) : (
							<Box flexDirection="column" marginY={1}>
								<Text color="green">✓ {state.exportProgress}</Text>
								<Text color="cyan">Export completed successfully!</Text>
							</Box>
						)}
						<Box marginTop={1}>
							<Text color="gray">Press ESC to return home</Text>
						</Box>
					</Box>
				);
			default:
				return <HomePage name={name} version={version} />;
		}
	};

	return (
		<Box flexDirection="column">
			{renderCurrentView()}

			{/* Only show command history and input when not in specialized views */}
			{state.currentView !== 'models' && state.currentView !== 'api-config' && (
				<>
					{/* Command History */}
					{state.history.length > 0 && (
						<Box flexDirection="column" marginY={1}>
							<Text color="gray" bold>
								Command History:
							</Text>
							<Box flexDirection="column" marginLeft={1}>
								{state.history.slice(-5).map((item, index) => (
									<Text key={index} color="#f1f1f1" dimColor>
										{item}
									</Text>
								))}
							</Box>
						</Box>
					)}

					{/* Input Section */}
					<Box borderStyle="round" borderColor="cyan" paddingX={1} marginY={1}>
						<Text color="cyan">$ </Text>
						<Text>{state.input}</Text>
						<Text color="gray">_</Text>
					</Box>
				</>
			)}

			{/* Status Bar */}
			<Box
				borderStyle="round"
				borderColor="blue"
				paddingX={1}
				flexDirection="row"
				justifyContent="space-between"
			>
				<Box>
					<Text color="blue">Status: </Text>
					<Text color="green">{state.status}</Text>
				</Box>
				<Box>
					<Text color="blue">Model: </Text>
					<Text color="cyan">{state.selectedModel}</Text>
				</Box>
				{name && (
					<Box>
						<Text color="blue">User: </Text>
						<Text color="magenta">{name}</Text>
					</Box>
				)}
				<Box>
					<Text color="gray" dimColor>
						Ctrl+C to exit
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
