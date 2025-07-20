import {promises as fs} from 'fs';
import {join} from 'path';
import {homedir} from 'os';

export type ModelConfig = {
	name: string;
	description?: string;
	enabled?: boolean;
};

export type ProviderConfig = {
	npm: string;
	name: string;
	enabled?: boolean;
	apiKey?: string;
	description?: string;
	setupInstructions?: string;
	options: {
		baseURL: string;
		[key: string]: any;
	};
	models: Record<string, ModelConfig>;
};

export type McpConfig = {
	playwright?: {
		type: 'remote' | 'local';
		url?: string;
		enabled: boolean;
	};
	[key: string]: any;
};

export type GilfoyleConfig = {
	$schema: string;
	mcp: McpConfig;
	provider: Record<string, ProviderConfig>;
	selectedModel?: string;
	recentModels?: string[];
	user?: {
		name?: string;
		preferences?: {
			theme?: 'dark' | 'light';
			compactMode?: boolean;
		};
	};
	editor?: {
		fontSize?: number;
		wordWrap?: boolean;
		tabSize?: number;
	};
	export?: {
		format?: 'markdown' | 'json' | 'txt';
		includeTimestamps?: boolean;
	};
	lastUpdated?: string;
	version?: string;
};

const DEFAULT_CONFIG: GilfoyleConfig = {
	$schema: 'https://opencode.ai/config.json',
	mcp: {
		playwright: {
			type: 'remote',
			url: 'http://localhost:8931/sse',
			enabled: true,
		},
	},
	provider: {
		ollama: {
			npm: '@ai-sdk/openai-compatible',
			name: 'Ollama (local)',
			enabled: true,
			description: 'Run models locally using Ollama. No API key required.',
			setupInstructions:
				'Install Ollama from https://ollama.ai and run "ollama serve"',
			options: {
				baseURL: 'http://127.0.0.1:11434/v1',
			},
			models: {
				qwen3: {
					name: 'Qwen-3 (local)',
					description: 'Qwen 3 model running locally via Ollama',
					enabled: true,
				},
				'llama3.1': {
					name: 'LlaMA 3.1 (local)',
					description: 'Meta LlaMA 3.1 model running locally via Ollama',
					enabled: true,
				},
			},
		},
		openai: {
			npm: '@ai-sdk/openai',
			name: 'OpenAI',
			enabled: false,
			description: 'Access to GPT-4, o4-mini, Codex, and DALL-E models',
			setupInstructions:
				'Get your API key from https://platform.openai.com/api-keys',
			options: {
				baseURL: 'https://api.openai.com/v1',
			},
			models: {
				'o4-mini': {
					name: 'o4-mini',
					description: 'Fast and efficient GPT-4 variant',
				},
				'gpt-4': {
					name: 'GPT-4',
					description: 'Most capable GPT model',
				},
				'codex-mini': {
					name: 'Codex Mini',
					description: 'Code generation and completion',
				},
				'gpt-4-vision': {
					name: 'GPT-4 Vision',
					description: 'Multimodal model with vision capabilities',
				},
			},
		},
		google: {
			npm: '@ai-sdk/google',
			name: 'Google AI',
			enabled: false,
			description: 'Access to Gemini 2.5 Pro, Flash, and PaLM models',
			setupInstructions:
				'Get your API key from https://makersuite.google.com/app/apikey',
			options: {
				baseURL: 'https://generativelanguage.googleapis.com/v1',
			},
			models: {
				'gemini-2.5-pro-preview-06-05': {
					name: 'Gemini 2.5 Pro Preview 06-05',
					description: 'Advanced reasoning and long context',
				},
				'gemini-2.5-flash-lite-preview-06-17': {
					name: 'Gemini 2.5 Flash Lite Preview 06-17',
					description: 'Fast responses with good quality',
				},
				'gemini-1.5-pro': {
					name: 'Gemini 1.5 Pro',
					description: 'High-quality reasoning model',
				},
			},
		},
		anthropic: {
			npm: '@ai-sdk/anthropic',
			name: 'Anthropic',
			enabled: false,
			description: 'Access to Claude Sonnet, Opus, and Haiku models',
			setupInstructions:
				'Get your API key from https://console.anthropic.com/account/keys',
			options: {
				baseURL: 'https://api.anthropic.com/v1',
			},
			models: {
				'claude-sonnet': {
					name: 'Claude Sonnet',
					description: 'Balanced performance and speed',
				},
				'claude-opus': {
					name: 'Claude Opus',
					description: 'Most capable Claude model',
				},
			},
		},
	},
	selectedModel: 'qwen3',
	recentModels: [
		'qwen3',
		'llama3.1',
		'o4-mini',
		'gemini-2.5-pro-preview-06-05',
	],
	user: {
		preferences: {
			theme: 'dark',
			compactMode: false,
		},
	},
	editor: {
		fontSize: 14,
		wordWrap: true,
		tabSize: 2,
	},
	export: {
		format: 'markdown',
		includeTimestamps: true,
	},
	lastUpdated: new Date().toISOString(),
	version: '0.3.43',
};

