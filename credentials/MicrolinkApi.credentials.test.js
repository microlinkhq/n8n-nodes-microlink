'use strict';

const { MicrolinkApi } = require('./MicrolinkApi.credentials');

describe('MicrolinkApi Credentials', () => {
	let credentials;

	beforeEach(() => {
		credentials = new MicrolinkApi();
	});

	it('has correct name', () => {
		expect(credentials.name).toBe('microlinkApi');
	});

	it('has correct displayName', () => {
		expect(credentials.displayName).toBe('Microlink API');
	});

	it('has documentation URL', () => {
		expect(credentials.documentationUrl).toBe('https://microlink.io/docs/api');
	});

	it('defines exactly two properties', () => {
		expect(credentials.properties).toHaveLength(2);
	});

	describe('apiKey property', () => {
		let prop;

		beforeEach(() => {
			prop = credentials.properties.find((p) => p.name === 'apiKey');
		});

		it('exists', () => {
			expect(prop).toBeDefined();
		});

		it('is a string type', () => {
			expect(prop.type).toBe('string');
		});

		it('defaults to empty string', () => {
			expect(prop.default).toBe('');
		});

		it('is marked as password', () => {
			expect(prop.typeOptions.password).toBe(true);
		});

		it('has a description mentioning optional', () => {
			expect(prop.description).toMatch(/optional/i);
		});
	});

	describe('baseUrl property', () => {
		let prop;

		beforeEach(() => {
			prop = credentials.properties.find((p) => p.name === 'baseUrl');
		});

		it('exists', () => {
			expect(prop).toBeDefined();
		});

		it('is a string type', () => {
			expect(prop.type).toBe('string');
		});

		it('defaults to empty string', () => {
			expect(prop.default).toBe('');
		});

		it('has pro URL as placeholder', () => {
			expect(prop.placeholder).toBe('https://pro.microlink.io');
		});

		it('has a description explaining auto-select', () => {
			expect(prop.description).toMatch(/auto-select/i);
		});
	});
});
