import {Text, Box} from 'ink';

type HeaderProps = {
	title: string;
	version?: string;
};

export default function Header({title, version}: HeaderProps) {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box justifyContent="center">
				<Text color="cyan" bold>
					{title.toUpperCase()}
				</Text>
				{version && (
					<Text color="gray" dimColor>
						{' '}
						v{version}
					</Text>
				)}
			</Box>
			<Box justifyContent="center">
				<Text color="gray">{'═'.repeat(title.length + 4)}</Text>
			</Box>
		</Box>
	);
} 