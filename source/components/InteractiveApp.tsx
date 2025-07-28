import {useEffect} from 'react';
import {Box, Text} from 'ink';
import {getConfigManager} from '../utils/config.js';
import {InteractiveAppProps} from '../entities/state.js';
import {useAppContext} from '../providers/AppProvider/index.js';
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
	const {
		state,
		handleModelSelect,
		handleBackToHome,
		handleNavigateToApiConfig,
		handleResetConfig,
		handleBackToConfig,
	} = useAppContext();

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
			case 'config':
				return (
					<ConfigView
						onBack={handleBackToHome}
						onNavigateToApiConfig={handleNavigateToApiConfig}
						onResetConfig={handleResetConfig}
					/>
				);
			case 'api-config':
				return <ApiConfig onBack={handleBackToConfig} />;
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

			{/* Only show input when not in specialized views */}
			{state.currentView !== 'models' &&
				state.currentView !== 'api-config' &&
				state.currentView !== 'config' && (
					<>
						{/* Input Section */}
						<ChatInput
							disabled={state.isProcessing}
							placeholder={
								state.isProcessing
									? 'Processing...'
									: 'Type a command or message...'
							}
						/>

						{/* Status Information */}
						<Box flexDirection="row" justifyContent="flex-end">
							<Text color="gray" dimColor>
								Status: {state.status} | Model: {state.selectedModel}
								{name && ` | User: ${name}`} | Ctrl+C to exit
							</Text>
						</Box>
					</>
				)}

			{/* Status Information for specialized views */}
			{(state.currentView === 'models' ||
				state.currentView === 'api-config' ||
				state.currentView === 'config') && (
				<Box flexDirection="row" justifyContent="flex-end" marginTop={1}>
					<Text color="gray" dimColor>
						Status: {state.status} | Model: {state.selectedModel}
						{name && ` | User: ${name}`} | Ctrl+C to exit
					</Text>
				</Box>
			)}
		</Box>
	);
}
