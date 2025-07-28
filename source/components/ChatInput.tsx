import {useState, useCallback, useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {useAppContext} from '../providers/AppProvider/index.js';

interface ChatInputProps {
	placeholder?: string;
	disabled?: boolean;
}

interface Command {
	name: string;
	description: string;
}

const AVAILABLE_COMMANDS: Command[] = [
	{name: '/help', description: 'Show help message'},
	{name: '/chat', description: 'Start conversing with AI agent'},
	{name: '/models', description: 'List available AI models'},
	{name: '/init', description: 'Initialize agent and create AGENTS.md'},
	{name: '/config', description: 'Configuration options and settings'},
];

export default function ChatInput({
	placeholder = 'Type a command or message...',
	disabled = false,
}: ChatInputProps) {
	const {state, handleCommand} = useAppContext();
	const [localInput, setLocalInput] = useState('');
	const [showCommands, setShowCommands] = useState(false);
	const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

	// Filter commands based on input
	const filteredCommands = useMemo(() => {
		if (!showCommands || !localInput.startsWith('/')) {
			return [];
		}

		const searchTerm = localInput.slice(1).toLowerCase();
		return AVAILABLE_COMMANDS.filter(
			cmd =>
				cmd.name.slice(1).toLowerCase().includes(searchTerm) ||
				cmd.description.toLowerCase().includes(searchTerm),
		);
	}, [localInput, showCommands]);

	// Handle keyboard input for command navigation
	useInput(
		(_, key) => {
			if (!showCommands || filteredCommands.length === 0) return;

			if (key.upArrow) {
				setSelectedCommandIndex(prev =>
					prev > 0 ? prev - 1 : filteredCommands.length - 1,
				);
			} else if (key.downArrow) {
				setSelectedCommandIndex(prev =>
					prev < filteredCommands.length - 1 ? prev + 1 : 0,
				);
			} else if (key.tab) {
				// Tab autocomplete
				if (filteredCommands[selectedCommandIndex]) {
					const selectedCommand = filteredCommands[selectedCommandIndex].name;
					setLocalInput(selectedCommand + ' ');
					setShowCommands(false);
					setSelectedCommandIndex(0);
				}
			} else if (key.return && filteredCommands[selectedCommandIndex]) {
				// Enter to select command
				const selectedCommand = filteredCommands[selectedCommandIndex].name;
				handleSubmit(selectedCommand);
			} else if (key.escape) {
				// Escape to hide commands
				setShowCommands(false);
				setSelectedCommandIndex(0);
			}
		},
		{isActive: showCommands && filteredCommands.length > 0},
	);

	const handleSubmit = useCallback(
		async (value: string) => {
			if (value.trim() !== '' && !state.isProcessing) {
				setLocalInput(''); // Clear input immediately for better UX
				setShowCommands(false);
				setSelectedCommandIndex(0);
				try {
					await handleCommand(value);
				} catch (error) {
					console.error('Error handling command:', error);
				}
			}
		},
		[handleCommand, state.isProcessing],
	);

	const handleChange = useCallback(
		(value: string) => {
			if (!state.isProcessing) {
				setLocalInput(value);

				// Show commands when input starts with /
				const shouldShowCommands = value.startsWith('/') && value.length > 0;
				setShowCommands(shouldShowCommands);

				// Reset selected index when input changes
				if (shouldShowCommands) {
					setSelectedCommandIndex(0);
				}
			}
		},
		[state.isProcessing],
	);

	return (
		<Box flexDirection="column">
			{/* Command dropdown */}
			{showCommands && filteredCommands.length > 0 && (
				<Box
					flexDirection="column"
					borderStyle="round"
					borderColor="yellow"
					marginBottom={1}
					paddingX={1}
				>
					<Text color="yellow" bold>
						Available Commands:
					</Text>
					{filteredCommands.slice(0, 6).map((cmd, index) => (
						<Box key={cmd.name} paddingLeft={1}>
							<Text
								color={index === selectedCommandIndex ? 'black' : 'green'}
								backgroundColor={
									index === selectedCommandIndex ? 'green' : undefined
								}
								bold={index === selectedCommandIndex}
							>
								{cmd.name}
							</Text>
							<Text color="gray"> - {cmd.description}</Text>
						</Box>
					))}
					{filteredCommands.length > 6 && (
						<Text color="gray" dimColor>
							... and {filteredCommands.length - 6} more
						</Text>
					)}
					<Box marginTop={1}>
						<Text color="gray" dimColor>
							↑↓ navigate • Tab autocomplete • Enter select • Esc cancel
						</Text>
					</Box>
				</Box>
			)}

			{/* Input field */}
			<Box borderStyle="round" borderColor="cyan" paddingX={1}>
				<Text color="cyan">$ </Text>
				<TextInput
					value={localInput}
					onChange={handleChange}
					onSubmit={handleSubmit}
					placeholder={placeholder}
					showCursor={!disabled && !state.isProcessing}
				/>
			</Box>
		</Box>
	);
}
