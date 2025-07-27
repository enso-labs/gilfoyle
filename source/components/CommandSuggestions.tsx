/**
 * Command Suggestions Component
 * 
 * Displays filtered command suggestions with keyboard navigation support
 * and real-time filtering based on user input.
 */

import { Box, Text } from 'ink';
import { CommandSuggestion } from '../utils/commandRegistry.js';

interface CommandSuggestionsProps {
	suggestions: CommandSuggestion[];
	selectedIndex: number;
	isVisible: boolean;
	maxSuggestions?: number;
}

export default function CommandSuggestions({
	suggestions,
	selectedIndex,
	isVisible,
	maxSuggestions = 5,
}: CommandSuggestionsProps) {
	if (!isVisible || suggestions.length === 0) {
		return null;
	}

	const displaySuggestions = suggestions.slice(0, maxSuggestions);

	return (
		<Box flexDirection="column" marginLeft={2} marginTop={1}>
			<Text color="gray" dimColor>
				Commands:
			</Text>
			{displaySuggestions.map((suggestion, index) => {
				const isSelected = index === selectedIndex;
				const { command, matchReason } = suggestion;
				
				return (
					<Box key={command.name} marginLeft={1}>
						<Text
							color={isSelected ? 'cyan' : 'white'}
							backgroundColor={isSelected ? 'blue' : undefined}
							bold={isSelected}
						>
							{isSelected ? '> ' : '  '}
							{command.icon ? `${command.icon} ` : ''}
							{command.name}
						</Text>
						<Box marginLeft={1}>
							<Text color="gray" dimColor>
								{command.description}
							</Text>
						</Box>
						{matchReason === 'alias' && (
							<Box marginLeft={1}>
								<Text color="yellow" dimColor>
									(alias)
								</Text>
							</Box>
						)}
					</Box>
				);
			})}
			
			{suggestions.length > maxSuggestions && (
				<Box marginLeft={1}>
					<Text color="gray" dimColor>
						... and {suggestions.length - maxSuggestions} more
					</Text>
				</Box>
			)}
			
			<Box marginTop={1} marginLeft={1}>
				<Text color="gray" dimColor>
					Use ↑↓ to navigate • Tab to complete • Enter to execute
				</Text>
			</Box>
		</Box>
	);
}