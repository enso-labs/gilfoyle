import {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {getConfigManager} from '../utils/config.js';
import ChatModels from '../config/llm.js';

type ModelData = {
	id: string;
	config: {
		name: string;
		description?: string;
		enabled?: boolean;
	};
	providerId: string;
	providerName: string;
	available: boolean;
};

type ModelSelectionProps = {
	onSelect: (model: ModelData) => void;
	onBack: () => void;
};

// Convert ChatModels to ModelData format
function getChatModelsAsModelData(): ModelData[] {
	const chatModelsClass = ChatModels as any;
	const models: ModelData[] = [];
	
	// Get all static properties from ChatModels class
	Object.getOwnPropertyNames(ChatModels).forEach(key => {
		if (key !== 'prototype' && key !== 'length' && key !== 'name') {
			const modelId = chatModelsClass[key];
			if (typeof modelId === 'string' && modelId.includes(':')) {
				const splitParts = modelId.split(':');
				const providerId = splitParts[0];
				const modelName = splitParts[1];
				
				if (providerId && modelName) {
					models.push({
						id: modelId,
						config: {
							name: modelId, // Use the actual ChatModels value as display name
							description: `${getProviderDisplayName(providerId)} - ${modelName}`,
							enabled: true,
						},
						providerId: providerId,
						providerName: getProviderDisplayName(providerId),
						available: true, // All models available without API key requirement
					});
				}
			}
		}
	});
	
	return models;
}

function getProviderDisplayName(providerId: string): string {
	const providerNames: Record<string, string> = {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		'google-vertexai': 'Google Vertex AI',
		xai: 'xAI',
		groq: 'Groq',
		ollama: 'Ollama',
	};
	return providerNames[providerId] || providerId.toUpperCase();
}

export default function ModelSelection({
	onSelect,
	onBack,
}: ModelSelectionProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isSearching, setIsSearching] = useState(false);
	const [allModels, setAllModels] = useState<ModelData[]>([]);
	const [recentModels, setRecentModels] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);

	// Load models and config data
	useEffect(() => {
		const loadData = async () => {
			try {
				const configManager = getConfigManager();
				const config = await configManager.load();
				
				// Always use ChatModels only
				const models = getChatModelsAsModelData();

				setAllModels(models);
				setRecentModels(config.recentModels || []);
			} catch (error) {
				console.error('Error loading models:', error);
				// Fallback to ChatModels if config loading fails
				const fallbackModels = getChatModelsAsModelData();
				setAllModels(fallbackModels);
				setRecentModels([]);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const filteredModels = allModels.filter(
		model =>
			model.config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			model.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			model.config.description
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()),
	);

	const recentModelsList = allModels.filter(model =>
		recentModels.includes(model.id),
	);
	const modelsByProvider = allModels.reduce((acc, model) => {
		if (!acc[model.providerName]) {
			acc[model.providerName] = [];
		}
		acc[model.providerName]!.push(model);
		return acc;
	}, {} as Record<string, ModelData[]>);

	// For navigation, use the models that are actually displayed
	const displayModels = searchQuery 
		? filteredModels 
		: recentModelsList.length > 0 
			? recentModelsList 
			: allModels;
	const maxIndex = displayModels.length - 1;

	useEffect(() => {
		if (selectedIndex > maxIndex) {
			setSelectedIndex(Math.max(0, maxIndex));
		}
	}, [selectedIndex, maxIndex]);

	useInput((input, key) => {
		if (key.escape) {
			if (isSearching) {
				setIsSearching(false);
				setSearchQuery('');
			} else {
				onBack();
			}
			return;
		}

		if (key.return) {
			if (isSearching) {
				setIsSearching(false);
				return;
			}
			if (displayModels[selectedIndex]) {
				const selectedModel = displayModels[selectedIndex];
				onSelect(selectedModel);
			}
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
			return;
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
			return;
		}

		if (input === 's' && !isSearching) {
			setIsSearching(true);
			return;
		}

		if (isSearching) {
			if (key.backspace || key.delete) {
				setSearchQuery(prev => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setSearchQuery(prev => prev + input);
			}
		}
	});

	const renderModelItem = (model: ModelData, isSelected: boolean) => {
		const isLocal = model.providerId === 'ollama';

		return (
			<Box key={model.id} marginLeft={2}>
				<Text
					color={isSelected ? 'cyan' : 'white'}
					backgroundColor={isSelected ? 'blue' : undefined}
				>
					{isSelected ? '> ' : '  '}
					<Text bold>
						{model.config.name}
					</Text>{' '}
					<Text color="gray">{model.providerName}</Text>
					{isLocal && <Text color="yellow"> (local)</Text>}
					<Text color="green"> ✓</Text>
				</Text>
			</Box>
		);
	};

	if (loading) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="cyan">Loading models...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text color="cyan" bold>
					Select Model ({allModels.length} available)
				</Text>
				<Text color="gray">esc</Text>
			</Box>

			{/* Search Box */}
			<Box
				borderStyle="round"
				borderColor={isSearching ? 'cyan' : 'gray'}
				paddingX={1}
				marginBottom={1}
			>
				<Text color="cyan">🔍 </Text>
				<Text color={isSearching ? 'white' : 'gray'}>
					{searchQuery || 'Search models...'}
				</Text>
				{isSearching && <Text color="gray">_</Text>}
			</Box>

			{/* Models List */}
			<Box flexDirection="column">
				{searchQuery ? (
					// Search Results
					<>
						<Box marginBottom={1}>
							<Text color="yellow" bold>
								Search Results ({filteredModels.length})
							</Text>
						</Box>
						{filteredModels.map((model, index) =>
							renderModelItem(model, index === selectedIndex),
						)}
					</>
				) : (
					// Recent and Provider Sections
					<>
						{/* Recent Models */}
						{recentModelsList.length > 0 && (
							<Box flexDirection="column" marginBottom={2}>
								<Box marginBottom={1}>
									<Text color="yellow" bold>
										Recent
									</Text>
								</Box>
								{recentModelsList.map((model, index) =>
									renderModelItem(model, index === selectedIndex),
								)}
							</Box>
						)}

						{/* Show all models if no recent models */}
						{recentModelsList.length === 0 && (
							<Box flexDirection="column" marginBottom={2}>
								<Box marginBottom={1}>
									<Text color="yellow" bold>
										All Available Models
									</Text>
								</Box>
								{allModels.slice(0, 10).map((model, index) =>
									renderModelItem(model, index === selectedIndex),
								)}
								{allModels.length > 10 && (
									<Box marginLeft={2}>
										<Text color="gray">... and {allModels.length - 10} more (use search to find specific models)</Text>
									</Box>
								)}
							</Box>
						)}

						{/* Models by Provider */}
						{recentModelsList.length > 0 && Object.entries(modelsByProvider).map(([provider, models]) => (
							<Box key={provider} flexDirection="column" marginBottom={1}>
								<Text color="yellow" bold>
									{provider}
								</Text>
								{models.slice(0, 3).map(model => (
									<Box key={model.id} marginLeft={2}>
										<Text color="gray">
											{model.config.name}
											{model.providerId === 'ollama' && (
												<Text color="yellow"> (local)</Text>
											)}
											<Text color="green"> ✓</Text>
										</Text>
									</Box>
								))}
								{models.length > 3 && (
									<Box marginLeft={2}>
										<Text color="gray">... and {models.length - 3} more</Text>
									</Box>
								)}
							</Box>
						))}
					</>
				)}
			</Box>

			{/* Footer Instructions */}
			<Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
				<Text color="gray" dimColor>
					↑/↓ Navigate • Enter Select • S Search • ESC{' '}
					{isSearching ? 'Cancel' : 'Back'}
				</Text>
			</Box>

			{/* Selected Model Info */}
			{displayModels[selectedIndex] && (
				<Box
					marginTop={1}
					borderStyle="round"
					borderColor="blue"
					paddingX={1}
					flexDirection="column"
				>
					<Text color="cyan" bold>
						{displayModels[selectedIndex].config.name}
					</Text>
					<Text color="gray">
						{displayModels[selectedIndex].config.description ||
							'No description available'}
					</Text>
					<Text color="yellow">
						Provider: {displayModels[selectedIndex].providerName}
						{displayModels[selectedIndex].providerId === 'ollama' && ' • Local'}
					</Text>
					<Text color="magenta">
						Model ID: {displayModels[selectedIndex].id}
					</Text>
				</Box>
			)}
		</Box>
	);
}
