import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

/**
 * Get the status of the git repository
 * @returns The status of the git repository
 */
export async function gitStatus() {
	try {
		// Check if we're in a git repository first
		await execAsync('git rev-parse --git-dir');

		// Get git status
		const {stdout} = await execAsync('git status --porcelain=v1');
		const {stdout: branch} = await execAsync('git branch --show-current');

		if (stdout.trim() === '') {
			return `Git status:
Branch: ${branch.trim() || 'unknown'}
Working tree clean - no changes to commit.`;
		}

		const lines = stdout.trim().split('\n');
		const modified = lines.filter(
			line => line.startsWith(' M') || line.startsWith('M '),
		).length;
		const added = lines.filter(line => line.startsWith('A ')).length;
		const deleted = lines.filter(
			line => line.startsWith(' D') || line.startsWith('D '),
		).length;
		const untracked = lines.filter(line => line.startsWith('??')).length;
		const staged = lines.filter(
			line => !line.startsWith(' ') && !line.startsWith('??'),
		).length;

		let statusSummary = `Git status:\nBranch: ${
			branch.trim() || 'unknown'
		}\n`;

		if (staged > 0) statusSummary += `Staged changes: ${staged}\n`;
		if (modified > 0) statusSummary += `Modified files: ${modified}\n`;
		if (added > 0) statusSummary += `Added files: ${added}\n`;
		if (deleted > 0) statusSummary += `Deleted files: ${deleted}\n`;
		if (untracked > 0) statusSummary += `Untracked files: ${untracked}\n`;

		return statusSummary;
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes('not a git repository')
		) {
			return 'Error: Not in a git repository.';
		}
		return `Error getting git status: ${
			error instanceof Error ? error.message : 'Git not available'
		}`;
	}
} 