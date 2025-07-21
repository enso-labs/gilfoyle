# Gilfoyle Configuration Guide

This document explains the configuration structure for Gilfoyle, following the [OpenCode AI configuration schema](https://opencode.ai/config.json).

## Configuration File Location

The configuration file is stored at: `~/.config/gilfoyle/gilfoyle.json`

## Schema Overview

The configuration follows a structured format with the following main sections:

- `$schema`: Schema validation reference
- `mcp`: Model Context Protocol settings
- `provider`: AI model provider configurations
- `selectedModel`: Currently active model ID
- `recentModels`: Recently used model IDs
- `user`: User preferences and settings
- `editor`: Text editor configurations
- `export`: Export format preferences

## Complete Configuration Example

```json
{
	"$schema": "https://opencode.ai/config.json",
	"mcp": {
		"playwright": {
			"type": "remote",
			"url": "http://localhost:8931/sse",
			"enabled": true
		}
	},
	"provider": {
		"ollama": {
			"npm": "@ai-sdk/openai-compatible",
			"name": "Ollama (local)",
			"enabled": true,
			"description": "Run models locally using Ollama. No API key required.",
			"setupInstructions": "Install Ollama from https://ollama.ai and run 'ollama serve'",
			"options": {
				"baseURL": "http://127.0.0.1:11434/v1"
			},
			"models": {
				"qwen3": {
					"name": "Qwen-3 (local)",
					"description": "Qwen 3 model running locally via Ollama",
					"enabled": true
				},
				"llama3.1": {
					"name": "LlaMA 3.1 (local)",
					"description": "Meta LlaMA 3.1 model running locally via Ollama",
					"enabled": true
				}
			}
		},
		"openai": {
			"npm": "@ai-sdk/openai",
			"name": "OpenAI",
			"enabled": false,
			"apiKey": "sk-...",
			"description": "Access to GPT-4, o4-mini, Codex, and DALL-E models",
			"setupInstructions": "Get your API key from https://platform.openai.com/api-keys",
			"options": {
				"baseURL": "https://api.openai.com/v1"
			},
			"models": {
				"o4-mini": {
					"name": "o4-mini",
					"description": "Fast and efficient GPT-4 variant"
				},
				"gpt-4": {
					"name": "GPT-4",
					"description": "Most capable GPT model"
				},
				"codex-mini": {
					"name": "Codex Mini",
					"description": "Code generation and completion"
				},
				"gpt-4-vision": {
					"name": "GPT-4 Vision",
					"description": "Multimodal model with vision capabilities"
				}
			}
		}
	},
	"selectedModel": "qwen3",
	"recentModels": ["qwen3", "llama3.1", "o4-mini"],
	"user": {
		"name": "Developer",
		"preferences": {
			"theme": "dark",
			"compactMode": false
		}
	},
	"editor": {
		"fontSize": 14,
		"wordWrap": true,
		"tabSize": 2
	},
	"export": {
		"format": "markdown",
		"includeTimestamps": true
	},
	"lastUpdated": "2024-01-01T00:00:00.000Z",
	"version": "0.3.43"
}
```

## Provider Configuration

Each provider in the `provider` object follows this structure:

### Required Fields

- **`npm`**: NPM package name for the AI SDK integration
- **`name`**: Human-readable provider name
- **`options`**: Provider-specific configuration options
  - **`baseURL`**: API endpoint URL
- **`models`**: Object containing available models

### Optional Fields

- **`enabled`**: Whether the provider is active (boolean)
- **`apiKey`**: API authentication key (auto-managed via `/api-config`)
- **`description`**: Provider description for UI display
- **`setupInstructions`**: Help text for obtaining API keys

### Model Configuration

Each model in the `models` object:

```json
{
	"model-id": {
		"name": "Display Name",
		"description": "Model description (optional)",
		"enabled": true
	}
}
```

## Supported Providers

### Ollama (Local)

```json
{
	"npm": "@ai-sdk/openai-compatible",
	"name": "Ollama (local)",
	"enabled": true,
	"options": {
		"baseURL": "http://127.0.0.1:11434/v1"
	}
}
```

### OpenAI

```json
{
	"npm": "@ai-sdk/openai",
	"name": "OpenAI",
	"enabled": false,
	"apiKey": "sk-your-api-key",
	"options": {
		"baseURL": "https://api.openai.com/v1"
	}
}
```

### Google AI

```json
{
	"npm": "@ai-sdk/google",
	"name": "Google AI",
	"enabled": false,
	"apiKey": "your-api-key",
	"options": {
		"baseURL": "https://generativelanguage.googleapis.com/v1"
	}
}
```

### Anthropic

```json
{
	"npm": "@ai-sdk/anthropic",
	"name": "Anthropic",
	"enabled": false,
	"apiKey": "sk-ant-your-api-key",
	"options": {
		"baseURL": "https://api.anthropic.com/v1"
	}
}
```

## MCP Configuration

The Model Context Protocol section configures external tools and services:

```json
{
	"mcp": {
		"playwright": {
			"type": "remote",
			"url": "http://localhost:8931/sse",
			"enabled": true
		}
	}
}
```

## CLI Commands for Configuration

- **`/api-config`**: Interactive API key management
- **`/config`**: Show configuration file location
- **`/reset-config`**: Reset to default configuration
- **`/models`**: Browse and select available models

## Configuration Management

The configuration is automatically managed by Gilfoyle:

- **Auto-creation**: Config file is created with defaults on first run
- **Graceful merging**: New fields are added while preserving existing settings
- **Validation**: Invalid configurations fall back to defaults
- **Backup**: `lastUpdated` timestamp tracks configuration changes

## Adding Custom Providers

To add a new provider, extend the `provider` object:

```json
{
	"provider": {
		"custom-provider": {
			"npm": "@ai-sdk/custom",
			"name": "Custom Provider",
			"enabled": false,
			"options": {
				"baseURL": "https://api.custom.com/v1"
			},
			"models": {
				"custom-model": {
					"name": "Custom Model",
					"description": "Custom model description"
				}
			}
		}
	}
}
```

## Environment Variables

API keys can also be managed via environment variables:

- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`

The configuration file takes precedence over environment variables.

## Security Notes

- API keys are stored locally in the configuration file
- File permissions are set to be readable only by the user
- Keys are masked in the UI for security
- Consider using environment variables for shared/CI environments

## Migration from Legacy Format

If you have an older configuration format, Gilfoyle will automatically migrate it to the new schema while preserving your settings and API keys.
