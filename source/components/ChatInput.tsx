import React, {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useAppContext} from '../providers/AppProvider/index.js';

interface ChatInputProps {
	placeholder?: string;
	disabled?: boolean;
}

export default function ChatInput({
	placeholder = 'Type a command or message...',
	disabled = false,
}: ChatInputProps) {
	const {state, handleCommand} = useAppContext();
	const [localInput, setLocalInput] = useState('');

	const handleSubmit = useCallback(
		async (value: string) => {
			if (value.trim() !== '' && !state.isProcessing) {
				setLocalInput(''); // Clear input immediately for better UX
				try {
					await handleCommand(value);
				} catch (error) {
					console.error('Error handling command:', error);
				}
			}
		},
		[handleCommand, state.isProcessing],
	);

	const handleChange = useCallback((value: string) => {
		if (!state.isProcessing) {
			setLocalInput(value);
		}
	}, [state.isProcessing]);

	return (
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
	);
} 