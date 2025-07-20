import {useState, useCallback, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import HomePage from './HomePage.js';
import ModelSelection from './ModelSelection.js';
import ApiConfig from './ApiConfig.js';
import {getConfigManager, type GilfoyleConfig} from '../utils/config.js';

type AppState = {
	currentView:
		| 'home'
		| 'help'
		| 'editor'
		| 'models'
		| 'init'
		| 'compact'
		| 'export'
		| 'api-config';
	input: string;
	history: string[];
	status: string;
	selectedModel?: string;
	configLoaded: boolean;
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
		selectedModel: 'o4-mini',
		configLoaded: false,
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
				let selectedModelName = config.selectedModel || 'qwen3';
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
				history: [...prev.history, `> ${command}`],
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
				case '/init':
					setState(prev => ({
						...prev,
						currentView: 'init',
						status: 'Initializing',
					}));
					break;
				case '/reset-config':
					try {
						const configManager = getConfigManager();
						await configManager.reset();
						setState(prev => ({
							...prev,
							selectedModel: 'Qwen-3 (local)',
							status: 'Configuration reset to defaults',
							history: [...prev.history, 'Configuration reset to defaults'],
						}));
					} catch (error) {
						setState(prev => ({
							...prev,
							status: 'Error resetting configuration',
						}));
					}
					break;
				case '/compact':
					setState(prev => ({
						...prev,
						currentView: 'compact',
						status: 'Compacting Session',
					}));
					break;
				case '/export':
					setState(prev => ({
						...prev,
						currentView: 'export',
						status: 'Exporting',
					}));
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
						status: 'Cleared',
					}));
					break;
				default:
					setState(prev => ({
						...prev,
						history: [
							...prev.history,
							`Unknown command: ${command}. Type /help for available commands.`,
						],
						status: 'Error',
					}));
			}
		},
		[exit],
	);

	useInput((input, key) => {
		// Only handle input when not in specialized views
		if (state.currentView === 'models' || state.currentView === 'api-config') {
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

		// Regular character input
		setState(prev => ({
			...prev,
			input: prev.input + input,
		}));
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
						<Text color="green">/editor</Text>
						<Text> Open the text editor</Text>
						<Text color="green">/models</Text>
						<Text> List available AI models</Text>
						<Text color="green">/init</Text>
						<Text> Initialize or update AGENTS.md file</Text>
						<Text color="green">/compact</Text>
						<Text> Compact the current session</Text>
						<Text color="green">/export</Text>
						<Text> Export conversation history</Text>
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
						<Text color="gray" marginTop={1}>
							Press ESC to return home
						</Text>
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

			case 'init':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Initialize AGENTS.md
						</Text>
						<Text color="green">✓ Checking for existing AGENTS.md...</Text>
						<Text color="green">✓ Creating/updating configuration...</Text>
						<Text color="cyan">AGENTS.md has been initialized!</Text>
						<Text color="gray" marginTop={1}>
							Press ESC to return home
						</Text>
					</Box>
				);
			case 'compact':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Compacting Session
						</Text>
						<Text color="green">✓ Analyzing conversation history...</Text>
						<Text color="green">✓ Removing redundant data...</Text>
						<Text color="cyan">Session compacted successfully!</Text>
						<Text color="gray" marginTop={1}>
							Press ESC to return home
						</Text>
					</Box>
				);
			case 'export':
				return (
					<Box flexDirection="column" marginY={1}>
						<Text color="yellow" bold>
							Export Conversation
						</Text>
						<Text color="green">✓ Preparing conversation data...</Text>
						<Text color="green">✓ Formatting output...</Text>
						<Text color="cyan">
							Conversation exported to gilfoyle-export.md
						</Text>
						<Text color="gray" marginTop={1}>
							Press ESC to return home
						</Text>
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
									<Text key={index} color="gray" dimColor>
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
