'use strict';

module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/*.test.js'],
	collectCoverageFrom: [
		'nodes/**/*.js',
		'credentials/**/*.js',
		'!**/*.test.js',
	],
};