export class ConfigManager {
	private configPath: string;
	private configDir: string;
	private config: GilfoyleConfig | null = null;

	constructor() {
		this.configDir = join(homedir(), '.config', 'gilfoyle');
		this.configPath = join(this.configDir, 'gilfoyle.json');
	}

	/**
	 * Ensure config directory exists
	 */
	private async ensureConfigDir(): Promise<void> {
		try {
			await fs.access(this.configDir);
		} catch {
			await fs.mkdir(this.configDir, {recursive: true});
		}
	}

	/**
	 * Load configuration from file
	 */
	async load(): Promise<GilfoyleConfig> {
		if (this.config) {
			return this.config;
		}

		try {
			await this.ensureConfigDir();
			const configData = await fs.readFile(this.configPath, 'utf8');
			const loadedConfig = JSON.parse(configData) as Partial<GilfoyleConfig>;

			// Merge with defaults to handle missing properties
			this.config = {
				...DEFAULT_CONFIG,
				...loadedConfig,
				mcp: {
					...DEFAULT_CONFIG.mcp,
					...loadedConfig.mcp,
				},
				provider: {
					...DEFAULT_CONFIG.provider,
					...loadedConfig.provider,
				},
				user: {
					...DEFAULT_CONFIG.user,
					...loadedConfig.user,
					preferences: {
						...DEFAULT_CONFIG.user?.preferences,
						...loadedConfig.user?.preferences,
					},
				},
				editor: {
					...DEFAULT_CONFIG.editor,
					...loadedConfig.editor,
				},
				export: {
					...DEFAULT_CONFIG.export,
					...loadedConfig.export,
				},
			};

			return this.config;
		} catch (error) {
			// Config file doesn't exist or is invalid, use defaults
			this.config = {...DEFAULT_CONFIG};
			await this.save(); // Create the file with defaults
			return this.config;
		}
	}

	/**
	 * Save configuration to file
	 */
	async save(): Promise<void> {
		if (!this.config) {
			throw new Error('No config loaded to save');
		}

		await this.ensureConfigDir();

		// Update lastUpdated timestamp
		this.config.lastUpdated = new Date().toISOString();

		const configData = JSON.stringify(this.config, null, 2);
		await fs.writeFile(this.configPath, configData, 'utf8');
	}

	/**
	 * Get current configuration
	 */
	get(): GilfoyleConfig {
		if (!this.config) {
			throw new Error('Config not loaded. Call load() first.');
		}
		return this.config;
	}

	/**
	 * Update selected model and add to recent models
	 */
	async setSelectedModel(modelId: string): Promise<void> {
		const config = await this.load();

		config.selectedModel = modelId;

		// Add to recent models (keep unique, limit to 10)
		const prevRecent = Array.isArray(config.recentModels)
			? config.recentModels
			: [];
		const recentModels = [modelId, ...prevRecent.filter(m => m !== modelId)];
		config.recentModels = recentModels.slice(0, 10);

		await this.save();
	}

