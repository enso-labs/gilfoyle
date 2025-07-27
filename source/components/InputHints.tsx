/**
 * Input Hints Component
 * 
 * Displays helpful hints about available commands and shortcuts
 * when the user is not actively using command suggestions.
 */

import { Box, Text } from 'ink';

interface InputHintsProps {
	isVisible: boolean;
	currentView: string;
}

export default function InputHints({ isVisible, currentView }: InputHintsProps) {
	if (!isVisible) {
		return null;
	}

	const getContextualHints = () => {
		switch (currentView) {
			case 'home':
				return [
					'Type "/" for commands',
					'Type a message to chat',
					'Common: /chat, /help, /models',
				];
			case 'chat':
				return [
					'Chat mode active',
					'Type "/" for commands',
					'Message goes directly to AI',
				];
			default:
				return [
					'Type "/" for commands',
					'Available: /help, /home, /chat',
				];
		}
	};

	const shortcuts = [
		'Ctrl+C: Exit',
		'Esc: Home',
		'Tab: Complete',
	];

	const hints = getContextualHints();

	return (
		<Box flexDirection="column" marginLeft={2} marginBottom={1}>
			<Box flexDirection="row" gap={3}>
				<Box flexDirection="column">
					<Text color="blue" dimColor>
						💡 Quick Tips:
					</Text>
					{hints.map((hint, index) => (
						<Text key={index} color="gray" dimColor>
							• {hint}
						</Text>
					))}
				</Box>
				
				<Box flexDirection="column">
					<Text color="blue" dimColor>
						⌨️  Shortcuts:
					</Text>
					{shortcuts.map((shortcut, index) => (
						<Text key={index} color="gray" dimColor>
							• {shortcut}
						</Text>
					))}
				</Box>
			</Box>
		</Box>
	);
}