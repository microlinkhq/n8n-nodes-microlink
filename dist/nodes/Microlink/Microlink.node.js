"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Microlink = exports.OBJECT_PARAMS = void 0;
exports.isPlainObject = isPlainObject;
exports.flattenObject = flattenObject;
exports.parseLooseValue = parseLooseValue;
const { NodeConnectionTypes, NodeOperationError } = require('n8n-workflow');
exports.OBJECT_PARAMS = new Set(['data', 'meta', 'headers', 'viewport', 'insights']);
const BOOLEAN_OR_OBJECT_PARAMS = new Set(['screenshot', 'pdf']);
function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function flattenObject(prefix, obj, target) {
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (isPlainObject(value)) {
            flattenObject(path, value, target);
        }
        else if (Array.isArray(value)) {
            target[path] = JSON.stringify(value);
        }
        else {
            target[path] = value;
        }
    }
}
function parseLooseValue(value) {
    if (typeof value !== 'string')
        return value;
    const trimmed = value.trim();
    if (!trimmed)
        return value;
    if (trimmed === 'true')
        return true;
    if (trimmed === 'false')
        return false;
    if (!Number.isNaN(Number(trimmed)) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed);
        }
        catch {
            return value;
        }
    }
    return value;
}
function isMissingOptionalCredentialError(error) {
    if (!error || typeof error !== 'object')
        return false;
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return /does not require credentials|credentials?.*not.*set|credential.*not.*found|could not find credentials/i.test(message);
}
class Microlink {
    constructor() {
        this.description = {
            displayName: 'Microlink',
            name: 'microlink',
            icon: { light: 'file:microlink.svg', dark: 'file:microlink.svg' },
            group: ['input'],
            version: 1,
            description: 'Fetch metadata, media, and insights from any URL using Microlink',
            defaults: {
                name: 'Microlink',
            },
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            usableAsTool: true,
            credentials: [
                {
                    name: 'microlinkApi',
                    required: false,
                },
            ],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Extract',
                            value: 'extract',
                            description: 'Return metadata and extracted data for a URL',
                        },
                        {
                            name: 'Screenshot',
                            value: 'screenshot',
                            description: 'Generate a screenshot',
                        },
                        {
                            name: 'PDF',
                            value: 'pdf',
                            description: 'Generate a PDF',
                        },
                        {
                            name: 'Markdown',
                            value: 'markdown',
                            description: 'Return page content in Markdown',
                        },
                        {
                            name: 'Text',
                            value: 'text',
                            description: 'Return page content as plain text',
                        },
                        {
                            name: 'Audio',
                            value: 'audio',
                            description: 'Detect playable audio sources',
                        },
                        {
                            name: 'Video',
                            value: 'video',
                            description: 'Detect playable video sources',
                        },
                        {
                            name: 'Insights',
                            value: 'insights',
                            description: 'Get performance and technology insights',
                        },
                        {
                            name: 'Logo',
                            value: 'logo',
                            description: 'Return logo metadata, including logo.palette',
                        },
                    ],
                    default: 'extract',
                },
                {
                    displayName: 'URL',
                    name: 'url',
                    type: 'string',
                    default: '',
                    placeholder: 'https://example.com',
                    required: true,
                    description: 'The URL to analyze',
                },
                {
                    displayName: 'Response Mode',
                    name: 'responseMode',
                    type: 'options',
                    options: [
                        {
                            name: 'Auto',
                            value: 'auto',
                            description: 'JSON unless the request is embedded content',
                        },
                        {
                            name: 'JSON',
                            value: 'json',
                        },
                        {
                            name: 'Text',
                            value: 'text',
                        },
                        {
                            name: 'Binary',
                            value: 'binary',
                        },
                    ],
                    default: 'auto',
                },
                {
                    displayName: 'Binary Property',
                    name: 'binaryProperty',
                    type: 'string',
                    default: 'data',
                    description: 'Binary output property name',
                    displayOptions: {
                        show: {
                            responseMode: ['binary'],
                        },
                    },
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    options: [
                        {
                            displayName: 'Ad Block',
                            name: 'adblock',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Animations',
                            name: 'animations',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Audio',
                            name: 'audio',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Video',
                            name: 'video',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Insights',
                            name: 'insights',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Logo',
                            name: 'logo',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'PDF',
                            name: 'pdf',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Screenshot',
                            name: 'screenshot',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Meta',
                            name: 'meta',
                            type: 'boolean',
                            default: true,
                            description: 'Include metadata in the response',
                        },
                        {
                            displayName: 'Force',
                            name: 'force',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Filter',
                            name: 'filter',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Device',
                            name: 'device',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Color Scheme',
                            name: 'colorScheme',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Click',
                            name: 'click',
                            type: 'string',
                            default: '',
                            description: 'CSS selector to click before capture',
                        },
                        {
                            displayName: 'Scroll',
                            name: 'scroll',
                            type: 'string',
                            default: '',
                            description: 'Scroll instructions, e.g. "1000" or "#selector"',
                        },
                        {
                            displayName: 'Wait For Selector',
                            name: 'waitForSelector',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Wait For Timeout',
                            name: 'waitForTimeout',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Wait Until',
                            name: 'waitUntil',
                            type: 'string',
                            default: '',
                            description: 'load|domcontentloaded|networkidle0|networkidle2',
                        },
                        {
                            displayName: 'JavaScript',
                            name: 'javascript',
                            type: 'boolean',
                            default: true,
                        },
                        {
                            displayName: 'Prerender',
                            name: 'prerender',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Proxy',
                            name: 'proxy',
                            type: 'string',
                            default: '',
                            description: 'Proxy mode or URL',
                        },
                        {
                            displayName: 'Retry',
                            name: 'retry',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Timeout (ms)',
                            name: 'timeout',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'TTL (seconds)',
                            name: 'ttl',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Stale TTL (seconds)',
                            name: 'staleTtl',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Ping',
                            name: 'ping',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Filename',
                            name: 'filename',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Media Type',
                            name: 'mediaType',
                            type: 'string',
                            default: '',
                            description: 'screen or print',
                        },
                        {
                            displayName: 'Embed',
                            name: 'embed',
                            type: 'string',
                            default: '',
                            description: 'Return a specific field directly instead of JSON',
                        },
                        {
                            displayName: 'Scripts',
                            name: 'scripts',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Styles',
                            name: 'styles',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Modules',
                            name: 'modules',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Function',
                            name: 'function',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Headers (JSON)',
                            name: 'headersJson',
                            type: 'json',
                            default: {},
                        },
                        {
                            displayName: 'Data (JSON)',
                            name: 'dataJson',
                            type: 'json',
                            default: {},
                        },
                        {
                            displayName: 'Meta (JSON)',
                            name: 'metaJson',
                            type: 'json',
                            default: {},
                        },
                        {
                            displayName: 'Viewport (JSON)',
                            name: 'viewportJson',
                            type: 'json',
                            default: {},
                        },
                        {
                            displayName: 'Insights (JSON)',
                            name: 'insightsJson',
                            type: 'json',
                            default: {},
                        },
                        {
                            displayName: 'PDF Format',
                            name: 'pdfFormat',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Viewport Width',
                            name: 'viewportWidth',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Viewport Height',
                            name: 'viewportHeight',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Viewport Device Scale Factor',
                            name: 'viewportDeviceScaleFactor',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Viewport Is Mobile',
                            name: 'viewportIsMobile',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Viewport Has Touch',
                            name: 'viewportHasTouch',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Viewport Is Landscape',
                            name: 'viewportIsLandscape',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'PDF Landscape',
                            name: 'pdfLandscape',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'PDF Margin',
                            name: 'pdfMargin',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'PDF Page Ranges',
                            name: 'pdfPageRanges',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'PDF Scale',
                            name: 'pdfScale',
                            type: 'number',
                            default: 0,
                        },
                        {
                            displayName: 'Screenshot Type',
                            name: 'screenshotType',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Screenshot Full Page',
                            name: 'screenshotFullPage',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Screenshot Element',
                            name: 'screenshotElement',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Screenshot Omit Background',
                            name: 'screenshotOmitBackground',
                            type: 'boolean',
                            default: false,
                        },
                        {
                            displayName: 'Screenshot Overlay',
                            name: 'screenshotOverlay',
                            type: 'string',
                            default: '',
                        },
                        {
                            displayName: 'Screenshot Code Scheme',
                            name: 'screenshotCodeScheme',
                            type: 'string',
                            default: '',
                        },
                    ],
                },
                {
                    displayName: 'Additional Query Parameters',
                    name: 'additionalParams',
                    type: 'fixedCollection',
                    placeholder: 'Add Parameter',
                    default: {},
                    typeOptions: { multipleValues: true },
                    options: [
                        {
                            name: 'param',
                            displayName: 'Parameter',
                            values: [
                                {
                                    displayName: 'Key',
                                    name: 'key',
                                    type: 'string',
                                    default: '',
                                    placeholder: 'e.g. data.author.selector',
                                },
                                {
                                    displayName: 'Value',
                                    name: 'value',
                                    type: 'string',
                                    default: '',
                                    placeholder: 'e.g. .author',
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnItems = [];
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const operation = this.getNodeParameter('operation', itemIndex);
                const url = this.getNodeParameter('url', itemIndex);
                const responseMode = this.getNodeParameter('responseMode', itemIndex);
                const options = this.getNodeParameter('options', itemIndex, {});
                let credentials;
                try {
                    credentials = (await this.getCredentials('microlinkApi'));
                }
                catch (error) {
                    if (!isMissingOptionalCredentialError(error)) {
                        throw error;
                    }
                    credentials = undefined;
                }
                const apiKey = credentials?.apiKey || '';
                const baseUrl = (credentials?.baseUrl || '').trim() ||
                    (apiKey ? 'https://pro.microlink.io' : 'https://api.microlink.io');
                const paramBag = {};
                if (operation === 'screenshot')
                    paramBag.screenshot = true;
                if (operation === 'pdf')
                    paramBag.pdf = true;
                if (operation === 'audio')
                    paramBag.audio = true;
                if (operation === 'video')
                    paramBag.video = true;
                if (operation === 'insights')
                    paramBag.insights = true;
                // Microlink exposes palette data under the logo value (logo.palette).
                if (operation === 'logo')
                    paramBag.palette = true;
                if (operation === 'markdown') {
                    paramBag.force = true;
                    paramBag.meta = false;
                    paramBag.embed = 'markdown';
                    paramBag.data = { markdown: { attr: 'markdown' } };
                }
                if (operation === 'text') {
                    paramBag.force = true;
                    paramBag.meta = false;
                    paramBag.embed = 'text';
                    paramBag.data = { text: { attr: 'text' } };
                }
                const simpleOptions = [
                    ['adblock', options.adblock],
                    ['animations', options.animations],
                    ['audio', options.audio],
                    ['video', options.video],
                    ['insights', options.insights],
                    [
                        'palette',
                        options.logo,
                    ],
                    ['pdf', options.pdf],
                    ['screenshot', options.screenshot],
                    ['meta', options.meta],
                    ['force', options.force],
                    ['filter', options.filter],
                    ['device', options.device],
                    ['colorScheme', options.colorScheme],
                    ['click', options.click],
                    ['scroll', options.scroll],
                    ['waitForSelector', options.waitForSelector],
                    ['waitForTimeout', options.waitForTimeout],
                    ['waitUntil', options.waitUntil],
                    ['javascript', options.javascript],
                    ['prerender', options.prerender],
                    ['proxy', options.proxy],
                    ['retry', options.retry],
                    ['timeout', options.timeout],
                    ['ttl', options.ttl],
                    ['staleTtl', options.staleTtl],
                    ['ping', options.ping],
                    ['filename', options.filename],
                    ['mediaType', options.mediaType],
                    ['embed', options.embed],
                    ['scripts', options.scripts],
                    ['styles', options.styles],
                    ['modules', options.modules],
                    ['function', options.function],
                    ['pdf.format', options.pdfFormat],
                    [
                        'viewport.width',
                        options.viewportWidth !== undefined ? options.viewportWidth : options.pdfWidth,
                    ],
                    [
                        'viewport.height',
                        options.viewportHeight !== undefined ? options.viewportHeight : options.pdfHeight,
                    ],
                    ['viewport.deviceScaleFactor', options.viewportDeviceScaleFactor],
                    ['viewport.isMobile', options.viewportIsMobile],
                    ['viewport.hasTouch', options.viewportHasTouch],
                    ['viewport.isLandscape', options.viewportIsLandscape],
                    ['pdf.landscape', options.pdfLandscape],
                    ['pdf.margin', options.pdfMargin],
                    ['pdf.pageRanges', options.pdfPageRanges],
                    ['pdf.scale', options.pdfScale],
                    ['screenshot.type', options.screenshotType],
                    ['screenshot.fullPage', options.screenshotFullPage],
                    ['screenshot.element', options.screenshotElement],
                    ['screenshot.omitBackground', options.screenshotOmitBackground],
                    ['screenshot.overlay', options.screenshotOverlay],
                    ['screenshot.codeScheme', options.screenshotCodeScheme],
                ];
                for (const [key, value] of simpleOptions) {
                    if (value !== undefined && value !== '' && value !== 0) {
                        paramBag[key] = value;
                    }
                }
                const dataJson = options.dataJson;
                if (isPlainObject(dataJson) && Object.keys(dataJson).length) {
                    paramBag.data = { ...(isPlainObject(paramBag.data) ? paramBag.data : {}), ...dataJson };
                }
                const metaJson = options.metaJson;
                if (isPlainObject(metaJson) && Object.keys(metaJson).length) {
                    paramBag.meta = { ...(isPlainObject(paramBag.meta) ? paramBag.meta : {}), ...metaJson };
                }
                const headersJson = options.headersJson;
                if (isPlainObject(headersJson) && Object.keys(headersJson).length) {
                    paramBag.headers = { ...(isPlainObject(paramBag.headers) ? paramBag.headers : {}), ...headersJson };
                }
                const viewportJson = options.viewportJson;
                if (isPlainObject(viewportJson) && Object.keys(viewportJson).length) {
                    paramBag.viewport = { ...(isPlainObject(paramBag.viewport) ? paramBag.viewport : {}), ...viewportJson };
                }
                const insightsJson = options.insightsJson;
                if (isPlainObject(insightsJson) && Object.keys(insightsJson).length) {
                    paramBag.insights = {
                        ...(isPlainObject(paramBag.insights) ? paramBag.insights : {}),
                        ...insightsJson,
                    };
                }
                const additionalParamsRaw = this.getNodeParameter('additionalParams', itemIndex, {});
                const additionalParams = additionalParamsRaw.param || [];
                const qs = { url };
                for (const [key, value] of Object.entries(paramBag)) {
                    if (value === undefined || value === '' || value === null)
                        continue;
                    if (isPlainObject(value) && (exports.OBJECT_PARAMS.has(key) || BOOLEAN_OR_OBJECT_PARAMS.has(key))) {
                        if (BOOLEAN_OR_OBJECT_PARAMS.has(key))
                            delete qs[key];
                        flattenObject(key, value, qs);
                    }
                    else {
                        qs[key] = value;
                    }
                }
                for (const entry of additionalParams) {
                    const key = entry.key;
                    if (!key)
                        continue;
                    const value = parseLooseValue(entry.value);
                    if (isPlainObject(value)) {
                        if (BOOLEAN_OR_OBJECT_PARAMS.has(key))
                            delete qs[key];
                        flattenObject(key, value, qs);
                    }
                    else {
                        qs[key] = value;
                    }
                }
                const shouldReturnBinary = responseMode === 'binary';
                const shouldReturnText = responseMode === 'text';
                const shouldAutoText = responseMode === 'auto' && typeof qs.embed === 'string' && qs.embed !== '';
                const requestOptions = {
                    method: 'GET',
                    url: baseUrl,
                    qs,
                    json: !(shouldReturnBinary || shouldReturnText || shouldAutoText),
                    headers: apiKey ? { 'x-api-key': apiKey } : {},
                };
                if (shouldReturnBinary) {
                    requestOptions.encoding = null;
                }
                const response = await this.helpers.httpRequest(requestOptions);
                if (shouldReturnBinary) {
                    const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex);
                    const buffer = Buffer.isBuffer(response) ? response : Buffer.from(response);
                    const binaryData = await this.helpers.prepareBinaryData(buffer, qs.filename);
                    returnItems.push({ json: {}, binary: { [binaryProperty]: binaryData } });
                }
                else if (shouldReturnText || shouldAutoText) {
                    returnItems.push({ json: { data: response } });
                }
                else {
                    returnItems.push({ json: response });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnItems.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
                    continue;
                }
                if (error.context) {
                    error.context.itemIndex = itemIndex;
                    throw error;
                }
                throw new NodeOperationError(this.getNode(), error, { itemIndex });
            }
        }
        return [returnItems];
    }
}
exports.Microlink = Microlink;
//# sourceMappingURL=Microlink.node.js.map