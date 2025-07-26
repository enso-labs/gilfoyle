import {Box, Text} from 'ink';
import Header from '../components/Header.js';
import Navigation from '../components/Navigation.js';

type HomePageProps = {
	name?: string;
	version?: string;
};

const menuOptions = [
	{
		key: '/help',
		label: 'Help',
		description: 'Show help information',
	},
	{
		key: '/chat',
		label: 'Chat',
		description: 'Start conversing with the AI agent',
	},
	{
		key: '/models',
		label: 'Models',
		description: 'List available models',
	},
	{
		key: '/init',
		label: 'Initialize',
		description: 'Initialize agent and create AGENTS.md',
	},
	{
		key: '/config',
		label: 'Config',
		description: 'Show configuration info',
	},
	{
		key: '/api-config',
		label: 'API Config',
		description: 'Configure API keys for providers',
	},
];

export default function HomePage({name, version = '0.3.43'}: HomePageProps) {
	return (
		<Box flexDirection="column" padding={1}>
			<Header title="Gilfoyle" version={version} />

			<Box marginBottom={1}>
				<Text color="cyan">
					Welcome{name ? `, ${name}` : ''}! This is your AI development
					assistant.
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color="gray" dimColor>
					Configuration: ~/.config/gilfoyle/gilfoyle.json (OpenCode AI Schema)
				</Text>
			</Box>

			<Navigation options={menuOptions} />

			<Box marginBottom={1}>
				<Text color="gray" dimColor>
					Type a command below and press Enter to execute.
				</Text>
			</Box>
		</Box>
	);
}
