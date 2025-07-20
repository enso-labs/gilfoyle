import {useState, useEffect} from 'react';
import {Box, Text, useInput, useStdout} from 'ink';

type Props = {
	name: string | undefined;
};

interface FileChange {
	file: string;
	type: 'modified' | 'added' | 'deleted';
	timestamp: Date;
}

interface StatusInfo {
	model: string;
	directory: string;
	branch: string | null;
}

export default function App({name = 'Stranger'}: Props) {
	console.debug(name);
	const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
		{role: 'assistant', content: 'Hello! I\'m your AI code terminal agent. How can I help you today?'}
	]);
	const [currentInput, setCurrentInput] = useState('');
	const [fileChanges] = useState<FileChange[]>([
		{file: 'src/app.tsx', type: 'modified', timestamp: new Date()},
		{file: 'src/components/Chat.tsx', type: 'added', timestamp: new Date(Date.now() - 60000)},
		{file: 'package.json', type: 'modified', timestamp: new Date(Date.now() - 120000)},
		{file: 'src/utils/helper.ts', type: 'deleted', timestamp: new Date(Date.now() - 180000)},
		{file: 'README.md', type: 'modified', timestamp: new Date(Date.now() - 240000)},
	]);
	const [statusInfo, setStatusInfo] = useState<StatusInfo>({
		model: 'claude-3.5-sonnet',
		directory: process.cwd().split('/').pop() || 'unknown',
		branch: null
	});
	const [terminalDimensions, setTerminalDimensions] = useState({width: 80, height: 24});

	const {stdout} = useStdout();

	// Dynamic terminal size tracking
	useEffect(() => {
		const currentWidth = stdout?.columns || 80;
		const currentHeight = stdout?.rows || 24;
		
		// Only update if dimensions actually changed
		if (currentWidth !== terminalDimensions.width || currentHeight !== terminalDimensions.height) {
			setTerminalDimensions({
				width: currentWidth,
				height: currentHeight
			});
		}
	}, [stdout?.columns, stdout?.rows, terminalDimensions.width, terminalDimensions.height]);

	// Get git branch info
	useEffect(() => {
		import('child_process').then(({exec}) => {
			exec('git rev-parse --abbrev-ref HEAD', (error, stdout) => {
				if (!error && stdout.trim()) {
					setStatusInfo(prev => ({...prev, branch: stdout.trim()}));
				}
			});
		});
	}, []);

	useInput((input, key) => {
		if (key.return) {
			if (currentInput.trim()) {
				// Add user message
				setMessages(prev => [...prev, {role: 'user', content: currentInput}]);
				
				// Simulate AI response
				setTimeout(() => {
					setMessages(prev => [...prev, {
						role: 'assistant', 
						content: `I received: "${currentInput}". This is a simulated response. In a real implementation, this would connect to your AI model.`
					}]);
				}, 500);
				
				setCurrentInput('');
			}
		} else if (key.backspace || key.delete) {
			setCurrentInput(prev => prev.slice(0, -1));
		} else if (!key.ctrl && !key.meta && input) {
			setCurrentInput(prev => prev + input);
		}
	});

	// Responsive layout calculations
	const {width: terminalWidth, height: terminalHeight} = terminalDimensions;
	const minRightPanelWidth = 25;
	const minMainPanelWidth = 40;
	const statusBarHeight = 3;
	const contentHeight = terminalHeight - statusBarHeight;
	
	// Calculate panel widths based on terminal size
	let rightPanelWidth: number;
	let mainPanelWidth: number;

	if (terminalWidth < 80) {
		// Small screen: stack vertically or minimal right panel
		rightPanelWidth = Math.max(minRightPanelWidth, Math.floor(terminalWidth * 0.25));
		mainPanelWidth = terminalWidth - rightPanelWidth - 1;
	} else if (terminalWidth < 120) {
		// Medium screen: balanced layout
		rightPanelWidth = Math.floor(terminalWidth * 0.3);
		mainPanelWidth = terminalWidth - rightPanelWidth - 1;
	} else {
		// Large screen: more space for main panel
		rightPanelWidth = Math.max(minRightPanelWidth, Math.floor(terminalWidth * 0.25));
		mainPanelWidth = terminalWidth - rightPanelWidth - 1;
	}

	// Ensure minimum widths
	if (mainPanelWidth < minMainPanelWidth) {
		mainPanelWidth = minMainPanelWidth;
		rightPanelWidth = Math.max(15, terminalWidth - mainPanelWidth - 1);
	}

	// Calculate message display area height
	const headerHeight = 2;
	const inputAreaHeight = 3;
	const messageAreaHeight = Math.max(5, contentHeight - headerHeight - inputAreaHeight);
	
	// Get recent messages that fit in the display area
	const maxVisibleMessages = Math.max(3, Math.floor(messageAreaHeight / 2));
	const visibleMessages = messages.slice(-maxVisibleMessages);

	// Truncate long file paths for display
	const truncateFilePath = (path: string, maxLength: number) => {
		if (path.length <= maxLength) return path;
		const parts = path.split('/');
		if (parts.length > 1) {
			return `.../${parts[parts.length - 1]}`;
		}
		return path.substring(0, maxLength - 3) + '...';
	};

	// Calculate max file path length based on right panel width
	const maxFilePathLength = Math.max(10, rightPanelWidth - 8);

	return (
		<Box flexDirection="column" height={terminalHeight} width={terminalWidth}>
			{/* Main Content Area */}
			<Box flexDirection="row" height={contentHeight}>
				{/* Main Chat Panel */}
				<Box 
					flexDirection="column" 
					width={mainPanelWidth} 
					borderStyle="single" 
					borderColor="blue"
					paddingX={1}
				>
					<Box marginBottom={1}>
						<Text bold color="blue">
							💬 AI Agent Chat {terminalWidth < 60 && '(Compact)'}
						</Text>
					</Box>
					
					{/* Messages Area with auto-scroll */}
					<Box flexDirection="column" height={messageAreaHeight} overflowY="hidden">
						{visibleMessages.map((msg, idx) => {
							const maxMessageLength = Math.max(20, mainPanelWidth - 15);
							const truncatedContent = msg.content.length > maxMessageLength 
								? msg.content.substring(0, maxMessageLength - 3) + '...'
								: msg.content;
							
							return (
								<Box key={idx} marginBottom={1} flexDirection="column">
									<Text color={msg.role === 'user' ? 'green' : 'cyan'}>
										{msg.role === 'user' ? '👤 You:' : '🤖 Agent:'}
									</Text>
									<Text wrap="wrap">{truncatedContent}</Text>
								</Box>
							);
						})}
					</Box>
					
					{/* Input Area */}
					<Box borderStyle="single" borderColor="gray" paddingX={1} height={inputAreaHeight}>
						<Box flexDirection="row" alignItems="center">
							<Text color="yellow">{'> '}</Text>
							<Text>
								{currentInput.length > mainPanelWidth - 10 
									? '...' + currentInput.slice(-(mainPanelWidth - 13))
									: currentInput
								}
							</Text>
							<Text color="gray">█</Text>
						</Box>
					</Box>
				</Box>

				{/* Right Panel - File Changes */}
				<Box 
					flexDirection="column" 
					width={rightPanelWidth} 
					borderStyle="single" 
					borderColor="yellow"
					paddingX={1}
					marginLeft={1}
				>
					<Box marginBottom={1}>
						<Text bold color="yellow">
							{rightPanelWidth > 20 ? '📁 Recent Changes' : '📁 Files'}
						</Text>
					</Box>
					
					{/* File changes with responsive display */}
					<Box flexDirection="column" overflowY="hidden">
						{fileChanges.slice(0, Math.max(3, contentHeight - 4)).map((change, idx) => (
							<Box key={idx} marginBottom={1} flexDirection="column">
								<Box flexDirection="row">
									<Text color={
										change.type === 'added' ? 'green' : 
										change.type === 'modified' ? 'yellow' : 'red'
									}>
										{change.type === 'added' ? '+' : 
										 change.type === 'modified' ? '~' : '-'}
									</Text>
									<Text> {truncateFilePath(change.file, maxFilePathLength)}</Text>
								</Box>
								{rightPanelWidth > 20 && (
									<Text color="gray" dimColor>
										{change.timestamp.toLocaleTimeString().slice(0, 5)}
									</Text>
								)}
							</Box>
						))}
					</Box>
				</Box>
			</Box>

			{/* Bottom Status Bar - Responsive */}
			<Box 
				borderStyle="single" 
				borderColor="green" 
				paddingX={1}
				height={statusBarHeight}
				justifyContent="space-between"
				alignItems="center"
			>
				<Box>
					<Text color="green">
						{terminalWidth > 60 ? `🤖 ${statusInfo.model}` : '🤖'}
					</Text>
				</Box>
				<Box>
					<Text color="blue">
						{terminalWidth > 80 
							? `📂 ${statusInfo.directory}` 
							: `📂 ${statusInfo.directory.slice(0, 8)}${statusInfo.directory.length > 8 ? '...' : ''}`
						}
					</Text>
				</Box>
				<Box>
					{statusInfo.branch ? (
						<Text color="magenta">
							{terminalWidth > 60 ? `🌿 ${statusInfo.branch}` : '🌿'}
						</Text>
					) : (
						<Text color="gray">{terminalWidth > 60 ? 'No Git' : 'NG'}</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
}
