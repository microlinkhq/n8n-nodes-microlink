'use strict';

const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const jsoncParser = require('jsonc-eslint-parser');
const n8nNodesBase = require('eslint-plugin-n8n-nodes-base');

module.exports = [
	{
		// Build output and coverage reports are generated, never linted.
		ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
	},
	{
		// Core recommended rules for the hand-written JavaScript in this repo
		// (eslint/jest config, colocated tests). Scoped to .js so they don't
		// false-positive on TypeScript syntax — the TS compiler covers those.
		...js.configs.recommended,
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: {
				require: 'readonly',
				module: 'readonly',
				exports: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				process: 'readonly',
				console: 'readonly',
				Buffer: 'readonly',
				setTimeout: 'readonly',
				setInterval: 'readonly',
				clearTimeout: 'readonly',
				clearInterval: 'readonly',
				URL: 'readonly',
			},
		},
		rules: {
			...js.configs.recommended.rules,
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
	{
		files: ['**/*.test.js'],
		languageOptions: {
			globals: {
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				jest: 'readonly',
			},
		},
	},
	{
		// n8n's own lint rules for node implementations (run during verification).
		files: ['nodes/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: { ...n8nNodesBase.configs.nodes.rules },
	},
	{
		// n8n's own lint rules for credential definitions.
		files: ['credentials/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: { ...n8nNodesBase.configs.credentials.rules },
	},
	{
		// n8n's community-package rules validate package.json structure.
		files: ['package.json'],
		languageOptions: { parser: jsoncParser },
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: { ...n8nNodesBase.configs.community.rules },
	},
];
