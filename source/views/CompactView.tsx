import {Box, Text} from 'ink';
import { useAppContext } from '../providers/AppProvider/index.js';

export default function CompactView() {
	const { state } = useAppContext();
	
	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Compacting Session
			</Text>
			{state.isProcessing ? (
				<Box flexDirection="column" marginY={1}>
					<Text color="cyan">{state.compactProgress}</Text>
					<Text color="yellow">⏳ Processing...</Text>
				</Box>
			) : (
				<Box flexDirection="column" marginY={1}>
					<Text color="green">✓ {state.compactProgress}</Text>
					<Text color="cyan">Memory has been optimized!</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text color="gray">Press ESC to return home</Text>
			</Box>
		</Box>
	);
} 