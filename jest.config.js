'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/*.test.js'],
	verbose: true,
	collectCoverageFrom: [
		'nodes/**/*.js',
		'credentials/**/*.js',
		'!**/*.test.js',
	],
};
