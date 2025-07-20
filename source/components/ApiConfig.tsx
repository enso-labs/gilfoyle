import {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {getConfigManager, type ProviderConfig} from '../utils/config.js';

type ApiConfigProps = {
	onBack: () => void;
};

type ProviderSummary = {
	id: string;
	provider: ProviderConfig;
	hasKey: boolean;
};

export default function ApiConfig({onBack}: ApiConfigProps) {
	const [providers, setProviders] = useState<ProviderSummary[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isEditing, setIsEditing] = useState(false);
	const [editingKey, setEditingKey] = useState('');
	const [loading, setLoading] = useState(true);

	// Load providers on mount
	useEffect(() => {
		const loadProviders = async () => {
			try {
				const configManager = getConfigManager();
				const providersSummary = await configManager.getProvidersSummary();
				setProviders(providersSummary);
			} catch (error) {
				console.error('Error loading providers:', error);
			} finally {
				setLoading(false);
			}
		};

		loadProviders();
	}, []);

	const handleSaveApiKey = async () => {
		const provider = providers[selectedIndex];
		if (!provider) return;

		try {
			const configManager = getConfigManager();
			await configManager.setApiKey(provider.id, editingKey);

			// Refresh providers
			const updatedProviders = await configManager.getProvidersSummary();
			setProviders(updatedProviders);

			setIsEditing(false);
			setEditingKey('');
		} catch (error) {
			console.error('Error saving API key:', error);
		}
	};

	const handleToggleProvider = async () => {
		const provider = providers[selectedIndex];
		if (!provider) return;

		try {
			const configManager = getConfigManager();
			await configManager.setProviderEnabled(
				provider.id,
				!provider.provider.enabled,
			);

			// Refresh providers
			const updatedProviders = await configManager.getProvidersSummary();
			setProviders(updatedProviders);
		} catch (error) {
			console.error('Error toggling provider:', error);
		}
	};

	useInput((input, key) => {
		if (key.escape) {
			if (isEditing) {
				setIsEditing(false);
				setEditingKey('');
			} else {
				onBack();
			}
			return;
		}

		if (isEditing) {
			if (key.return) {
				handleSaveApiKey();
				return;
			}

			if (key.backspace || key.delete) {
				setEditingKey(prev => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setEditingKey(prev => prev + input);
			}
			return;
		}

		// Navigation mode
		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
			return;
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(providers.length - 1, prev + 1));
			return;
		}

		if (key.return || input === 'e') {
			const provider = providers[selectedIndex];
			if (provider) {
				setIsEditing(true);
				setEditingKey(provider.provider.apiKey || '');
			}
			return;
		}

		if (input === 't') {
			handleToggleProvider();
			return;
		}
	});

	if (loading) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="cyan">Loading API configuration...</Text>
			</Box>
		);
	}

	const selectedProvider = providers[selectedIndex];

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text color="cyan" bold>
					API Configuration
				</Text>
				<Text color="gray">esc</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color="gray" dimColor>
					Configure API keys for model providers to enable access to their
					models.
				</Text>
			</Box>

			{/* Providers List */}
			<Box flexDirection="column" marginBottom={1}>
				<Text color="yellow" bold marginBottom={1}>
					Providers:
				</Text>
				{providers.map((item, index) => {
					const isSelected = index === selectedIndex;
					const {provider, hasKey} = item;

					return (
						<Box key={item.id} marginLeft={2} marginBottom={0}>
							<Text
								color={isSelected ? 'cyan' : 'white'}
								backgroundColor={isSelected ? 'blue' : undefined}
							>
								{isSelected ? '> ' : '  '}
								<Text bold>{provider.name}</Text>{' '}
								<Text color={provider.enabled ? 'green' : 'red'}>
									{provider.enabled ? '●' : '○'}
								</Text>{' '}
								<Text color={hasKey ? 'green' : 'yellow'}>
									{hasKey ? '[API Key Set]' : '[No API Key]'}
								</Text>
							</Text>
						</Box>
					);
				})}
			</Box>

			{/* API Key Input */}
			{isEditing && (
				<Box
					borderStyle="round"
					borderColor="cyan"
					paddingX={1}
					marginBottom={1}
				>
					<Text color="cyan">API Key: </Text>
					<Text>{editingKey.replace(/./g, '*')}</Text>
					<Text color="gray">_</Text>
				</Box>
			)}

			{/* Selected Provider Info */}
			{selectedProvider && (
				<Box
					borderStyle="round"
					borderColor="blue"
					paddingX={1}
					flexDirection="column"
					marginBottom={1}
				>
					<Text color="cyan" bold>
						{selectedProvider.provider.name}
					</Text>
					<Text color="gray">{selectedProvider.provider.description}</Text>
					<Text color="yellow" marginTop={1}>
						Setup: {selectedProvider.provider.setupInstructions}
					</Text>
					<Text color="magenta" marginTop={1}>
						Models: {Object.keys(selectedProvider.provider.models).join(', ')}
					</Text>
					<Text color="cyan" marginTop={1}>
						NPM Package: {selectedProvider.provider.npm}
					</Text>
					{selectedProvider.provider.options.baseURL && (
						<Text color="gray" marginTop={1}>
							Endpoint: {selectedProvider.provider.options.baseURL}
						</Text>
					)}
				</Box>
			)}

			{/* Instructions */}
			<Box borderStyle="round" borderColor="gray" paddingX={1}>
				<Text color="gray" dimColor>
					{isEditing
						? 'Enter API key • Enter Save • ESC Cancel'
						: '↑/↓ Navigate • Enter/E Edit Key • T Toggle • ESC Back'}
				</Text>
			</Box>
		</Box>
	);
}
