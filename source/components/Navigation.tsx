import {Text, Box} from 'ink';

type MenuOption = {
	key: string;
	label: string;
	description: string;
};

type NavigationProps = {
	options: MenuOption[];
};

export default function Navigation({options}: NavigationProps) {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color="yellow" bold>
				Available Commands:
			</Text>
			<Box flexDirection="column" marginLeft={2}>
				{options.map(option => (
					<Box key={option.key} marginBottom={0}>
						<Text color="green" bold>
							{option.key}
						</Text>
						<Text> - {option.description}</Text>
					</Box>
				))}
			</Box>
		</Box>
	);
}
