import {Box, Text} from 'ink';
import {useAppContext} from '../providers/AppProvider/index.js';

export default function ExportView() {
	const {state} = useAppContext();

	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Export Conversation
			</Text>
			{state.isProcessing ? (
				<Box flexDirection="column" marginY={1}>
					<Text color="cyan">{state.exportProgress}</Text>
					<Text color="yellow">⏳ Processing...</Text>
				</Box>
			) : (
				<Box flexDirection="column" marginY={1}>
					<Text color="green">✓ {state.exportProgress}</Text>
					<Text color="cyan">Export completed successfully!</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text color="gray">Press ESC to return home</Text>
			</Box>
		</Box>
	);
}
