import {readFile, createFile} from '../../tools/file-operations.js';

// Mock fs promises
jest.mock('fs', () => ({
	promises: {
		readFile: jest.fn(),
		writeFile: jest.fn(),
	},
}));

// Mock utils
jest.mock('../../tools/utils.js', () => ({
	isBlockedFile: jest.fn(),
}));

describe('File Operations', () => {
	const {promises: fs} = require('fs');
	const {isBlockedFile} = require('../../tools/utils.js');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('readFile', () => {
		it('should read file content successfully', async () => {
			isBlockedFile.mockReturnValue(false);
			fs.readFile.mockResolvedValue('Hello World');

			const result = await readFile({filepath: './test.txt'});

			expect(result).toBe('File content:\n\nHello World');
			expect(fs.readFile).toHaveBeenCalledWith('./test.txt', 'utf8');
		});

		it('should truncate long file content', async () => {
			isBlockedFile.mockReturnValue(false);
			const longContent = 'a'.repeat(1500);
			fs.readFile.mockResolvedValue(longContent);

			const result = await readFile({filepath: './long.txt'});

			expect(result).toContain('File content (first 1000 characters)');
			expect(result).toContain(longContent.slice(0, 1000));
			expect(result).toContain('[File truncated - 1500 total characters]');
		});

		it('should block access to sensitive files', async () => {
			isBlockedFile.mockReturnValue(true);

			const result = await readFile({filepath: './.env'});

			expect(result).toContain('Error reading file "./.env": Access denied');
			expect(result).toContain('This file contains sensitive information');
			expect(fs.readFile).not.toHaveBeenCalled();
		});

		it('should handle file not found errors', async () => {
			isBlockedFile.mockReturnValue(false);
			fs.readFile.mockRejectedValue(
				new Error('ENOENT: no such file or directory'),
			);

			const result = await readFile({filepath: './nonexistent.txt'});

			expect(result).toContain(
				'Error reading file "./nonexistent.txt": ENOENT: no such file or directory',
			);
		});

		it('should handle generic errors gracefully', async () => {
			isBlockedFile.mockReturnValue(false);
			fs.readFile.mockRejectedValue('Generic error');

			const result = await readFile({filepath: './test.txt'});

			expect(result).toContain(
				'Error reading file "./test.txt": File not found',
			);
		});
	});

	describe('createFile', () => {
		it('should create file successfully', async () => {
			fs.writeFile.mockResolvedValue(undefined);

			const result = await createFile({
				filepath: './new.txt',
				content: 'Hello World',
			});

			expect(result).toBe(
				'Successfully created file "./new.txt" with 11 characters.',
			);
			expect(fs.writeFile).toHaveBeenCalledWith(
				'./new.txt',
				'Hello World',
				'utf8',
			);
		});

		it('should handle file creation errors', async () => {
			fs.writeFile.mockRejectedValue(new Error('EACCES: permission denied'));

			const result = await createFile({
				filepath: './protected.txt',
				content: 'content',
			});

			expect(result).toContain(
				'Error creating file "./protected.txt": EACCES: permission denied',
			);
		});

		it('should handle generic write errors', async () => {
			fs.writeFile.mockRejectedValue('Generic error');

			const result = await createFile({
				filepath: './test.txt',
				content: 'content',
			});

			expect(result).toContain(
				'Error creating file "./test.txt": Write failed',
			);
		});

		it('should report correct character count', async () => {
			fs.writeFile.mockResolvedValue(undefined);

			const content = 'This is a longer content string with multiple words';
			const result = await createFile({
				filepath: './test.txt',
				content,
			});

			expect(result).toBe(
				`Successfully created file "./test.txt" with ${content.length} characters.`,
			);
		});

		it('should handle empty content', async () => {
			fs.writeFile.mockResolvedValue(undefined);

			const result = await createFile({
				filepath: './empty.txt',
				content: '',
			});

			expect(result).toBe(
				'Successfully created file "./empty.txt" with 0 characters.',
			);
		});
	});
});
