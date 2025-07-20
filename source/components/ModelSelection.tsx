import {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';

type Model = {
	id: string;
	name: string;
	provider: 'OpenAI' | 'Google' | 'Anthropic' | 'Ollama' | 'Meta';
	type: 'chat' | 'code' | 'vision' | 'embedding';
	local?: boolean;
	description?: string;
};

type ModelSelectionProps = {
	onSelect: (model: Model) => void;
	onBack: () => void;
};

const ALL_MODELS: Model[] = [
	// OpenAI Models
	{
		id: 'o4-mini',
		name: 'o4-mini',
		provider: 'OpenAI',
		type: 'chat',
		description: 'Fast and efficient GPT-4 variant'
	},
	{
		id: 'gpt-4',
		name: 'GPT-4',
		provider: 'OpenAI',
		type: 'chat',
		description: 'Most capable GPT model'
	},
	{
		id: 'codex-mini',
		name: 'Codex Mini',
		provider: 'OpenAI',
		type: 'code',
		description: 'Code generation and completion'
	},
	{
		id: 'gpt-4-vision',
		name: 'GPT-4 Vision',
		provider: 'OpenAI',
		type: 'vision',
		description: 'Multimodal model with vision capabilities'
	},
	
	// Google Models
	{
		id: 'gemini-2.5-pro-preview-06-05',
		name: 'Gemini 2.5 Pro Preview 06-05',
		provider: 'Google',
		type: 'chat',
		description: 'Advanced reasoning and long context'
	},
	{
		id: 'gemini-2.5-flash-lite-preview-06-17',
		name: 'Gemini 2.5 Flash Lite Preview 06-17',
		provider: 'Google',
		type: 'chat',
		description: 'Fast responses with good quality'
	},
	{
		id: 'gemini-1.5-pro',
		name: 'Gemini 1.5 Pro',
		provider: 'Google',
		type: 'chat',
		description: 'High-quality reasoning model'
	},
	
	// Anthropic Models
	{
		id: 'claude-sonnet',
		name: 'Claude Sonnet',
		provider: 'Anthropic',
		type: 'chat',
		description: 'Balanced performance and speed'
	},
	{
		id: 'claude-opus',
		name: 'Claude Opus',
		provider: 'Anthropic',
		type: 'chat',
		description: 'Most capable Claude model'
	},
	
	// Meta Models
	{
		id: 'llama-3.1-local',
		name: 'LLaMA 3.1 (local)',
		provider: 'Ollama',
		type: 'chat',
		local: true,
		description: 'Local inference with Ollama'
	},
	{
		id: 'llama-3.1-70b',
		name: 'LLaMA 3.1 70B',
		provider: 'Meta',
		type: 'chat',
		description: 'Large language model by Meta'
	},
];

const RECENT_MODELS = ['o4-mini', 'gemini-2.5-pro-preview-06-05', 'codex-mini', 'gemini-2.5-flash-lite-preview-06-17', 'llama-3.1-local'];

export default function ModelSelection({onSelect, onBack}: ModelSelectionProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isSearching, setIsSearching] = useState(false);

	const filteredModels = ALL_MODELS.filter(model => 
		model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
		model.description?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const recentModels = ALL_MODELS.filter(model => RECENT_MODELS.includes(model.id));
	const modelsByProvider = ALL_MODELS.reduce((acc, model) => {
		if (!acc[model.provider]) {
			acc[model.provider] = [];
		}
		acc[model.provider].push(model);
		return acc;
	}, {} as Record<string, Model[]>);

	const displayModels = searchQuery ? filteredModels : recentModels;
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
				onSelect(displayModels[selectedIndex]);
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

	const renderModelItem = (model: Model, index: number, isSelected: boolean) => (
		<Box key={model.id} marginLeft={2}>
			<Text color={isSelected ? 'cyan' : 'white'} backgroundColor={isSelected ? 'blue' : undefined}>
				{isSelected ? '> ' : '  '}
				<Text bold>{model.name}</Text>
				{' '}
				<Text color="gray">{model.provider}</Text>
				{model.local && <Text color="yellow"> (local)</Text>}
			</Text>
		</Box>
	);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text color="cyan" bold>Select Model</Text>
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
						<Text color="yellow" bold marginBottom={1}>
							Search Results ({filteredModels.length})
						</Text>
						{filteredModels.map((model, index) => 
							renderModelItem(model, index, index === selectedIndex)
						)}
					</>
				) : (
					// Recent and Provider Sections
					<>
						{/* Recent Models */}
						<Box flexDirection="column" marginBottom={2}>
							<Text color="yellow" bold marginBottom={1}>Recent</Text>
							{recentModels.map((model, index) => 
								renderModelItem(model, index, index === selectedIndex)
							)}
						</Box>

						{/* Models by Provider */}
						{Object.entries(modelsByProvider).map(([provider, models]) => (
							<Box key={provider} flexDirection="column" marginBottom={1}>
								<Text color="yellow" bold>{provider}</Text>
								{models.map(model => (
									<Box key={model.id} marginLeft={2}>
										<Text color="gray">
											{model.name}
											{model.local && <Text color="yellow"> (local)</Text>}
										</Text>
									</Box>
								))}
							</Box>
						))}
					</>
				)}
			</Box>

			{/* Footer Instructions */}
			<Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
				<Text color="gray" dimColor>
					↑/↓ Navigate • Enter Select • S Search • ESC {isSearching ? 'Cancel' : 'Back'}
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
						{displayModels[selectedIndex].name}
					</Text>
					<Text color="gray">
						{displayModels[selectedIndex].description || 'No description available'}
					</Text>
					<Text color="yellow">
						Provider: {displayModels[selectedIndex].provider}
						{displayModels[selectedIndex].local && ' • Local'}
					</Text>
				</Box>
			)}
		</Box>
	);
} 