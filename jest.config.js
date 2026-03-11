'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/*.test.js'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json',
				diagnostics: false,
			},
		],
	},
	verbose: true,
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'credentials/**/*.ts',
		'!**/*.test.js',
	],
};