	/**
	 * Update user information
	 */
	async setUser(user: Partial<GilfoyleConfig['user']>): Promise<void> {
		const config = await this.load();
		config.user = {
			...config.user,
			...user,
			preferences: {
				...(config.user && config.user.preferences
					? config.user.preferences
					: {}),
				...(user && user.preferences ? user.preferences : {}),
			},
		};
		await this.save();
	}

	/**
	 * Update editor settings
	 */
	async setEditorConfig(
		editorConfig: Partial<GilfoyleConfig['editor']>,
	): Promise<void> {
		const config = await this.load();
		config.editor = {
			...config.editor,
			...editorConfig,
		};
		await this.save();
	}

	/**
	 * Update export settings
	 */
	async setExportConfig(
		exportConfig: Partial<GilfoyleConfig['export']>,
	): Promise<void> {
		const config = await this.load();
		config.export = {
			...config.export,
			...exportConfig,
		};
		await this.save();
	}

	/**
	 * Get config file path for debugging
	 */
	getConfigPath(): string {
		return this.configPath;
	}

	/**
	 * Set API key for a provider
	 */
	async setApiKey(providerId: string, apiKey: string): Promise<void> {
		const config = await this.load();
		if (!config.provider[providerId]) {
			throw new Error(`Provider ${providerId} not found`);
		}
		config.provider[providerId].apiKey = apiKey;
		config.provider[providerId].enabled =
			apiKey.length > 0 || providerId === 'ollama';
		await this.save();
	}

	/**
	 * Get API key for a provider
	 */
	async getApiKey(providerId: string): Promise<string | undefined> {
		const config = await this.load();
		return config.provider[providerId]?.apiKey;
	}

	/**
	 * Enable/disable a provider
	 */
	async setProviderEnabled(
		providerId: string,
		enabled: boolean,
	): Promise<void> {
		const config = await this.load();
		if (!config.provider[providerId]) {
			throw new Error(`Provider ${providerId} not found`);
		}
		config.provider[providerId].enabled = enabled;
		await this.save();
	}

	/**
	 * Get available models based on enabled providers
	 */
	async getAvailableModels(): Promise<string[]> {
		const config = await this.load();
		const availableModels: string[] = [];

		Object.values(config.provider).forEach(provider => {
			if (provider.enabled) {
				Object.entries(provider.models).forEach(([modelId, modelConfig]) => {
					if (modelConfig.enabled !== false) {
						availableModels.push(modelId);
					}
				});
			}
		});

		return availableModels;
	}

	/**
	 * Check if a model is available
	 */
	async isModelAvailable(modelId: string): Promise<boolean> {
		const availableModels = await this.getAvailableModels();
		return availableModels.includes(modelId);
	}

	/**
	 * Get all models with their details
	 */
	async getAllModels(): Promise<
		Array<{
			id: string;
			config: ModelConfig;
			providerId: string;
			providerName: string;
			available: boolean;
		}>
	> {
		const config = await this.load();
		const availableModels = await this.getAvailableModels();
		const allModels: Array<{
			id: string;
			config: ModelConfig;
			providerId: string;
			providerName: string;
			available: boolean;
		}> = [];

		Object.entries(config.provider).forEach(([providerId, provider]) => {
			Object.entries(provider.models).forEach(([modelId, modelConfig]) => {
				allModels.push({
					id: modelId,
					config: modelConfig,
					providerId,
					providerName: provider.name,
					available: availableModels.includes(modelId),
				});
			});
		});

		return allModels;
	}

	/**
	 * Get providers summary for display
	 */
	async getProvidersSummary(): Promise<
		Array<{id: string; provider: ProviderConfig; hasKey: boolean}>
	> {
		const config = await this.load();
		return Object.entries(config.provider).map(([id, provider]) => ({
			id,
			provider,
			hasKey:
				Boolean(provider.apiKey && provider.apiKey.length > 0) ||
				id === 'ollama',
		}));
	}

	/**
	 * Reset config to defaults
	 */
	async reset(): Promise<void> {
		this.config = {...DEFAULT_CONFIG};
		await this.save();
	}
}

// Singleton instance
let configManager: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
	if (!configManager) {
		configManager = new ConfigManager();
	}
	return configManager;
}
