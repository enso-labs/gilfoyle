import {Box, Text} from 'ink';
import Header from '../components/Header.js';

type HomePageProps = {
	name?: string;
	version?: string;
};

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

			<Box>
				<Text color="gray" dimColor>
					Type a command below and press Enter to execute.
				</Text>
			</Box>
		</Box>
	);
}
