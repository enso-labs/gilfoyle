import {webSearch} from './web-search.js';
import {mathCalculator} from './math-calculator.js';
import {fileSearch} from './file-search.js';
import {readFile, createFile} from './file-operations.js';
import {gitStatus} from './git.js';
import {pwd, terminalCommand} from './system.js';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const mathCalculatorTool = tool(
	mathCalculator,
	{
		name: 'math_calculator',
		description: 'Calculate the result of a mathematical expression',
		schema: z.object({
			expression: z.string().describe('The expression to calculate'),
		}),
	},
);

export const readFileTool = tool(
	readFile,
	{
		name: 'read_file',
		description: 'Read the content of a file',
		schema: z.object({
			filepath: z.string().describe('The path to the file'),
		}),
	},
);

export const createFileTool = tool(
	createFile,
	{
		name: 'create_file',
		description: 'Create a new file',
		schema: z.object({
			filepath: z.string().describe('The path to the file'),
			content: z.string().describe('The content of the file'),
		}),
	},
);


export const fileSearchTool = tool(
	fileSearch,
	{
		name: 'file_search',
		description: 'Search for files in the current directory',
		schema: z.object({
			pattern: z.string().describe('The pattern to search for'),
			directory: z.string().describe('The directory to search in'),
		}),
	},
);

export const webSearchTool = tool(
	webSearch,
	{
		name: 'web_search',
		description: 'Search the web for information',
		schema: z.object({
			query: z.string().describe('The query to search for'),
		}),
	},
);

export const pwdTool = tool(
	pwd,
	{
		name: 'pwd',
		description: 'Get the current working directory',
		schema: z.object({}),
	},
);

export const terminalCommandTool = tool(
	terminalCommand,
	{
		name: 'terminal_command',
		description: 'Execute a terminal command',
		schema: z.object({
			command: z.string().describe('The command to execute'),
			timeout: z.number().describe('The timeout in milliseconds'),
		}),
	},
);

export const gitStatusTool = tool(
	gitStatus,
	{
		name: 'git_status',
		description: 'Get the status of the git repository',
	},
);

export const tools = {
	web_search: webSearch,
	math_calculator: mathCalculator,
	file_search: fileSearch,
	read_file: readFile,
	create_file: createFile,
	git_status: gitStatus,
	pwd: pwd,
	terminal_command: terminalCommand,
};

export const tools = [
	webSearchTool,
	mathCalculatorTool,
	fileSearchTool,
	readFileTool,
	createFileTool,
	gitStatusTool,
	pwdTool,
	terminalCommandTool,
];
