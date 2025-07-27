/**
 * Enhanced Input Handler
 * 
 * Manages input state, command suggestions, and keyboard navigation
 * for the smart slash command filtering system.
 */

import { commandRegistry, CommandSuggestion } from './commandRegistry.js';

export interface InputState {
	text: string;
	suggestions: CommandSuggestion[];
	selectedSuggestionIndex: number;
	showSuggestions: boolean;
	showHints: boolean;
	autocompletePreview: string | null;
}

export class InputHandler {
	private state: InputState;
	private listeners: Array<(state: InputState) => void> = [];

	constructor() {
		this.state = {
			text: '',
			suggestions: [],
			selectedSuggestionIndex: 0,
			showSuggestions: false,
			showHints: true,
			autocompletePreview: null,
		};
	}

	/**
	 * Subscribe to input state changes
	 */
	subscribe(listener: (state: InputState) => void): () => void {
		this.listeners.push(listener);
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Get current input state
	 */
	getState(): InputState {
		return { ...this.state };
	}

	/**
	 * Update input text and refresh suggestions
	 */
	updateText(text: string): void {
		this.state.text = text;
		this.refreshSuggestions();
		this.notifyListeners();
	}

	/**
	 * Handle character input
	 */
	handleCharacterInput(char: string): void {
		this.updateText(this.state.text + char);
	}

	/**
	 * Handle backspace/delete
	 */
	handleBackspace(): void {
		if (this.state.text.length > 0) {
			this.updateText(this.state.text.slice(0, -1));
		}
	}

	/**
	 * Handle arrow key navigation
	 */
	handleArrowKey(direction: 'up' | 'down'): boolean {
		if (!this.state.showSuggestions || this.state.suggestions.length === 0) {
			return false;
		}

		const maxIndex = Math.min(this.state.suggestions.length - 1, 4); // Max 5 suggestions shown
		
		if (direction === 'up') {
			this.state.selectedSuggestionIndex = Math.max(0, this.state.selectedSuggestionIndex - 1);
		} else {
			this.state.selectedSuggestionIndex = Math.min(maxIndex, this.state.selectedSuggestionIndex + 1);
		}

		this.notifyListeners();
		return true; // Indicates the key was handled
	}

	/**
	 * Handle tab completion
	 */
	handleTabCompletion(): boolean {
		if (this.state.showSuggestions && this.state.suggestions.length > 0) {
			const selectedSuggestion = this.state.suggestions[this.state.selectedSuggestionIndex];
			if (selectedSuggestion) {
				this.updateText(selectedSuggestion.command.name + ' ');
				return true;
			}
		}

		// Try autocomplete preview
		if (this.state.autocompletePreview) {
			this.updateText(this.state.autocompletePreview + ' ');
			return true;
		}

		return false;
	}

	/**
	 * Get the currently selected command for execution
	 */
	getSelectedCommand(): string | null {
		if (this.state.showSuggestions && this.state.suggestions.length > 0) {
			const selectedSuggestion = this.state.suggestions[this.state.selectedSuggestionIndex];
			return selectedSuggestion?.command.name || null;
		}
		return null;
	}

	/**
	 * Clear input and reset state
	 */
	clear(): void {
		this.state = {
			text: '',
			suggestions: [],
			selectedSuggestionIndex: 0,
			showSuggestions: false,
			showHints: true,
			autocompletePreview: null,
		};
		this.notifyListeners();
	}

	/**
	 * Check if input represents a valid command
	 */
	isValidCommand(): boolean {
		if (!this.state.text.startsWith('/')) {
			return false;
		}

		const command = commandRegistry.findCommand(this.state.text.trim());
		return command !== undefined;
	}

	/**
	 * Refresh command suggestions based on current input
	 */
	private refreshSuggestions(): void {
		const shouldShowSuggestions = this.state.text.startsWith('/') && this.state.text.length > 0;
		
		if (shouldShowSuggestions) {
			this.state.suggestions = commandRegistry.filterCommands(this.state.text);
			this.state.showSuggestions = this.state.suggestions.length > 0;
			this.state.showHints = false;
			this.state.selectedSuggestionIndex = 0;

			// Update autocomplete preview
			this.state.autocompletePreview = commandRegistry.getAutocompleteSuggestion(this.state.text);
		} else {
			this.state.suggestions = [];
			this.state.showSuggestions = false;
			this.state.showHints = this.state.text.length === 0;
			this.state.selectedSuggestionIndex = 0;
			this.state.autocompletePreview = null;
		}
	}

	/**
	 * Notify all listeners of state changes
	 */
	private notifyListeners(): void {
		this.listeners.forEach(listener => listener(this.getState()));
	}
}