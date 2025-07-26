import {useEffect} from 'react';
import {Box, Text} from 'ink';
import {getConfigManager} from '../utils/config.js';
import {InteractiveAppProps} from '../entities/state.js';
import {useAppContext} from '../providers/AppProvider/index.js';
import {
	HomePage,
	ModelSelection,
	ApiConfig,
	HelpView,
	ChatView,
	InitView,
} from '../views/index.js';

export default function InteractiveApp({name, version}: InteractiveAppProps) {
	const {state, handleModelSelect, handleBackToHome} = useAppContext();

	// Update user name in config if provided
	useEffect(() => {
		const updateUserName = async () => {
			if (name && state.configLoaded) {
				try {
					const configManager = getConfigManager();
					const config = await configManager.load();

					if (name !== config.user?.name) {
						await configManager.setUser({name});
					}
				} catch (error) {
					console.error('Error updating user name:', error);
				}
			}
		};

		updateUserName();
	}, [name, state.configLoaded]);

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
				return <HelpView />;
			case 'chat':
				return <ChatView />;
			case 'init':
				return <InitView />;
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
							<Box flexDirection="column" marginLeft={1} minHeight={5}>
								{state.history.slice(-9).map((item: string, index: number) => (
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
