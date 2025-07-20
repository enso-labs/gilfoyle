import {Text, Box} from 'ink';

type StatusBarProps = {
	user?: string;
	status?: string;
};

export default function StatusBar({user, status = 'Ready'}: StatusBarProps) {
	return (
		<Box
			borderStyle="round"
			borderColor="blue"
			paddingX={1}
			flexDirection="row"
			justifyContent="space-between"
		>
			<Box>
				<Text color="blue">Status: </Text>
				<Text color="green">{status}</Text>
			</Box>
			{user && (
				<Box>
					<Text color="blue">User: </Text>
					<Text color="magenta">{user}</Text>
				</Box>
			)}
		</Box>
	);
} 