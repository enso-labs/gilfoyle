import {Box, Text} from 'ink';

export default function EditorView() {
	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Editor Mode
			</Text>
			<Text>Text editor functionality would go here.</Text>
			<Text color="gray">Press ESC to return home</Text>
		</Box>
	);
} 