import React from 'react';
import { useInput, useApp } from 'ink';
import { AppStateProvider } from './providers/AppStateProvider/index.js';
import { ChatProvider } from './providers/ChatProvider/index.js';
import { CommandProvider } from './providers/CommandProvider/index.js';
import { ConfigurationProvider } from './providers/ConfigurationProvider/index.js';
import { NavigationProvider } from './providers/NavigationProvider/index.js';
import { useNavigation } from './providers/NavigationProvider/index.js';
import { useChat } from './providers/ChatProvider/index.js';
import { useConfiguration } from './providers/ConfigurationProvider/index.js';
import { useAppState } from './providers/AppStateProvider/index.js';

function RouterInner({children}: {children: React.ReactNode}) {
	const { exit } = useApp();
	const navigation = useNavigation();
	const chat = useChat();
	const configuration = useConfiguration();
	const appState = useAppState();

	// Handle navigation actions
	const handleNavigate = (view: string) => {
		switch (view) {
			case 'home':
				navigation.navigateToHome();
				break;
			case 'help':
				navigation.navigateToHelp();
				break;
			case 'models':
				navigation.navigateToModels();
				break;
			case 'api-config':
				navigation.navigateToApiConfig();
				break;
			case 'config':
				navigation.navigateToConfig();
				break;
			case 'chat':
				navigation.navigateToChat();
				break;
			case 'init':
				navigation.navigateToInit();
				break;
		}
	};

	// Chat input handler
	const handleChatInput = async (input: string) => {
		if (!chat.state.agentState) {
			const result = await chat.initAgent();
			if (result.success) {
				await chat.processChatMessage(input, result.agentState);
			} else {
				appState.setStatus(result.message);
			}
		} else {
			await chat.processChatMessage(input, chat.state.agentState);
		}
	};

	// Init agent handler
	const handleInitAgent = async () => {
		const result = await chat.initAgent();
		appState.updateStatusFromResult(result);
		return result;
	};

	// Reset config handler
	const handleResetConfig = async () => {
		const result = await configuration.resetConfig();
		chat.resetAgent();
		chat.clearHistory();
		appState.updateStatusFromResult(result);
		return result;
	};

	// Clear history handler
	const handleClearHistory = () => {
		chat.clearHistory();
	};

	// Handle keyboard input
	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			exit();
			return;
		}

		if (key.escape) {
			navigation.navigateToHome();
			return;
		}
	});

	return (
		<CommandProvider
			onNavigate={handleNavigate}
			onChatInput={handleChatInput}
			onInitAgent={handleInitAgent}
			onResetConfig={handleResetConfig}
			onClearHistory={handleClearHistory}
			onExit={exit}
		>
			{children}
		</CommandProvider>
	);
}

// Main Router component that wraps all providers
function Router({children}: {children: React.ReactNode}) {
	return (
		<AppStateProvider>
			<ConfigurationProvider>
				<NavigationProvider>
					<ChatProvider>
						<RouterInner>
							{children}
						</RouterInner>
					</ChatProvider>
				</NavigationProvider>
			</ConfigurationProvider>
		</AppStateProvider>
	);
}

export default Router;
