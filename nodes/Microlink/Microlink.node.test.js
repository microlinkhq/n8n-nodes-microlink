'use strict';

jest.mock('n8n-workflow', () => ({
	NodeConnectionTypes: { Main: 'main' },
	NodeOperationError: class NodeOperationError extends Error {
		constructor(node, error, options = {}) {
			super(typeof error === 'string' ? error : error.message || String(error));
			this.name = 'NodeOperationError';
			this.node = node;
			this.context = { itemIndex: options.itemIndex };
		}
	},
}));

const { NodeOperationError } = require('n8n-workflow');
const {
	Microlink,
	isPlainObject,
	flattenObject,
	parseLooseValue,
	OBJECT_PARAMS,
} = require('./Microlink.node');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(paramOverrides = {}, credentialOverrides = {}) {
	const params = {
		operation: 'extract',
		url: 'https://example.com',
		responseMode: 'auto',
		options: {},
		additionalParams: {},
		binaryProperty: 'data',
		...paramOverrides,
	};

	const credentials = { apiKey: '', baseUrl: '', ...credentialOverrides };

	const inputItems = [{ json: {} }];

	const ctx = {
		getInputData: jest.fn().mockReturnValue(inputItems),
		getNodeParameter: jest.fn().mockImplementation((name, _itemIndex, defaultValue) => {
			if (name in params) return params[name];
			return defaultValue;
		}),
		getCredentials: jest.fn().mockResolvedValue(credentials),
		getNode: jest.fn().mockReturnValue({ name: 'Microlink' }),
		continueOnFail: jest.fn().mockReturnValue(false),
		helpers: {
			httpRequest: jest.fn().mockResolvedValue({ status: 'success', data: {} }),
			prepareBinaryData: jest.fn().mockResolvedValue({
				mimeType: 'application/octet-stream',
				data: 'base64data',
			}),
		},
	};

	return ctx;
}

