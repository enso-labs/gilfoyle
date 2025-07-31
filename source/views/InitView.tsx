import {Box, Text} from 'ink';
import {useAppState} from '../providers/AppStateProvider/index.js';
import {useChat} from '../providers/ChatProvider/index.js';

export default function InitView() {
	const appState = useAppState();
	const chat = useChat();

	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Initialize Agent
			</Text>
			{chat.state.isProcessing ? (
				<Box flexDirection="column" marginY={1}>
					<Text color="cyan">{appState.state.initProgress}</Text>
					<Text color="yellow">⏳ Processing...</Text>
				</Box>
			) : (
				<Box flexDirection="column" marginY={1}>
					<Text color="green">✓ {appState.state.initProgress}</Text>
					<Text color="cyan">Agent is ready for use!</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text color="gray">Press ESC to return home</Text>
			</Box>
		</Box>
	);
}
