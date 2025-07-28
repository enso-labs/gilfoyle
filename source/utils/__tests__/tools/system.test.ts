// Create a mock for execAsync that we can control
const mockExecAsync = jest.fn();

// Mock child_process and util properly
jest.mock('child_process', () => ({
	exec: jest.fn(),
}));

jest.mock('util', () => ({
	promisify: jest.fn(() => mockExecAsync),
}));

import {pwd, terminalCommand} from '../../tools/system.js';

// Mock utils
jest.mock('../../tools/utils.js', () => ({
	BLOCKED_FILE_PATTERNS: [/\.env/i, /\.key$/i],
}));

describe('System Tools', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockExecAsync.mockClear();
	});

	describe('pwd', () => {
		let originalCwd: () => string;

		beforeEach(() => {
			originalCwd = process.cwd;
		});

		afterEach(() => {
			process.cwd = originalCwd;
		});

		it('should return current directory successfully', () => {
			process.cwd = jest.fn().mockReturnValue('/home/user/project');

			const result = pwd();

			expect(result).toBe('Current directory: /home/user/project');
		});

		it('should handle errors gracefully', () => {
			process.cwd = jest.fn().mockImplementation(() => {
				throw new Error('Unable to get current directory');
			});

			const result = pwd();

			expect(result).toContain(
				'Error getting current directory: Unable to get current directory',
			);
		});

		it('should handle generic errors', () => {
			process.cwd = jest.fn().mockImplementation(() => {
				throw 'Generic error';
			});

			const result = pwd();

			expect(result).toContain(
				'Error getting current directory: Unknown error',
			);
		});
	});

	describe('terminalCommand', () => {
		it('should execute simple commands successfully', async () => {
			mockExecAsync.mockResolvedValue({
				stdout: 'file1.txt\nfile2.txt\n',
				stderr: '',
			});

			const result = await terminalCommand({command: 'ls'});

			expect(result).toContain('Command: ls');
			expect(result).toContain('file1.txt\nfile2.txt');
			expect(mockExecAsync).toHaveBeenCalledWith('ls', {
				timeout: 30000,
				maxBuffer: 1024 * 1024,
				cwd: process.cwd(),
			});
		});

		it('should handle stderr output', async () => {
			mockExecAsync.mockResolvedValue({
				stdout: '',
				stderr: 'Warning: something happened',
			});

			const result = await terminalCommand({command: 'some-command'});

			expect(result).toContain('Warning: something happened');
		});

		it('should truncate very long output', async () => {
			const longOutput = 'a'.repeat(6000);
			mockExecAsync.mockResolvedValue({
				stdout: longOutput,
				stderr: '',
			});

			const result = await terminalCommand({command: 'generate-long-output'});

			expect(result).toContain('Output (first 5000 characters)');
			expect(result).toContain(longOutput.slice(0, 5000));
			expect(result).toContain('[Output truncated - 6000 total characters]');
		});

		it('should respect custom timeout', async () => {
			mockExecAsync.mockResolvedValue({stdout: 'done', stderr: ''});

			await terminalCommand({command: 'ls', timeout: 5000});

			expect(mockExecAsync).toHaveBeenCalledWith('ls', {
				timeout: 5000,
				maxBuffer: 1024 * 1024,
				cwd: process.cwd(),
			});
		});

		it('should enforce maximum timeout of 60 seconds', async () => {
			mockExecAsync.mockResolvedValue({stdout: 'done', stderr: ''});

			await terminalCommand({command: 'ls', timeout: 120000});

			expect(mockExecAsync).toHaveBeenCalledWith('ls', {
				timeout: 60000, // Should be capped at 60 seconds
				maxBuffer: 1024 * 1024,
				cwd: process.cwd(),
			});
		});

		it('should block dangerous commands', async () => {
			const result = await terminalCommand({command: 'sudo rm -rf /'});

			expect(result).toContain('Command blocked for security reasons');
			expect(result).toContain('🚫 Blocked commands include');
			expect(mockExecAsync).not.toHaveBeenCalled();
		});

		it('should block commands with sensitive file references', async () => {
			const result = await terminalCommand({command: 'cat .env'});

			expect(result).toContain(
				'Command blocked - contains reference to sensitive files',
			);
			expect(result).toContain('🚫 Commands cannot reference sensitive files');
			expect(mockExecAsync).not.toHaveBeenCalled();
		});

		it('should reject commands that are too long', async () => {
			const longCommand = 'a'.repeat(600);

			const result = await terminalCommand({command: longCommand});

			expect(result).toContain('Command too long (maximum 500 characters)');
			expect(mockExecAsync).not.toHaveBeenCalled();
		});

		it('should handle timeout errors', async () => {
			const timeoutError = new Error('timeout');
			timeoutError.message = 'Command timed out';
			mockExecAsync.mockRejectedValue(timeoutError);

			const result = await terminalCommand({command: 'sleep 100'});

			expect(result).toContain('Command timed out');
		});

		it('should handle command not found errors', async () => {
			const enoentError = new Error('ENOENT');
			enoentError.message = 'ENOENT: command not found';
			mockExecAsync.mockRejectedValue(enoentError);

			const result = await terminalCommand({command: 'nonexistent-command'});

			expect(result).toContain('Command not found: "nonexistent-command"');
		});

		it('should handle permission denied errors', async () => {
			const eaccesError = new Error('EACCES');
			eaccesError.message = 'EACCES: permission denied';
			mockExecAsync.mockRejectedValue(eaccesError);

			const result = await terminalCommand({command: 'restricted-command'});

			expect(result).toContain('Permission denied: "restricted-command"');
		});

		it('should handle command exit codes', async () => {
			const exitError: any = new Error('Command failed');
			exitError.code = 1;
			exitError.stderr = 'Error: file not found';
			mockExecAsync.mockRejectedValue(exitError);

			const result = await terminalCommand({command: 'failing-command'});

			expect(result).toContain('Command failed with exit code 1');
			expect(result).toContain('Error: file not found');
		});

		it('should handle no output gracefully', async () => {
			mockExecAsync.mockResolvedValue({stdout: '', stderr: ''});

			const result = await terminalCommand({command: 'silent-command'});

			expect(result).toContain('Command completed (no output)');
		});

		it('should handle generic errors', async () => {
			mockExecAsync.mockRejectedValue('Generic error');

			const result = await terminalCommand({command: 'test'});

			expect(result).toContain('Error executing command "test": Unknown error');
		});
	});
});
