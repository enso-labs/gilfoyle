import {Box, Text} from 'ink';
import { useAppContext } from '../providers/AppProvider/index.js';

export default function ChatView() {
	const { state } = useAppContext();
	
	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Chat with Agent
			</Text>
			{state.agentState && (
				<Box flexDirection="column">
					<Text color="cyan">
						Agent ready! Type your message below and press Enter.
					</Text>
					<Text color="gray" dimColor>
						Token usage: {state.agentState.thread.usage.total_tokens}{' '}
						total
					</Text>
				</Box>
			)}
			{state.isProcessing && (
				<Box marginY={1}>
					<Text color="yellow">🤖 Agent is thinking...</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text color="gray">Press ESC to return home</Text>
			</Box>
		</Box>
	);
} 