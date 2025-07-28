export default {
	preset: 'ts-jest/presets/default-esm',
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	testEnvironment: 'node',
	testMatch: [
		'**/__tests__/**/*.(test|spec).(ts|tsx)',
		'**/*.(test|spec).(ts|tsx)',
	],
	testPathIgnorePatterns: ['/node_modules/', '/.worktrees/', '/dist/'],
	collectCoverageFrom: ['source/**/*.{ts,tsx}', '!source/**/*.d.ts'],
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: {
					module: 'ES2022',
					moduleResolution: 'node',
					target: 'ES2022',
				},
			},
		],
	},
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	testTimeout: 10000,
};
