import {Box, Text} from 'ink';

export default function HelpView() {
	return (
		<Box flexDirection="column" marginY={1}>
			<Text color="yellow" bold>
				Help - Available Commands:
			</Text>
			<Text color="green">/help</Text>
			<Text> Show this help message</Text>
			<Text color="green">/chat</Text>
			<Text> Start conversing with the AI agent</Text>
			<Text color="green">/editor</Text>
			<Text> Open the text editor</Text>
			<Text color="green">/models</Text>
			<Text> List available AI models</Text>
			<Text color="green">/init</Text>
			<Text> Initialize agent and create AGENTS.md</Text>
			<Text color="green">/compact</Text>
			<Text> Compact and summarize conversation history</Text>
			<Text color="green">/export</Text>
			<Text> Export conversation to file</Text>
			<Text color="green">/home</Text>
			<Text> Return to home screen</Text>
			<Text color="green">clear</Text>
			<Text> Clear command history</Text>
			<Text color="green">exit/quit</Text>
			<Text> Exit the application</Text>
			<Text color="green">/config</Text>
			<Text> Show configuration file location</Text>
			<Text color="green">/reset-config</Text>
			<Text> Reset configuration to defaults</Text>
			<Text color="green">/api-config</Text>
			<Text> Configure API keys for model providers</Text>
			<Box marginTop={1}>
				<Text color="gray">Press ESC to return home</Text>
			</Box>
		</Box>
	);
} 