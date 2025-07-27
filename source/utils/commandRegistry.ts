/**
 * Command Registry System
 * 
 * Provides a centralized, extensible registry for all application commands
 * with support for filtering, autocomplete, and command discovery.
 */

export interface CommandDefinition {
	name: string;
	description: string;
	category: 'navigation' | 'agent' | 'config' | 'system';
	aliases?: string[];
	hidden?: boolean;
	icon?: string;
}

export interface CommandSuggestion {
	command: CommandDefinition;
	matchScore: number;
	matchReason: 'exact' | 'prefix' | 'alias' | 'description';
}

class CommandRegistry {
	private commands: Map<string, CommandDefinition> = new Map();

	constructor() {
		this.initializeDefaultCommands();
	}

	/**
	 * Initialize the default command set
	 */
	private initializeDefaultCommands(): void {
		const defaultCommands: CommandDefinition[] = [
			{
				name: '/help',
				description: 'Show available commands and usage information',
				category: 'system',
				icon: '❓',
			},
			{
				name: '/chat',
				description: 'Start or continue a chat session with the AI agent',
				category: 'agent',
				icon: '💬',
			},
			{
				name: '/init',
				description: 'Initialize agent memory and create configuration documentation',
				category: 'agent',
				icon: '🚀',
			},
			{
				name: '/models',
				description: 'View and select from available AI models',
				category: 'config',
				icon: '🤖',
			},
			{
				name: '/api-config',
				description: 'Configure API keys and connection settings',
				category: 'config',
				icon: '🔑',
			},
			{
				name: '/config',
				description: 'Display current configuration file path and settings',
				category: 'config',
				icon: '⚙️',
			},
			{
				name: '/reset-config',
				description: 'Reset configuration to default values',
				category: 'config',
				icon: '🔄',
			},
			{
				name: '/home',
				description: 'Return to the main application home screen',
				category: 'navigation',
				aliases: ['home'],
				icon: '🏠',
			},
			{
				name: '/exit',
				description: 'Exit the application',
				category: 'system',
				aliases: ['/quit', 'exit', 'quit'],
				icon: '🚪',
			},
			{
				name: 'clear',
				description: 'Clear command history and reset display',
				category: 'system',
				icon: '🧹',
			},
		];

		defaultCommands.forEach(cmd => this.registerCommand(cmd));
	}

	/**
	 * Register a new command in the registry
	 */
	registerCommand(command: CommandDefinition): void {
		this.commands.set(command.name, command);

		// Register aliases if present
		if (command.aliases) {
			command.aliases.forEach(alias => {
				this.commands.set(alias, { ...command, name: alias });
			});
		}
	}

	/**
	 * Get all registered commands (excluding hidden and aliases)
	 */
	getAllCommands(): CommandDefinition[] {
		const uniqueCommands = new Map<string, CommandDefinition>();
		
		this.commands.forEach(cmd => {
			if (!cmd.hidden && !uniqueCommands.has(cmd.name)) {
				uniqueCommands.set(cmd.name, cmd);
			}
		});

		return Array.from(uniqueCommands.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Get commands by category
	 */
	getCommandsByCategory(category: CommandDefinition['category']): CommandDefinition[] {
		return this.getAllCommands().filter(cmd => cmd.category === category);
	}

	/**
	 * Find command by name or alias
	 */
	findCommand(name: string): CommandDefinition | undefined {
		return this.commands.get(name);
	}

	/**
	 * Filter commands based on user input with intelligent matching
	 */
	filterCommands(input: string): CommandSuggestion[] {
		if (!input.startsWith('/')) {
			return [];
		}

		const searchTerm = input.slice(1).toLowerCase(); // Remove the '/' prefix
		const suggestions: CommandSuggestion[] = [];

		this.getAllCommands().forEach(command => {
			const commandName = command.name.startsWith('/') ? command.name.slice(1) : command.name;
			const score = this.calculateMatchScore(searchTerm, command, commandName);

			if (score > 0) {
				suggestions.push({
					command,
					matchScore: score,
					matchReason: this.getMatchReason(searchTerm, command, commandName),
				});
			}
		});

		// Sort by relevance score (highest first)
		return suggestions.sort((a, b) => b.matchScore - a.matchScore);
	}

	/**
	 * Calculate match score for a command against search term
	 */
	private calculateMatchScore(searchTerm: string, command: CommandDefinition, commandName: string): number {
		if (!searchTerm) {
			return 1; // Show all commands when no search term
		}

		// Exact match gets highest score
		if (commandName === searchTerm) {
			return 100;
		}

		// Prefix match gets high score
		if (commandName.startsWith(searchTerm)) {
			return 90 - searchTerm.length; // Shorter prefixes score higher
		}

		// Check aliases for exact or prefix matches
		if (command.aliases) {
			for (const alias of command.aliases) {
				const aliasName = alias.startsWith('/') ? alias.slice(1) : alias;
				if (aliasName === searchTerm) {
					return 85;
				}
				if (aliasName.startsWith(searchTerm)) {
					return 80 - searchTerm.length;
				}
			}
		}

		// Fuzzy match in command name
		if (commandName.includes(searchTerm)) {
			return 70 - (commandName.indexOf(searchTerm) * 2);
		}

		// Match in description (lower priority)
		if (command.description.toLowerCase().includes(searchTerm)) {
			return 50 - (command.description.toLowerCase().indexOf(searchTerm) * 2);
		}

		return 0; // No match
	}

	/**
	 * Determine the reason for the match
	 */
	private getMatchReason(searchTerm: string, command: CommandDefinition, commandName: string): CommandSuggestion['matchReason'] {
		if (commandName === searchTerm) {
			return 'exact';
		}

		if (commandName.startsWith(searchTerm)) {
			return 'prefix';
		}

		// Check aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				const aliasName = alias.startsWith('/') ? alias.slice(1) : alias;
				if (aliasName === searchTerm || aliasName.startsWith(searchTerm)) {
					return 'alias';
				}
			}
		}

		if (command.description.toLowerCase().includes(searchTerm)) {
			return 'description';
		}

		return 'prefix'; // Default fallback
	}

	/**
	 * Get command suggestions for autocomplete
	 */
	getAutocompleteSuggestion(input: string): string | null {
		const suggestions = this.filterCommands(input);
		
		if (suggestions.length === 0) {
			return null;
		}

		const topSuggestion = suggestions[0];
		if (topSuggestion && topSuggestion.matchReason === 'prefix' && input.length > 1) {
			return topSuggestion.command.name;
		}

		return null;
	}
}

// Singleton instance
export const commandRegistry = new CommandRegistry();