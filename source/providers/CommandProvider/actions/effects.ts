import {useCallback} from 'react';
import {CommandState} from './state.js';
import {promises as fs} from 'fs';
import {getConfigManager} from '../../../utils/config.js';

const configManager = getConfigManager();

export const useCommandEffects = (
	setState: React.Dispatch<React.SetStateAction<CommandState>>,
	{
		onNavigate,
		onChatInput,
		onInitAgent,
		onResetConfig,
		onClearHistory,
		onExit,
	}: {
		onNavigate: (view: string) => void;
		onChatInput: (input: string) => Promise<void>;
		onInitAgent: () => Promise<{success: boolean; message: string}>;
		onResetConfig: () => Promise<{success: boolean; message: string}>;
		onClearHistory: () => void;
		onExit: () => void;
	},
) => {
	const processCommand = useCallback(
		async (command: string): Promise<{success: boolean; message?: string}> => {
			const trimmedCommand = command.trim().toLowerCase();

			setState(prev => ({
				...prev,
				lastCommand: command,
			}));

			switch (trimmedCommand) {
				case '/config':
					onNavigate('config');
					return {success: true};

				case '/help':
					onNavigate('help');
					return {success: true};

				case '/models':
					onNavigate('models');
					return {success: true};

				case '/chat':
					onNavigate('chat');
					return {success: true};

				case '/init':
					onNavigate('init');
					const initResult = await handleInitCommand();
					return initResult;

				case '/reset-config':
					const resetResult = await onResetConfig();
					return resetResult;

				case '/home':
				case 'home':
					onNavigate('home');
					return {success: true};

				case 'exit':
				case 'quit':
				case '/exit':
				case '/quit':
					onExit();
					return {success: true};

				case 'clear':
					onClearHistory();
					return {success: true, message: 'Cleared'};

				default:
					// If input doesn't start with "/", treat it as chat input
					if (!command.startsWith('/')) {
						await onChatInput(command);
						return {success: true};
					} else {
						// Handle unknown slash commands
						return {
							success: false,
							message: `Unknown command: ${command}. Type /help for available commands.`,
						};
					}
			}
		},
		[
			setState,
			onNavigate,
			onChatInput,
			onInitAgent,
			onResetConfig,
			onClearHistory,
			onExit,
		],
	);

	const handleInitCommand = useCallback(async (): Promise<{
		success: boolean;
		message: string;
	}> => {
		try {
			const config = await configManager.load();
			const agentResult = await onInitAgent();

			if (!agentResult.success) {
				return agentResult;
			}

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
			return {
				success: true,
				message: 'Agent initialized and AGENTS.md created',
			};
		} catch (error) {
			return {
				success: false,
				message: `Initialization failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			};
		}
	}, [onInitAgent]);

	return {
		processCommand,
	};
};