function lastHttpCall(ctx) {
	return ctx.helpers.httpRequest.mock.calls[0][0];
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

describe('isPlainObject', () => {
	it('returns true for empty object', () => {
		expect(isPlainObject({})).toBe(true);
	});

	it('returns true for object with properties', () => {
		expect(isPlainObject({ a: 1, b: 'two' })).toBe(true);
	});

	it('returns true for nested objects', () => {
		expect(isPlainObject({ a: { b: { c: 1 } } })).toBe(true);
	});

	it('returns false for arrays', () => {
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject([1, 2, 3])).toBe(false);
	});

	it('returns false for null', () => {
		expect(isPlainObject(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isPlainObject(undefined)).toBe(false);
	});

	it('returns false for strings', () => {
		expect(isPlainObject('hello')).toBe(false);
	});

	it('returns false for numbers', () => {
		expect(isPlainObject(42)).toBe(false);
	});

	it('returns false for booleans', () => {
		expect(isPlainObject(true)).toBe(false);
		expect(isPlainObject(false)).toBe(false);
	});

	it('returns true for Date objects (typeof object)', () => {
		expect(isPlainObject(new Date())).toBe(true);
	});

	it('returns false for zero (falsy)', () => {
		expect(isPlainObject(0)).toBe(false);
	});

	it('returns false for empty string (falsy)', () => {
		expect(isPlainObject('')).toBe(false);
	});
});

describe('flattenObject', () => {
	it('flattens simple key-value with prefix', () => {
		const target = {};
		flattenObject('data', { author: '.author' }, target);
		expect(target).toEqual({ 'data.author': '.author' });
	});

	it('flattens nested objects', () => {
		const target = {};
		flattenObject('data', { author: { selector: '.author', attr: 'text' } }, target);
		expect(target).toEqual({
			'data.author.selector': '.author',
			'data.author.attr': 'text',
		});
	});

	it('serialises arrays to JSON strings', () => {
		const target = {};
		flattenObject('data', { tags: ['a', 'b'] }, target);
		expect(target).toEqual({ 'data.tags': '["a","b"]' });
	});

	it('handles deeply nested structures', () => {
		const target = {};
		flattenObject('root', { a: { b: { c: { d: 'deep' } } } }, target);
		expect(target).toEqual({ 'root.a.b.c.d': 'deep' });
	});

	it('handles empty prefix', () => {
		const target = {};
		flattenObject('', { key: 'value' }, target);
		expect(target).toEqual({ key: 'value' });
	});

	it('handles mixed values', () => {
		const target = {};
		flattenObject('p', { a: 1, b: { c: true }, d: [1, 2], e: 'str' }, target);
		expect(target).toEqual({
			'p.a': 1,
			'p.b.c': true,
			'p.d': '[1,2]',
			'p.e': 'str',
		});
	});

	it('merges into existing target', () => {
		const target = { existing: 'value' };
		flattenObject('new', { key: 'val' }, target);
		expect(target).toEqual({ existing: 'value', 'new.key': 'val' });
	});
});

describe('parseLooseValue', () => {
	it('returns non-string values unchanged', () => {
		expect(parseLooseValue(42)).toBe(42);
		expect(parseLooseValue(true)).toBe(true);
		expect(parseLooseValue(null)).toBe(null);
		expect(parseLooseValue(undefined)).toBe(undefined);
	});

	it('parses "true" to boolean true', () => {
		expect(parseLooseValue('true')).toBe(true);
	});

	it('parses "false" to boolean false', () => {
		expect(parseLooseValue('false')).toBe(false);
	});

	it('parses trimmed "true" / "false"', () => {
		expect(parseLooseValue('  true  ')).toBe(true);
		expect(parseLooseValue(' false ')).toBe(false);
	});

	it('parses integer strings to numbers', () => {
		expect(parseLooseValue('123')).toBe(123);
		expect(parseLooseValue('-45')).toBe(-45);
	});

	it('parses decimal strings to numbers', () => {
		expect(parseLooseValue('3.14')).toBe(3.14);
		expect(parseLooseValue('-0.5')).toBe(-0.5);
	});

	it('parses padded numbers', () => {
		expect(parseLooseValue(' 42 ')).toBe(42);
	});

	it('does not parse scientific notation', () => {
		expect(parseLooseValue('1e5')).toBe('1e5');
	});

	it('does not parse hex numbers', () => {
		expect(parseLooseValue('0xff')).toBe('0xff');
	});

	it('parses JSON objects', () => {
		expect(parseLooseValue('{"a":1}')).toEqual({ a: 1 });
	});

	it('parses JSON arrays', () => {
		expect(parseLooseValue('[1,2,3]')).toEqual([1, 2, 3]);
	});

	it('returns original string for invalid JSON objects', () => {
		expect(parseLooseValue('{ invalid }')).toBe('{ invalid }');
	});

	it('returns original string for invalid JSON arrays', () => {
		expect(parseLooseValue('[ not, json ]')).toBe('[ not, json ]');
	});

	it('returns empty string as-is', () => {
		expect(parseLooseValue('')).toBe('');
	});

	it('returns whitespace-only strings as-is', () => {
		expect(parseLooseValue('   ')).toBe('   ');
	});

	it('returns regular strings unchanged', () => {
		expect(parseLooseValue('hello world')).toBe('hello world');
	});

	it('parses zero', () => {
		expect(parseLooseValue('0')).toBe(0);
	});
});

describe('OBJECT_PARAMS', () => {
	it('is a Set', () => {
		expect(OBJECT_PARAMS).toBeInstanceOf(Set);
	});

	it('contains the expected keys', () => {
		for (const key of ['data', 'meta', 'headers', 'viewport', 'insights']) {
			expect(OBJECT_PARAMS.has(key)).toBe(true);
		}
	});

	it('has exactly five entries', () => {
		expect(OBJECT_PARAMS.size).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Node Description
// ---------------------------------------------------------------------------

describe('Microlink Node Description', () => {
	let node;

	beforeEach(() => {
		node = new Microlink();
	});

	it('has correct displayName', () => {
		expect(node.description.displayName).toBe('Microlink');
	});

	it('has correct internal name', () => {
		expect(node.description.name).toBe('microlink');
	});

	it('uses Main connection types', () => {
		expect(node.description.inputs).toContain('main');
		expect(node.description.outputs).toContain('main');
	});

	it('is usable as tool', () => {
		expect(node.description.usableAsTool).toBe(true);
	});

	it('declares optional microlinkApi credentials', () => {
		const cred = node.description.credentials[0];
		expect(cred.name).toBe('microlinkApi');
		expect(cred.required).toBe(false);
	});

	describe('operations', () => {
		const EXPECTED_OPERATIONS = [
			'extract',
			'screenshot',
			'pdf',
			'markdown',
			'audio',
			'video',
			'iframe',
			'insights',
			'palette',
		];

		let operationProp;

		beforeEach(() => {
			operationProp = node.description.properties.find((p) => p.name === 'operation');
		});

		it('defines the operation property', () => {
			expect(operationProp).toBeDefined();
			expect(operationProp.type).toBe('options');
		});

		it('defaults to extract', () => {
			expect(operationProp.default).toBe('extract');
		});

		it.each(EXPECTED_OPERATIONS)('includes "%s" operation', (op) => {
			const match = operationProp.options.find((o) => o.value === op);
			expect(match).toBeDefined();
			expect(match.description).toBeTruthy();
		});

		it('has exactly nine operations', () => {
			expect(operationProp.options).toHaveLength(9);
		});
	});

	describe('url property', () => {
		it('is required', () => {
			const urlProp = node.description.properties.find((p) => p.name === 'url');
			expect(urlProp).toBeDefined();
			expect(urlProp.required).toBe(true);
			expect(urlProp.type).toBe('string');
		});
	});

	describe('responseMode property', () => {
		let prop;

		beforeEach(() => {
			prop = node.description.properties.find((p) => p.name === 'responseMode');
		});

		it('exists with four options', () => {
			expect(prop).toBeDefined();
			expect(prop.options).toHaveLength(4);
		});

		it.each(['auto', 'json', 'text', 'binary'])('includes "%s" mode', (mode) => {
			expect(prop.options.find((o) => o.value === mode)).toBeDefined();
		});

		it('defaults to auto', () => {
			expect(prop.default).toBe('auto');
		});
	});

	describe('binaryProperty', () => {
		it('is only shown when responseMode is binary', () => {
			const prop = node.description.properties.find((p) => p.name === 'binaryProperty');
			expect(prop.displayOptions.show.responseMode).toEqual(['binary']);
		});
	});

	describe('options collection', () => {
		it('is a collection type', () => {
			const prop = node.description.properties.find((p) => p.name === 'options');
			expect(prop.type).toBe('collection');
			expect(prop.options.length).toBeGreaterThan(0);
		});
	});

	describe('additionalParams', () => {
		it('is a fixedCollection with multipleValues', () => {
			const prop = node.description.properties.find((p) => p.name === 'additionalParams');
			expect(prop.type).toBe('fixedCollection');
			expect(prop.typeOptions.multipleValues).toBe(true);
		});
	});
});

// ---------------------------------------------------------------------------
// execute() — Operations
// ---------------------------------------------------------------------------

describe('execute() — Operations', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	describe('extract (default)', () => {
		it('sends GET to the free API without operation-specific params', async () => {
			const ctx = createMockContext({ operation: 'extract' });
			await node.execute.call(ctx);
			const req = lastHttpCall(ctx);
			expect(req.method).toBe('GET');
			expect(req.url).toBe('https://api.microlink.io');
			expect(req.qs.url).toBe('https://example.com');
			expect(req.qs.screenshot).toBeUndefined();
			expect(req.qs.pdf).toBeUndefined();
		});

		it('returns full JSON response', async () => {
			const apiResponse = { status: 'success', data: { title: 'Example' } };
			const ctx = createMockContext({ operation: 'extract' });
			ctx.helpers.httpRequest.mockResolvedValue(apiResponse);
			const result = await node.execute.call(ctx);
			expect(result).toEqual([[{ json: apiResponse }]]);
		});
	});

	describe.each([
		['screenshot', 'screenshot'],
		['pdf', 'pdf'],
		['audio', 'audio'],
		['video', 'video'],
		['iframe', 'iframe'],
		['insights', 'insights'],
		['palette', 'palette'],
	])('%s operation', (operation, qsKey) => {
		it(`sets qs.${qsKey} = true`, async () => {
			const ctx = createMockContext({ operation });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[qsKey]).toBe(true);
		});
	});

	describe('markdown operation', () => {
		it('sets force, meta=false, embed, and data.markdown', async () => {
			const ctx = createMockContext({ operation: 'markdown' });
			await node.execute.call(ctx);
			const qs = lastHttpCall(ctx).qs;
			expect(qs.force).toBe(true);
			expect(qs.meta).toBe(false);
			expect(qs.embed).toBe('markdown');
			expect(qs['data.markdown.attr']).toBe('markdown');
		});

		it('returns auto-text response (embed is set)', async () => {
			const ctx = createMockContext({ operation: 'markdown' });
			ctx.helpers.httpRequest.mockResolvedValue('# Hello');
			const result = await node.execute.call(ctx);
			expect(result).toEqual([[{ json: { data: '# Hello' } }]]);
		});

		it('makes the request with json=false', async () => {
			const ctx = createMockContext({ operation: 'markdown' });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).json).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// execute() — Response Modes
// ---------------------------------------------------------------------------

describe('execute() — Response Modes', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('auto mode returns JSON when no embed is set', async () => {
		const apiResponse = { status: 'success', data: {} };
		const ctx = createMockContext({ responseMode: 'auto' });
		ctx.helpers.httpRequest.mockResolvedValue(apiResponse);
		const result = await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(true);
		expect(result).toEqual([[{ json: apiResponse }]]);
	});

	it('auto mode returns text when embed option is set', async () => {
		const ctx = createMockContext({
			responseMode: 'auto',
			options: { embed: 'screenshot.url' },
		});
		ctx.helpers.httpRequest.mockResolvedValue('https://cdn.example.com/img.png');
		const result = await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(false);
		expect(result).toEqual([[{ json: { data: 'https://cdn.example.com/img.png' } }]]);
	});

	it('json mode always returns full JSON', async () => {
		const apiResponse = { status: 'success', data: { title: 'Test' } };
		const ctx = createMockContext({ responseMode: 'json' });
		ctx.helpers.httpRequest.mockResolvedValue(apiResponse);
		const result = await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(true);
		expect(result).toEqual([[{ json: apiResponse }]]);
	});

	it('text mode returns data wrapper', async () => {
		const ctx = createMockContext({ responseMode: 'text' });
		ctx.helpers.httpRequest.mockResolvedValue('<html>content</html>');
		const result = await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(false);
		expect(result).toEqual([[{ json: { data: '<html>content</html>' } }]]);
	});

	describe('binary mode', () => {
		it('sets encoding to null on the request', async () => {
			const ctx = createMockContext({
				responseMode: 'binary',
				binaryProperty: 'file',
			});
			ctx.helpers.httpRequest.mockResolvedValue(Buffer.from('pdf-data'));
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).encoding).toBeNull();
			expect(lastHttpCall(ctx).json).toBe(false);
		});

		it('returns binary item with the configured property name', async () => {
			const binaryData = { mimeType: 'application/pdf', data: 'base64' };
			const ctx = createMockContext({
				responseMode: 'binary',
				binaryProperty: 'myFile',
			});
			ctx.helpers.httpRequest.mockResolvedValue(Buffer.from('pdf-data'));
			ctx.helpers.prepareBinaryData.mockResolvedValue(binaryData);
			const result = await node.execute.call(ctx);
			expect(result).toEqual([[{ json: {}, binary: { myFile: binaryData } }]]);
		});

		it('calls prepareBinaryData with a buffer', async () => {
			const ctx = createMockContext({ responseMode: 'binary' });
			ctx.helpers.httpRequest.mockResolvedValue(Buffer.from('content'));
			await node.execute.call(ctx);
			const callArgs = ctx.helpers.prepareBinaryData.mock.calls[0];
			expect(Buffer.isBuffer(callArgs[0])).toBe(true);
		});

		it('converts non-buffer responses to buffer', async () => {
			const ctx = createMockContext({ responseMode: 'binary' });
			ctx.helpers.httpRequest.mockResolvedValue('string-content');
			await node.execute.call(ctx);
			const callArgs = ctx.helpers.prepareBinaryData.mock.calls[0];
			expect(Buffer.isBuffer(callArgs[0])).toBe(true);
			expect(callArgs[0].toString()).toBe('string-content');
		});

		it('passes filename from qs to prepareBinaryData', async () => {
			const ctx = createMockContext({
				responseMode: 'binary',
				options: { filename: 'report.pdf' },
			});
			ctx.helpers.httpRequest.mockResolvedValue(Buffer.from('data'));
			await node.execute.call(ctx);
			const callArgs = ctx.helpers.prepareBinaryData.mock.calls[0];
			expect(callArgs[1]).toBe('report.pdf');
		});
	});
});

// ---------------------------------------------------------------------------
// execute() — Credentials & Base URL
// ---------------------------------------------------------------------------

describe('execute() — Credentials', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('uses free API when no API key is set', async () => {
		const ctx = createMockContext({}, { apiKey: '', baseUrl: '' });
		await node.execute.call(ctx);
		const req = lastHttpCall(ctx);
		expect(req.url).toBe('https://api.microlink.io');
		expect(req.headers).toEqual({});
	});

	it('uses pro API and sends x-api-key when API key is set', async () => {
		const ctx = createMockContext({}, { apiKey: 'my-key', baseUrl: '' });
		await node.execute.call(ctx);
		const req = lastHttpCall(ctx);
		expect(req.url).toBe('https://pro.microlink.io');
		expect(req.headers).toEqual({ 'x-api-key': 'my-key' });
	});

	it('uses custom base URL when provided', async () => {
		const ctx = createMockContext({}, { apiKey: 'key', baseUrl: 'https://custom.example.com' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).url).toBe('https://custom.example.com');
	});

	it('trims whitespace from custom base URL', async () => {
		const ctx = createMockContext({}, { apiKey: '', baseUrl: '  https://custom.io  ' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).url).toBe('https://custom.io');
	});

	it('falls back to pro URL when base URL is only whitespace and key is present', async () => {
		const ctx = createMockContext({}, { apiKey: 'key', baseUrl: '   ' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).url).toBe('https://pro.microlink.io');
	});

	it('handles null credentials gracefully', async () => {
		const ctx = createMockContext();
		ctx.getCredentials.mockResolvedValue(null);
		await node.execute.call(ctx);
		const req = lastHttpCall(ctx);
		expect(req.url).toBe('https://api.microlink.io');
		expect(req.headers).toEqual({});
	});

	it('handles undefined credentials gracefully', async () => {
		const ctx = createMockContext();
		ctx.getCredentials.mockResolvedValue(undefined);
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).url).toBe('https://api.microlink.io');
	});
});

// ---------------------------------------------------------------------------
// execute() — Simple Options
// ---------------------------------------------------------------------------

describe('execute() — Simple Options', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	describe('boolean options', () => {
		const BOOL_OPTIONS = [
			'adblock', 'animations', 'audio', 'video', 'iframe', 'insights',
			'palette', 'pdf', 'screenshot', 'meta', 'force', 'javascript',
			'prerender', 'ping', 'pdfLandscape', 'screenshotFullPage',
			'screenshotOmitBackground',
		];

		const QS_KEY_MAP = {
			pdfLandscape: 'pdf.landscape',
			screenshotFullPage: 'screenshot.fullPage',
			screenshotOmitBackground: 'screenshot.omitBackground',
		};

		it.each(BOOL_OPTIONS)('includes %s when set to true', async (optName) => {
			const ctx = createMockContext({ options: { [optName]: true } });
			await node.execute.call(ctx);
			const expectedKey = QS_KEY_MAP[optName] || optName;
			expect(lastHttpCall(ctx).qs[expectedKey]).toBe(true);
		});

		it.each(BOOL_OPTIONS)('includes %s when set to false (explicit)', async (optName) => {
			const ctx = createMockContext({ options: { [optName]: false } });
			await node.execute.call(ctx);
			const expectedKey = QS_KEY_MAP[optName] || optName;
			expect(lastHttpCall(ctx).qs[expectedKey]).toBe(false);
		});
	});

	describe('string options', () => {
		const STRING_OPTIONS = [
			['filter', 'author'],
			['device', 'iPhone X'],
			['colorScheme', 'dark'],
			['click', '#button'],
			['scroll', '1000'],
			['waitForSelector', '.loaded'],
			['waitUntil', 'networkidle0'],
			['proxy', 'http://proxy.example.com'],
			['filename', 'output.png'],
			['mediaType', 'screen'],
			['embed', 'screenshot.url'],
			['scripts', 'https://cdn.example.com/script.js'],
			['styles', 'body{background:red}'],
			['modules', 'https://cdn.example.com/mod.js'],
			['function', 'function() { return document.title }'],
		];

		it.each(STRING_OPTIONS)('includes %s when set', async (optName, optValue) => {
			const ctx = createMockContext({ options: { [optName]: optValue } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[optName]).toBe(optValue);
		});

		it.each(STRING_OPTIONS)('excludes %s when empty string', async (optName) => {
			const ctx = createMockContext({ options: { [optName]: '' } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[optName]).toBeUndefined();
		});
	});

	describe('number options', () => {
		const NUMBER_OPTIONS = [
			['waitForTimeout', 5000],
			['retry', 3],
			['timeout', 30000],
			['ttl', 86400],
			['staleTtl', 3600],
		];

		it.each(NUMBER_OPTIONS)('includes %s when non-zero', async (optName, optValue) => {
			const ctx = createMockContext({ options: { [optName]: optValue } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[optName]).toBe(optValue);
		});

		it.each(NUMBER_OPTIONS)('excludes %s when zero', async (optName) => {
			const ctx = createMockContext({ options: { [optName]: 0 } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[optName]).toBeUndefined();
		});
	});

	describe('PDF-specific string options', () => {
		const PDF_OPTIONS = [
			['pdfFormat', 'pdf.format', 'A4'],
			['pdfWidth', 'pdf.width', '210mm'],
			['pdfHeight', 'pdf.height', '297mm'],
			['pdfMargin', 'pdf.margin', '10mm'],
			['pdfPageRanges', 'pdf.pageRanges', '1-3'],
		];

		it.each(PDF_OPTIONS)('maps %s to qs key %s', async (optName, qsKey, value) => {
			const ctx = createMockContext({ options: { [optName]: value } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[qsKey]).toBe(value);
		});
	});

	describe('PDF scale option', () => {
		it('includes pdfScale when non-zero', async () => {
			const ctx = createMockContext({ options: { pdfScale: 1.5 } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs['pdf.scale']).toBe(1.5);
		});

		it('excludes pdfScale when zero', async () => {
			const ctx = createMockContext({ options: { pdfScale: 0 } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs['pdf.scale']).toBeUndefined();
		});
	});

	describe('screenshot-specific options', () => {
		const SS_OPTIONS = [
			['screenshotType', 'screenshot.type', 'jpeg'],
			['screenshotElement', 'screenshot.element', '#main'],
			['screenshotOverlay', 'screenshot.overlay', '{}'],
			['screenshotCodeScheme', 'screenshot.codeScheme', 'dracula'],
		];

		it.each(SS_OPTIONS)('maps %s to qs key %s', async (optName, qsKey, value) => {
			const ctx = createMockContext({ options: { [optName]: value } });
			await node.execute.call(ctx);
			expect(lastHttpCall(ctx).qs[qsKey]).toBe(value);
		});
	});

	it('excludes undefined options from query string', async () => {
		const ctx = createMockContext({ options: {} });
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(Object.keys(qs)).toEqual(['url']);
	});
});

// ---------------------------------------------------------------------------
// execute() — JSON Options (object merging)
// ---------------------------------------------------------------------------

describe('execute() — JSON Options', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('flattens dataJson into query string', async () => {
		const ctx = createMockContext({
			options: { dataJson: { author: { selector: '.author', attr: 'text' } } },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['data.author.selector']).toBe('.author');
		expect(qs['data.author.attr']).toBe('text');
	});

	it('merges dataJson with markdown operation data', async () => {
		const ctx = createMockContext({
			operation: 'markdown',
			options: { dataJson: { title: { selector: 'h1' } } },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['data.markdown.attr']).toBe('markdown');
		expect(qs['data.title.selector']).toBe('h1');
	});

	it('flattens metaJson into query string', async () => {
		const ctx = createMockContext({
			options: { metaJson: { logo: { selector: '.logo img', attr: 'src' } } },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['meta.logo.selector']).toBe('.logo img');
		expect(qs['meta.logo.attr']).toBe('src');
	});

	it('flattens headersJson into query string', async () => {
		const ctx = createMockContext({
			options: { headersJson: { 'Accept-Language': 'en-US' } },
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs['headers.Accept-Language']).toBe('en-US');
	});

	it('flattens viewportJson into query string', async () => {
		const ctx = createMockContext({
			options: { viewportJson: { width: 1920, height: 1080 } },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['viewport.width']).toBe(1920);
		expect(qs['viewport.height']).toBe(1080);
	});

	it('flattens insightsJson into query string', async () => {
		const ctx = createMockContext({
			options: { insightsJson: { lighthouse: true } },
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs['insights.lighthouse']).toBe(true);
	});

	it('ignores empty JSON objects', async () => {
		const ctx = createMockContext({
			options: { dataJson: {}, metaJson: {}, headersJson: {}, viewportJson: {}, insightsJson: {} },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(Object.keys(qs)).toEqual(['url']);
	});

	it('ignores non-object JSON values', async () => {
		const ctx = createMockContext({
			options: { dataJson: 'not-an-object' },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(Object.keys(qs).filter((k) => k.startsWith('data.'))).toHaveLength(0);
	});

	it('merges insights boolean with insightsJson', async () => {
		const ctx = createMockContext({
			operation: 'insights',
			options: { insightsJson: { lighthouse: true } },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['insights.lighthouse']).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// execute() — Additional Parameters
// ---------------------------------------------------------------------------

describe('execute() — Additional Parameters', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('adds simple key-value pairs to query string', async () => {
		const ctx = createMockContext({
			additionalParams: {
				param: [
					{ key: 'data.price.selector', value: '.price' },
				],
			},
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs['data.price.selector']).toBe('.price');
	});

	it('adds multiple parameters', async () => {
		const ctx = createMockContext({
			additionalParams: {
				param: [
					{ key: 'data.title.selector', value: 'h1' },
					{ key: 'data.title.attr', value: 'text' },
				],
			},
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['data.title.selector']).toBe('h1');
		expect(qs['data.title.attr']).toBe('text');
	});

	it('skips entries with empty keys', async () => {
		const ctx = createMockContext({
			additionalParams: {
				param: [
					{ key: '', value: 'ignored' },
					{ key: 'valid', value: 'kept' },
				],
			},
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['']).toBeUndefined();
		expect(qs.valid).toBe('kept');
	});

	it('parses boolean string values', async () => {
		const ctx = createMockContext({
			additionalParams: {
				param: [{ key: 'force', value: 'true' }],
			},
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.force).toBe(true);
	});

	it('parses numeric string values', async () => {
		const ctx = createMockContext({
			additionalParams: {
				param: [{ key: 'timeout', value: '30000' }],
			},
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.timeout).toBe(30000);
	});

	it('parses JSON object values and flattens them', async () => {
		const ctx = createMockContext({
			additionalParams: {
				param: [{ key: 'data', value: '{"author":{"selector":".author"}}' }],
			},
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs['data.author.selector']).toBe('.author');
	});

	it('handles absent param array gracefully', async () => {
		const ctx = createMockContext({ additionalParams: {} });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.url).toBe('https://example.com');
	});
});

// ---------------------------------------------------------------------------
// execute() — Query String Building
// ---------------------------------------------------------------------------

describe('execute() — Query String Building', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('always includes url in query string', async () => {
		const ctx = createMockContext({ url: 'https://test.com' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.url).toBe('https://test.com');
	});

	it('skips null values in paramBag', async () => {
		const ctx = createMockContext({ options: {} });
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		for (const value of Object.values(qs)) {
			expect(value).not.toBeNull();
		}
	});

	it('flattens object params (data, meta, headers, viewport, insights)', async () => {
		const ctx = createMockContext({
			options: {
				dataJson: { price: { selector: '.price' } },
				headersJson: { Authorization: 'Bearer xxx' },
			},
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs['data.price.selector']).toBe('.price');
		expect(qs['headers.Authorization']).toBe('Bearer xxx');
	});

	it('passes non-object params directly', async () => {
		const ctx = createMockContext({
			options: { adblock: true, device: 'Pixel 5' },
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs.adblock).toBe(true);
		expect(qs.device).toBe('Pixel 5');
	});
});

// ---------------------------------------------------------------------------
// execute() — Error Handling
// ---------------------------------------------------------------------------

describe('execute() — Error Handling', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('wraps errors in NodeOperationError when continueOnFail is false', async () => {
		const ctx = createMockContext();
		const error = new Error('API failure');
		ctx.helpers.httpRequest.mockRejectedValue(error);
		ctx.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(ctx)).rejects.toThrow(NodeOperationError);
	});

	it('preserves error context and adds itemIndex when context exists', async () => {
		const ctx = createMockContext();
		const error = new Error('fail');
		error.context = { existingInfo: true };
		ctx.helpers.httpRequest.mockRejectedValue(error);
		ctx.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(ctx)).rejects.toThrow(error);
		expect(error.context.itemIndex).toBe(0);
	});

	it('adds error to output and continues when continueOnFail is true', async () => {
		const inputItems = [{ json: { input: 'data' } }];
		const ctx = createMockContext();
		ctx.getInputData.mockReturnValue(inputItems);
		const error = new Error('soft failure');
		ctx.helpers.httpRequest.mockRejectedValue(error);
		ctx.continueOnFail.mockReturnValue(true);

		const result = await node.execute.call(ctx);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].error).toBe(error);
		expect(result[0][0].pairedItem).toBe(0);
	});

	it('includes original input json when continuing on fail', async () => {
		const inputItems = [{ json: { original: 'data' } }];
		const ctx = createMockContext();
		ctx.getInputData.mockReturnValue(inputItems);
		ctx.helpers.httpRequest.mockRejectedValue(new Error('fail'));
		ctx.continueOnFail.mockReturnValue(true);

		const result = await node.execute.call(ctx);
		expect(result[0][0].json).toEqual({ original: 'data' });
	});

	it('wraps string-like errors in NodeOperationError', async () => {
		const ctx = createMockContext();
		ctx.helpers.httpRequest.mockRejectedValue(new Error('something went wrong'));
		ctx.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(ctx)).rejects.toThrow('something went wrong');
	});
});

// ---------------------------------------------------------------------------
// execute() — Multiple Items
// ---------------------------------------------------------------------------

describe('execute() — Multiple Items', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('processes multiple input items', async () => {
		const inputItems = [
			{ json: { id: 1 } },
			{ json: { id: 2 } },
			{ json: { id: 3 } },
		];

		const paramsByIndex = {
			0: { operation: 'extract', url: 'https://a.com', responseMode: 'auto', options: {}, additionalParams: {} },
			1: { operation: 'screenshot', url: 'https://b.com', responseMode: 'auto', options: {}, additionalParams: {} },
			2: { operation: 'pdf', url: 'https://c.com', responseMode: 'auto', options: {}, additionalParams: {} },
		};

		const ctx = {
			getInputData: jest.fn().mockReturnValue(inputItems),
			getNodeParameter: jest.fn().mockImplementation((name, itemIndex, defaultValue) => {
				const params = paramsByIndex[itemIndex] || {};
				if (name in params) return params[name];
				return defaultValue;
			}),
			getCredentials: jest.fn().mockResolvedValue({ apiKey: '', baseUrl: '' }),
			getNode: jest.fn().mockReturnValue({ name: 'Microlink' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequest: jest.fn().mockResolvedValue({ status: 'success', data: {} }),
				prepareBinaryData: jest.fn(),
			},
		};

		const result = await node.execute.call(ctx);
		expect(result[0]).toHaveLength(3);
		expect(ctx.helpers.httpRequest).toHaveBeenCalledTimes(3);

		const urls = ctx.helpers.httpRequest.mock.calls.map((c) => c[0].qs.url);
		expect(urls).toEqual(['https://a.com', 'https://b.com', 'https://c.com']);

		expect(ctx.helpers.httpRequest.mock.calls[1][0].qs.screenshot).toBe(true);
		expect(ctx.helpers.httpRequest.mock.calls[2][0].qs.pdf).toBe(true);
	});

	it('continues processing remaining items after error with continueOnFail', async () => {
		const inputItems = [{ json: { id: 1 } }, { json: { id: 2 } }];

		const ctx = {
			getInputData: jest.fn().mockReturnValue(inputItems),
			getNodeParameter: jest.fn().mockImplementation((name, _idx, def) => {
				const params = { operation: 'extract', url: 'https://example.com', responseMode: 'auto', options: {}, additionalParams: {} };
				return name in params ? params[name] : def;
			}),
			getCredentials: jest.fn().mockResolvedValue({ apiKey: '', baseUrl: '' }),
			getNode: jest.fn().mockReturnValue({ name: 'Microlink' }),
			continueOnFail: jest.fn().mockReturnValue(true),
			helpers: {
				httpRequest: jest.fn()
					.mockRejectedValueOnce(new Error('fail'))
					.mockResolvedValueOnce({ status: 'success', data: {} }),
				prepareBinaryData: jest.fn(),
			},
		};

		const result = await node.execute.call(ctx);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].error).toBeDefined();
		expect(result[0][1].json).toEqual({ status: 'success', data: {} });
	});
});

// ---------------------------------------------------------------------------
// execute() — Option Overriding & Combinations
// ---------------------------------------------------------------------------

describe('execute() — Option Overrides & Combinations', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('options.embed overrides markdown defaults', async () => {
		const ctx = createMockContext({
			operation: 'markdown',
			options: { embed: 'custom.field' },
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.embed).toBe('custom.field');
	});

	it('options.force overrides markdown defaults', async () => {
		const ctx = createMockContext({
			operation: 'markdown',
			options: { force: false },
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.force).toBe(false);
	});

	it('combines operation flag with additional options', async () => {
		const ctx = createMockContext({
			operation: 'screenshot',
			options: {
				screenshotFullPage: true,
				screenshotType: 'jpeg',
				device: 'iPhone X',
				adblock: true,
			},
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs.screenshot).toBe(true);
		expect(qs['screenshot.fullPage']).toBe(true);
		expect(qs['screenshot.type']).toBe('jpeg');
		expect(qs.device).toBe('iPhone X');
		expect(qs.adblock).toBe(true);
	});

	it('combines PDF operation with PDF options', async () => {
		const ctx = createMockContext({
			operation: 'pdf',
			options: {
				pdfFormat: 'A4',
				pdfLandscape: true,
				pdfMargin: '10mm',
				pdfScale: 0.8,
			},
		});
		await node.execute.call(ctx);
		const qs = lastHttpCall(ctx).qs;
		expect(qs.pdf).toBe(true);
		expect(qs['pdf.format']).toBe('A4');
		expect(qs['pdf.landscape']).toBe(true);
		expect(qs['pdf.margin']).toBe('10mm');
		expect(qs['pdf.scale']).toBe(0.8);
	});

	it('additional params override options', async () => {
		const ctx = createMockContext({
			options: { device: 'iPhone X' },
			additionalParams: {
				param: [{ key: 'device', value: 'Pixel 5' }],
			},
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).qs.device).toBe('Pixel 5');
	});

	it('pro credentials combined with all option types', async () => {
		const ctx = createMockContext(
			{
				operation: 'screenshot',
				options: {
					adblock: true,
					screenshotFullPage: true,
					dataJson: { author: { selector: '.author' } },
				},
				additionalParams: {
					param: [{ key: 'timeout', value: '15000' }],
				},
			},
			{ apiKey: 'pro-key', baseUrl: '' },
		);
		await node.execute.call(ctx);
		const req = lastHttpCall(ctx);
		expect(req.url).toBe('https://pro.microlink.io');
		expect(req.headers['x-api-key']).toBe('pro-key');
		expect(req.qs.screenshot).toBe(true);
		expect(req.qs.adblock).toBe(true);
		expect(req.qs['screenshot.fullPage']).toBe(true);
		expect(req.qs['data.author.selector']).toBe('.author');
		expect(req.qs.timeout).toBe(15000);
	});
});

// ---------------------------------------------------------------------------
// execute() — Request Shape
// ---------------------------------------------------------------------------

describe('execute() — Request Shape', () => {
	const node = new Microlink();

	afterEach(() => jest.clearAllMocks());

	it('always uses GET method', async () => {
		const ctx = createMockContext();
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).method).toBe('GET');
	});

	it('sets json=true for JSON responses', async () => {
		const ctx = createMockContext({ responseMode: 'json' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(true);
	});

	it('sets json=false for text responses', async () => {
		const ctx = createMockContext({ responseMode: 'text' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(false);
	});

	it('sets json=false for binary responses', async () => {
		const ctx = createMockContext({ responseMode: 'binary' });
		ctx.helpers.httpRequest.mockResolvedValue(Buffer.from('data'));
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(false);
	});

	it('sets json=false for auto mode with embed', async () => {
		const ctx = createMockContext({
			responseMode: 'auto',
			options: { embed: 'screenshot.url' },
		});
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(false);
	});

	it('sets json=true for auto mode without embed', async () => {
		const ctx = createMockContext({ responseMode: 'auto' });
		await node.execute.call(ctx);
		expect(lastHttpCall(ctx).json).toBe(true);
	});
});
