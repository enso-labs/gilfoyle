import {webSearch} from './web-search.js';
import {mathCalculator} from './math-calculator.js';
import {fileSearch} from './file-search.js';
import {readFile, createFile} from './file-operations.js';
import {gitStatus} from './git.js';
import {pwd, terminalCommand} from './system.js';

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
