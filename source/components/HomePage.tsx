import {Box, Text} from 'ink';
import Header from './Header.js';
import Navigation from './Navigation.js';

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
		key: '/editor',
		label: 'Editor',
		description: 'Open the editor',
	},
	{
		key: '/models',
		label: 'Models',
		description: 'List available models',
	},
	{
		key: '/init',
		label: 'Initialize',
		description: 'Create/update AGENTS.md',
	},
	{
		key: '/compact',
		label: 'Compact',
		description: 'Compact the session',
	},
	{
		key: '/export',
		label: 'Export',
		description: 'Export conversation',
	},
];

export default function HomePage({name, version = '0.3.43'}: HomePageProps) {
	return (
		<Box flexDirection="column" padding={1}>
			<Header title="Gilfoyle" version={version} />
			
			<Box marginBottom={1}>
				<Text color="cyan">
					Welcome{name ? `, ${name}` : ''}! This is your AI development assistant.
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