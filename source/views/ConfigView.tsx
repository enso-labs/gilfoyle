import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {getConfigManager} from '../utils/config.js';

type ConfigViewProps = {
	onBack: () => void;
	onNavigateToApiConfig: () => void;
	onResetConfig?: () => void;
};

interface ConfigOption {
	id: string;
	name: string;
	description: string;
	action: 'show-location' | 'api-config' | 'reset-config';
}

const CONFIG_OPTIONS: ConfigOption[] = [
	{
		id: 'location',
		name: 'Configuration File Location',
		description: 'Show the path to the configuration file',
		action: 'show-location',
	},
	{
		id: 'api-keys',
		name: 'API Keys Configuration',
		description: 'Configure API keys for model providers',
		action: 'api-config',
	},
	{
		id: 'reset',
		name: 'Reset Configuration',
		description: 'Reset configuration to defaults',
		action: 'reset-config',
	},
];

export default function ConfigView({
	onBack,
	onNavigateToApiConfig,
	onResetConfig,
}: ConfigViewProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showingLocation, setShowingLocation] = useState(false);
	const [configPath, setConfigPath] = useState('');

	const handleSelect = async () => {
		const option = CONFIG_OPTIONS[selectedIndex];
		if (!option) return;

		switch (option.action) {
			case 'show-location':
				const configManager = getConfigManager();
				const path = configManager.getConfigPath();
				setConfigPath(path);
				setShowingLocation(true);
				break;
			case 'api-config':
				onNavigateToApiConfig();
				break;
			case 'reset-config':
				if (onResetConfig) {
					onResetConfig();
				} else {
					try {
						const configManager = getConfigManager();
						await configManager.reset();
					} catch (error) {
						console.error('Error resetting configuration:', error);
					}
				}
				onBack(); // Go back to home after reset
				break;
		}
	};

	useInput((input, key) => {
		if (key.escape) {
			if (showingLocation) {
				setShowingLocation(false);
			} else {
				onBack();
			}
			return;
		}

		if (showingLocation) {
			// Any key press while showing location goes back to menu
			if (key.return || input) {
				setShowingLocation(false);
			}
			return;
		}

		// Navigation mode
		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
			return;
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(CONFIG_OPTIONS.length - 1, prev + 1));
			return;
		}

		if (key.return) {
			handleSelect();
			return;
		}
	});

	if (showingLocation) {
		return (
			<Box flexDirection="column" padding={1}>
				<Box justifyContent="space-between" marginBottom={1}>
					<Text color="cyan" bold>
						Configuration File Location
					</Text>
					<Text color="gray">ESC Back</Text>
				</Box>

				<Box
					borderStyle="round"
					borderColor="green"
					paddingX={1}
					marginBottom={2}
				>
					<Text color="green" bold>
						Config Path:
					</Text>
					<Text color="white">{configPath}</Text>
				</Box>

				<Box borderStyle="round" borderColor="gray" paddingX={1}>
					<Text color="gray" dimColor>
						This is where your Gilfoyle configuration is stored.
						{'\n'}Press any key to return to the config menu.
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text color="cyan" bold>
					Configuration
				</Text>
				<Text color="gray">ESC Back</Text>
			</Box>

			<Box marginBottom={2}>
				<Text color="gray" dimColor>
					Select a configuration option to manage:
				</Text>
			</Box>

			{/* Config Options List */}
			<Box flexDirection="column" marginBottom={2}>
				{CONFIG_OPTIONS.map((option, index) => {
					const isSelected = index === selectedIndex;

					return (
						<Box key={option.id} marginBottom={1}>
							<Box>
								<Text
									color={isSelected ? 'black' : 'cyan'}
									backgroundColor={isSelected ? 'cyan' : undefined}
									bold={isSelected}
								>
									{isSelected ? '▶ ' : '  '}
									{option.name}
								</Text>
							</Box>
							<Box marginLeft={4}>
								<Text color="gray" dimColor>
									{option.description}
								</Text>
							</Box>
						</Box>
					);
				})}
			</Box>

			{/* Instructions */}
			<Box borderStyle="round" borderColor="gray" paddingX={1}>
				<Text color="gray" dimColor>
					↑/↓ Navigate • Enter Select • ESC Back
				</Text>
			</Box>
		</Box>
	);
}
