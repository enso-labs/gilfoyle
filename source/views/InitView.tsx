import {Box, Text} from 'ink';
import {useAppContext} from '../providers/AppProvider/index.js';

export default function InitView() {
	const {state} = useAppContext();

	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Initialize Agent
			</Text>
			{state.isProcessing ? (
				<Box flexDirection="column" marginY={1}>
					<Text color="cyan">{state.initProgress}</Text>
					<Text color="yellow">⏳ Processing...</Text>
				</Box>
			) : (
				<Box flexDirection="column" marginY={1}>
					<Text color="green">✓ {state.initProgress}</Text>
					<Text color="cyan">Agent is ready for use!</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text color="gray">Press ESC to return home</Text>
			</Box>
		</Box>
	);
}
