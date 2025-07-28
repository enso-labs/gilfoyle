import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {useAppContext} from '../providers/AppProvider/index.js';

interface HistoryMessage {
	content: string;
	isExpanded?: boolean;
	canExpand?: boolean;
}

function truncateMessage(
	message: string,
	maxLines: number = 10,
): {content: string; needsTruncation: boolean} {
	const lines = message.split('\n');
	if (lines.length <= maxLines) {
		return {content: message, needsTruncation: false};
	}

	const truncated = lines.slice(0, maxLines).join('\n');
	return {
		content:
			truncated +
			`\n\n📄 ${lines.length - maxLines} more lines - Press Ctrl+E to expand`,
		needsTruncation: true,
	};
}

export default function ChatView() {
	const {state} = useAppContext();
	const [expandedMessages, setExpandedMessages] = useState<Set<number>>(
		new Set(),
	);

	const processedHistory: HistoryMessage[] = state.history.map(
		(item: string, index: number) => {
			const isExpanded = expandedMessages.has(index);
			const {content, needsTruncation} = truncateMessage(item);

			return {
				content: isExpanded ? item : content,
				isExpanded,
				canExpand: needsTruncation,
			};
		},
	);

	useInput(
		(input, key) => {
			if (key.ctrl && input === 'e') {
				// Find the last message that can be expanded/collapsed
				const lastExpandableIndex = processedHistory
					.map((msg, index) => (msg.canExpand ? index : -1))
					.filter(index => index !== -1)
					.pop();

				if (lastExpandableIndex !== undefined) {
					setExpandedMessages(prev => {
						const newSet = new Set(prev);
						if (newSet.has(lastExpandableIndex)) {
							newSet.delete(lastExpandableIndex);
						} else {
							newSet.add(lastExpandableIndex);
						}
						return newSet;
					});
				}
				return; // Prevent the 'e' from being processed elsewhere
			}
		},
		{isActive: true},
	);

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
						Token usage: {state.agentState.thread.usage.total_tokens} total
					</Text>
				</Box>
			)}
			{state.isProcessing && (
				<Box marginY={1}>
					<Text color="yellow">🤖 Agent is thinking...</Text>
				</Box>
			)}

			{/* Log */}
			{processedHistory.length > 0 && (
				<Box flexDirection="column" marginY={1}>
					<Text color="gray" bold>
						Log:
					</Text>
					<Box flexDirection="column" marginLeft={1} minHeight={5}>
						{processedHistory
							.slice(-9)
							.map((msg: HistoryMessage, index: number) => (
								<Box key={index} flexDirection="column">
									<Text color="#f1f1f1" dimColor>
										{msg.content}
									</Text>
									{msg.canExpand && !msg.isExpanded && (
										<Text color="cyan" dimColor>
											📄 Ctrl+E to expand
										</Text>
									)}
									{msg.canExpand && msg.isExpanded && (
										<Text color="yellow" dimColor>
											📄 Ctrl+E to collapse
										</Text>
									)}
								</Box>
							))}
					</Box>
				</Box>
			)}

			<Box>
				<Text color="gray">
					Press ESC to return home • Press Ctrl+E to expand/collapse latest long
					message
				</Text>
			</Box>
		</Box>
	);
}
