import {useState, useEffect, useCallback} from 'react';
import {Box, Text, useInput} from 'ink';
import {
	fuzzySearch,
	debounce,
	type SearchableCommand,
} from '../utils/fuzzySearch.js';

interface SmartCommandFilterProps {
	commands: SearchableCommand[];
	onSelect: (command: SearchableCommand) => void;
	onFilterChange?: (filteredCommands: SearchableCommand[]) => void;
	placeholder?: string;
	maxResults?: number;
}

/**
 * SmartCommandFilter component provides intelligent command filtering with:
 * - Fuzzy search across command keys, labels, and descriptions
 * - Real-time filtering as user types
 * - Keyboard navigation (arrow keys, Enter)
 * - Accessibility compliance
 */
export default function SmartCommandFilter({
	commands,
	onSelect,
	onFilterChange,
	placeholder = 'Search commands...',
	maxResults = 10,
}: SmartCommandFilterProps) {
	const [filter, setFilter] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [filteredCommands, setFilteredCommands] =
		useState<SearchableCommand[]>(commands);

	// Debounced filter function to improve performance
	const debouncedFilterUpdate = useCallback(
		debounce((newFilter: string) => {
			const filtered = fuzzySearch(commands, newFilter).slice(0, maxResults);
			setFilteredCommands(filtered);
			setSelectedIndex(0); // Reset selection to first item
			onFilterChange?.(filtered);
		}, 150),
		[commands, maxResults, onFilterChange],
	);

	// Update filtered commands when filter changes
	useEffect(() => {
		debouncedFilterUpdate(filter);
	}, [filter, debouncedFilterUpdate]);

	// Reset filtered commands when commands prop changes
	useEffect(() => {
		setFilteredCommands(commands.slice(0, maxResults));
		setSelectedIndex(0);
		setFilter('');
	}, [commands, maxResults]);

	// Handle keyboard input
	useInput((input: string, key: any) => {
		if (key.upArrow) {
			setSelectedIndex(prevIndex => {
				const newIndex =
					prevIndex > 0 ? prevIndex - 1 : filteredCommands.length - 1;
				return newIndex;
			});
		} else if (key.downArrow) {
			setSelectedIndex(prevIndex => {
				const newIndex =
					prevIndex < filteredCommands.length - 1 ? prevIndex + 1 : 0;
				return newIndex;
			});
		} else if (key.return) {
			if (filteredCommands[selectedIndex]) {
				onSelect(filteredCommands[selectedIndex]);
			}
		} else if (key.backspace || key.delete) {
			setFilter(prevFilter => prevFilter.slice(0, -1));
		} else if (input && !key.ctrl && !key.meta) {
			setFilter(prevFilter => prevFilter + input);
		}
	});

	const renderCommand = (command: SearchableCommand, index: number) => {
		const isSelected = index === selectedIndex;
		const prefix = isSelected ? '> ' : '  ';

		return (
			<Box key={command.key} flexDirection="row">
				<Text color={isSelected ? 'cyan' : 'gray'}>{prefix}</Text>
				<Box flexDirection="column" flexGrow={1}>
					<Text color={isSelected ? 'cyan' : 'green'} bold>
						{command.key}
					</Text>
					<Text color={isSelected ? 'white' : 'gray'} dimColor={!isSelected}>
						{command.description}
					</Text>
				</Box>
			</Box>
		);
	};

	const renderEmpty = () => {
		if (commands.length === 0) {
			return (
				<Box marginTop={1}>
					<Text color="yellow">No commands available</Text>
				</Box>
			);
		}

		if (filter && filteredCommands.length === 0) {
			return (
				<Box marginTop={1}>
					<Text color="yellow">No commands found matching "{filter}"</Text>
					<Text color="gray" dimColor>
						Try a different search term or check spelling
					</Text>
				</Box>
			);
		}

		return null;
	};

	const renderResults = () => {
		if (filteredCommands.length === 0) {
			return renderEmpty();
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				{filteredCommands.map((command, index) =>
					renderCommand(command, index),
				)}
			</Box>
		);
	};

	const renderHeader = () => {
		const commandCount = filteredCommands.length;
		const totalCount = commands.length;
		const countText = filter
			? `${commandCount} of ${totalCount} commands`
			: `${totalCount} commands`;

		return (
			<Box flexDirection="column" marginBottom={1}>
				<Box flexDirection="row" marginBottom={1}>
					<Text color="blue" bold>
						🔍{' '}
					</Text>
					<Text color="white">{placeholder}</Text>
				</Box>

				<Box flexDirection="row" justifyContent="space-between">
					<Box flexDirection="row">
						<Text color="gray">Search: </Text>
						<Text color="white" backgroundColor="gray">
							{filter || ' '}
						</Text>
					</Box>
					<Text color="gray" dimColor>
						{countText}
					</Text>
				</Box>
			</Box>
		);
	};

	const renderFooter = () => {
		return (
			<Box marginTop={1} paddingTop={1} borderStyle="single" borderTop>
				<Text color="gray" dimColor>
					↑/↓ navigate • Enter to select • Type to filter
				</Text>
			</Box>
		);
	};

	return (
		<Box flexDirection="column">
			{renderHeader()}
			{renderResults()}
			{renderFooter()}
		</Box>
	);
}

export type {SmartCommandFilterProps, SearchableCommand};
