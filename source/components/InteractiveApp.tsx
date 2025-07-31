import {useEffect} from 'react';
import {Box, Text} from 'ink';
import {getConfigManager} from '../utils/config.js';
import {InteractiveAppProps} from '../entities/state.js';
import {useNavigation} from '../providers/NavigationProvider/index.js';
import {useConfiguration} from '../providers/ConfigurationProvider/index.js';
import {useAppState} from '../providers/AppStateProvider/index.js';
import {useChat} from '../providers/ChatProvider/index.js';
import ChatInput from './ChatInput.js';
import {
	HomePage,
	ModelSelection,
	ApiConfig,
	ConfigView,
	HelpView,
	ChatView,
	InitView,
} from '../views/index.js';

export default function InteractiveApp({name, version}: InteractiveAppProps) {
	const navigation = useNavigation();
	const configuration = useConfiguration();
	const appState = useAppState();
	const chat = useChat();

	// Update user name in config if provided
	useEffect(() => {
		const updateUserName = async () => {
			if (name && configuration.state.configLoaded) {
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
	}, [name, configuration.state.configLoaded]);

	const renderCurrentView = () => {
		switch (navigation.state.currentView) {
			case 'config':
				return (
					<ConfigView
						onBack={navigation.navigateToHome}
						onNavigateToApiConfig={navigation.navigateToApiConfig}
						onResetConfig={configuration.resetConfig}
					/>
				);
			case 'api-config':
				return <ApiConfig onBack={navigation.navigateToConfig} />;
			case 'models':
				return (
					<ModelSelection
						onSelect={configuration.selectModel}
						onBack={navigation.navigateToHome}
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

			{/* Only show input when not in specialized views */}
			{navigation.state.currentView !== 'models' &&
				navigation.state.currentView !== 'api-config' &&
				navigation.state.currentView !== 'config' && (
					<>
						{/* Input Section */}
						<ChatInput
							disabled={chat.state.isProcessing}
							placeholder={
								chat.state.isProcessing
									? 'Processing...'
									: 'Type a command or message...'
							}
						/>

						{/* Status Information */}
						<Box flexDirection="row" justifyContent="flex-end">
							<Text color="gray" dimColor>
								Status: {appState.state.status} | Model: {configuration.state.selectedModel}
								{name && ` | User: ${name}`} | Ctrl+C to exit
							</Text>
						</Box>
					</>
				)}

			{/* Status Information for specialized views */}
			{(navigation.state.currentView === 'models' ||
				navigation.state.currentView === 'api-config' ||
				navigation.state.currentView === 'config') && (
				<Box flexDirection="row" justifyContent="flex-end" marginTop={1}>
					<Text color="gray" dimColor>
						Status: {appState.state.status} | Model: {configuration.state.selectedModel}
						{name && ` | User: ${name}`} | Ctrl+C to exit
					</Text>
				</Box>
			)}
		</Box>
	);
}
