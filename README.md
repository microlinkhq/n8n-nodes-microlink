# n8n-nodes-microlink

> Microlink.io integration for n8n — fetch metadata, screenshots, PDFs, Markdown, plain text, audio/video sources, performance insights, logo data (including `logo.palette`), and more from any URL.

<a href="https://microlink.io"><img src="https://img.shields.io/badge/powered_by-microlink.io-blue?style=flat-square&color=%23EA407B" alt="Powered by microlink.io"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square&color=%237C3AED" alt="License: MIT"></a>
<a href="https://www.npmjs.com/package/n8n-nodes-microlink"><img src="https://img.shields.io/badge/n8n-community%20node-teal?style=flat-square&color=%230EA5A0" alt="n8n community node"></a>

---

- [Installation](#installation)
  - [In n8n (recommended)](#in-n8n-recommended)
  - [Local development](#local-development)
- [Credentials](#credentials)
- [Operations](#operations)
  - [Extract](#extract)
  - [Screenshot](#screenshot)
  - [PDF](#pdf)
  - [Markdown](#markdown)
  - [Text](#text)
  - [Audio](#audio)
  - [Video](#video)
  - [Insights](#insights)
  - [Logo](#logo)
- [Parameters Reference](#parameters-reference)
  - [Top-level Parameters](#top-level-parameters)
  - [Response Mode](#response-mode)
  - [Options](#options)
  - [Viewport Options](#viewport-options)
  - [PDF Options](#pdf-options)
  - [Screenshot Options](#screenshot-options)
  - [JSON Options](#json-options)
  - [Additional Query Parameters](#additional-query-parameters)
- [Internal Utilities](#internal-utilities)
  - [isPlainObject](#isplainobject)
  - [flattenObject](#flattenobject)
  - [parseLooseValue](#parseloosevalue)
  - [OBJECT\_PARAMS](#object_params)
- [Testing](#testing)
  - [Transpiling TypeScript](#transpiling-typescript)
  - [Running Tests](#running-tests)
  - [Test Architecture](#test-architecture)
  - [Why These Tests](#why-these-tests)
  - [Coverage](#coverage)
- [Publishing to n8n](#publishing-to-n8n)
- [License](#license)

---

## Installation

### In n8n (recommended)

1. Open your n8n instance.
2. Go to **Settings > Community Nodes**.
3. Enter `n8n-nodes-microlink` and click **Install**.
4. The **Microlink** node will appear in the node panel.

### Local development

```bash
git clone https://github.com/microlinkhq/n8n-nodes-microlink.git
cd n8n-nodes-microlink
npm install
npm run build
```

To link the node into a local n8n instance for testing:

```bash
# From this project's root
npm link

# From your n8n installation directory
npm link n8n-nodes-microlink

# Start n8n
npx n8n start
```

When developing locally, rebuild after source changes:

```bash
npm run build
```

---

## Credentials

Create **Microlink API** credentials inside n8n:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **API Key** | `string` (password) | No | Your Microlink Pro/Enterprise API key. Leave empty for free-tier usage. |
| **Base URL** | `string` | No | Override the API endpoint. Leave empty to auto-select: `https://api.microlink.io` (free) or `https://pro.microlink.io` (when an API key is set). |

The node automatically selects the correct endpoint based on whether an API key is present. When a key is provided, every request includes an `x-api-key` header.

---

## Operations

The Microlink node exposes **nine operations**, each targeting a different capability of the [Microlink API](https://microlink.io/docs/api).

### Extract

**Default operation.** Returns metadata and structured data for any URL — title, description, author, image, logo, publisher, language, and more.

```
Operation: Extract
URL: https://github.com
Response Mode: Auto
```

Returns the full Microlink API JSON response with `status` and `data` fields.

### Screenshot

Generates a [browser-rendered screenshot](https://microlink.io/screenshot) of the target page. Combines with [viewport options](#viewport-options) and [screenshot options](#screenshot-options) for resolution, full-page captures, element targeting, overlays, and format control.

```
Operation: Screenshot
URL: https://example.com
Options → Screenshot Full Page: true
Options → Screenshot Type: jpeg
```

### PDF

Generates a PDF document of the target page. Combines with [viewport options](#viewport-options) and [PDF options](#pdf-options) for rendering size, paper format, margins, landscape mode, and page ranges.

```
Operation: PDF
URL: https://example.com
Options → PDF Format: A4
Options → PDF Landscape: true
```

### Markdown

Returns the page content converted to Markdown. This operation uses a specialized configuration under the hood — it sets `force=true`, `meta=false`, `embed=markdown`, and extracts the markdown via Microlink's `data` + `embed` pattern.

```
Operation: Markdown
URL: https://example.com/blog/post
```

Returns the Markdown string directly as `{ data: "# Page Title\n..." }`.

### Text

Returns the page content converted to plain text. This operation mirrors Markdown behavior but uses text extraction under the hood — it sets `force=true`, `meta=false`, `embed=text`, and extracts text via Microlink's `data` + `embed` pattern.

```
Operation: Text
URL: https://example.com/blog/post
```

Returns the plain text string directly as `{ data: "Page Title ..." }`.

### Audio

Detects and returns playable audio sources from the target page (e.g., podcasts, music embeds, audio players).

```
Operation: Audio
URL: https://soundcloud.com/artist/track
```

### Video

Detects and returns playable video sources from the target page (e.g., YouTube, Vimeo, embedded players).

```
Operation: Video
URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Insights

Retrieves performance metrics and technology stack information for the target URL — Lighthouse scores, technology detection, and more.

```
Operation: Insights
URL: https://example.com
```

### Logo

Returns logo metadata from the target page, including `logo.palette`.

```
Operation: Logo
URL: https://example.com
```

---

## Parameters Reference

### Top-level Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| **Operation** | `options` | Yes | `extract` | One of: `extract`, `screenshot`, `pdf`, `markdown`, `text`, `audio`, `video`, `insights`, `logo`. |
| **URL** | `string` | Yes | — | The target URL to analyze. |
| **Response Mode** | `options` | Yes | `auto` | How to return the response. See below. |
| **Binary Property** | `string` | Only for `binary` mode | `data` | The output property name for binary data. |

### Response Mode

| Mode | Behavior |
|------|----------|
| **Auto** | Returns JSON by default. If `embed` is set in the query string (explicitly or via the Markdown operation), returns text instead. |
| **JSON** | Always returns the full Microlink API JSON response. |
| **Text** | Returns the raw response body as `{ data: <response> }`. |
| **Binary** | Downloads the response as binary data (e.g., screenshot image, PDF file) and attaches it to the configured binary property. Sets `encoding: null` on the HTTP request. |

### Options

All options are optional. Empty strings and zero values are automatically excluded from the request.
For `screenshot`, `pdf`, and `insights`, when nested options are present (e.g. `screenshot.fullPage`, `pdf.width`, `insights.lighthouse`), the node omits the top-level boolean (`screenshot=true`, `pdf=true`, `insights=true`) so nested values are not overridden.

#### Browser & Rendering

| Option | Type | API Parameter | Description |
|--------|------|---------------|-------------|
| Ad Block | `boolean` | `adblock` | Block ads during page load. |
| Animations | `boolean` | `animations` | Enable/disable CSS animations. |
| JavaScript | `boolean` | `javascript` | Enable/disable JavaScript execution (default: `true`). |
| Prerender | `boolean` | `prerender` | Pre-render the page with a headless browser. |
| Click | `string` | `click` | CSS selector to click before capture. |
| Scroll | `string` | `scroll` | Scroll instructions — pixel value (`"1000"`) or CSS selector (`"#footer"`). |
| Wait For Selector | `string` | `waitForSelector` | Wait until a CSS selector appears in the DOM. |
| Wait For Timeout | `number` | `waitForTimeout` | Wait a fixed number of milliseconds. |
| Wait Until | `string` | `waitUntil` | Navigation event: `load`, `domcontentloaded`, `networkidle0`, `networkidle2`. |
| Device | `string` | `device` | Emulate a device (e.g., `"iPhone X"`, `"Pixel 5"`). |
| Color Scheme | `options` | `colorScheme` | Force a preferred color scheme: `dark`, `light`, or `no-preference`. |
| Media Type | `string` | `mediaType` | CSS media type: `"screen"` or `"print"`. |
| Scripts | `string` | `scripts` | Inject external script URLs. |
| Styles | `string` | `styles` | Inject CSS styles. |
| Modules | `string` | `modules` | Inject ES module URLs. |
| Function | `string` | `function` | Execute a custom function on the page. |

#### Data & Response

| Option | Type | API Parameter | Description |
|--------|------|---------------|-------------|
| Meta | `boolean` | `meta` | Include metadata in the response (default: `true`). |
| Audio | `boolean` | `audio` | Include audio sources in the response. |
| Video | `boolean` | `video` | Include video sources in the response. |
| Insights | `boolean` | `insights` | Include performance insights in the response. |
| Logo | `boolean` | `palette` | Include logo data (including `logo.palette`) in the response. |
| PDF | `boolean` | `pdf` | Include PDF generation in the response. |
| Screenshot | `boolean` | `screenshot` | Include screenshot in the response. |
| Filter | `string` | `filter` | Filter response fields. |
| Embed | `string` | `embed` | Return a specific field directly instead of the full JSON envelope. |
| Filename | `string` | `filename` | Suggested filename for binary downloads. |

#### Caching & Network

| Option | Type | API Parameter | Description |
|--------|------|---------------|-------------|
| Force | `boolean` | `force` | Bypass the cache and generate a fresh response. |
| Retry | `number` | `retry` | Number of retry attempts on failure. |
| Timeout (Milliseconds) | `number` | `timeout` | Maximum time to wait for the page in milliseconds. |
| TTL (Seconds) | `number` | `ttl` | Cache time-to-live in seconds. |
| Stale TTL (Seconds) | `number` | `staleTtl` | Stale cache TTL in seconds. |
| Ping | `boolean` | `ping` | Warm the cache without returning data. |
| Proxy | `string` | `proxy` | Proxy mode or URL. |

### Viewport Options

These options map to Microlink's `viewport.*` API parameters and are compatible with screenshot and PDF rendering.

| Option | Type | API Parameter | Description |
|--------|------|---------------|-------------|
| Viewport Width | `number` | `viewport.width` | Page width in pixels. |
| Viewport Height | `number` | `viewport.height` | Page height in pixels. |
| Viewport Device Scale Factor | `number` | `viewport.deviceScaleFactor` | Device pixel ratio / scale factor. |
| Viewport Is Mobile | `boolean` | `viewport.isMobile` | Whether to emulate a mobile viewport. |
| Viewport Has Touch | `boolean` | `viewport.hasTouch` | Whether touch events are available. |
| Viewport Is Landscape | `boolean` | `viewport.isLandscape` | Whether to emulate landscape orientation. |

### PDF Options

| Option | Type | API Parameter | Description |
|--------|------|---------------|-------------|
| PDF Format | `string` | `pdf.format` | Paper format: `A4`, `Letter`, `Legal`, etc. |
| PDF Width | `string` | `pdf.width` | Custom page width (e.g., `"210mm"`). |
| PDF Height | `string` | `pdf.height` | Custom page height (e.g., `"297mm"`). |
| PDF Landscape | `boolean` | `pdf.landscape` | Landscape orientation. |
| PDF Margin | `string` | `pdf.margin` | Page margin (e.g., `"10mm"`). |
| PDF Page Ranges | `string` | `pdf.pageRanges` | Page range to print (e.g., `"1-3"`). |
| PDF Scale | `number` | `pdf.scale` | Scale factor (e.g., `0.8`). |

### Screenshot Options

| Option | Type | API Parameter | Description |
|--------|------|---------------|-------------|
| Screenshot Type | `string` | `screenshot.type` | Image format: `"png"` or `"jpeg"`. |
| Screenshot Full Page | `boolean` | `screenshot.fullPage` | Capture the entire scrollable page. |
| Screenshot Element | `string` | `screenshot.element` | CSS selector to capture a specific element. |
| Screenshot Omit Background | `boolean` | `screenshot.omitBackground` | Transparent background. |
| Screenshot Overlay Background | `string` | `screenshot.overlay.background` | Overlay background. Default: `linear-gradient(225deg, #FF057C 0%, #8D0B93 50%, #321575 100%)`. |
| Screenshot Overlay Browser | `string` | `screenshot.overlay.browser` | Overlay browser theme. Default: `dark`. |
| Screenshot Code Scheme | `string` | `screenshot.codeScheme` | Syntax highlighting theme. |

### JSON Options

For complex structured parameters, the node provides dedicated JSON fields that are automatically flattened into dot-notation query parameters.

| Option | API Prefix | Description |
|--------|------------|-------------|
| Data (JSON) | `data.*` | Custom data extraction rules. Example: `{ "author": { "selector": ".author", "attr": "text" } }` becomes `data.author.selector=.author&data.author.attr=text`. |
| Meta (JSON) | `meta.*` | Custom meta extraction rules. |
| Headers (JSON) | `headers.*` | Custom HTTP headers to send with the request. |
| Viewport (JSON) | `viewport.*` | Custom viewport dimensions and settings (advanced/nested form). |
| Insights (JSON) | `insights.*` | Insights configuration object. |

### Additional Query Parameters

For any Microlink API parameter not covered by the built-in options, use **Additional Query Parameters**. Each entry is a key-value pair.

- Keys support dot-notation (e.g., `data.author.selector`).
- Values are automatically parsed: `"true"` / `"false"` become booleans, numeric strings become numbers, and JSON strings are parsed and flattened.
- Additional parameters are applied last and **override** any previously set options.

This is also how to pass fields that support boolean **or** object payloads:

```
Key:   screenshot
Value: true

Key:   screenshot
Value: {"fullPage":true}
```

```
Key:   data.price.selector
Value: .product-price

Key:   force
Value: true
```

---

## Internal Utilities

The node exports four internal utilities used to build query strings from the nested options structure. These are also available for import if you need to use them in other contexts.

### isPlainObject

```js
isPlainObject(value) → boolean
```

Returns `true` if `value` is a non-null, non-array object. Used throughout the node to decide whether a value should be recursively flattened or passed as-is.

### flattenObject

```js
flattenObject(prefix, obj, target) → void
```

Recursively flattens a nested object into dot-notation key-value pairs on the `target` object. Arrays are serialized to JSON strings.

| Input | Output |
|-------|--------|
| `flattenObject('data', { author: { selector: '.a' } }, {})` | `{ 'data.author.selector': '.a' }` |
| `flattenObject('data', { tags: ['a', 'b'] }, {})` | `{ 'data.tags': '["a","b"]' }` |
| `flattenObject('', { key: 'val' }, {})` | `{ key: 'val' }` |

This is essential for the Microlink API, which accepts nested parameters as flat dot-notation query string keys.

### parseLooseValue

```js
parseLooseValue(value) → boolean | number | object | array | string
```

Coerces string values from Additional Query Parameters into their natural JavaScript types:

| Input | Output | Type |
|-------|--------|------|
| `"true"` | `true` | boolean |
| `"false"` | `false` | boolean |
| `"42"` | `42` | number |
| `"-3.14"` | `-3.14` | number |
| `'{"a":1}'` | `{ a: 1 }` | object |
| `'[1,2]'` | `[1, 2]` | array |
| `"hello"` | `"hello"` | string |
| `"1e5"` | `"1e5"` | string (scientific notation is not parsed) |

Non-string inputs are returned unchanged. Invalid JSON-like strings (e.g., `"{ invalid }"`) are kept as strings.

### OBJECT_PARAMS

```js
OBJECT_PARAMS = new Set(['data', 'meta', 'headers', 'viewport', 'insights'])
```

The set of parameter keys that, when their value is a plain object, should be flattened into dot-notation query parameters rather than passed directly. All other keys are passed as scalar values.

---

## Testing

### Transpiling TypeScript

This project is authored in TypeScript and compiled to `dist/` for n8n runtime usage.

```bash
# Compile source into dist/
npm run build
```

Generated artifacts:

```
dist/
  credentials/MicrolinkApi.credentials.js
  nodes/Microlink/Microlink.node.js
  nodes/Microlink/microlink.svg
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage report
npm run test:coverage

# Run a specific test file
npx jest nodes/Microlink/Microlink.node.test.js
npx jest credentials/MicrolinkApi.credentials.test.js
```

### Test Architecture

Tests are colocated next to the source files they cover, following n8n's own convention:

```
credentials/
  MicrolinkApi.credentials.ts          # source
  MicrolinkApi.credentials.test.js     # 12 tests
nodes/Microlink/
  Microlink.node.ts                    # source
  Microlink.node.test.js               # 240 tests
```

The `n8n-workflow` peer dependency is **fully mocked** — tests run without installing n8n itself. The mock provides `NodeConnectionTypes.Main` and a lightweight `NodeOperationError` class. The node's `execute()` method is tested by constructing a mock execution context that replicates n8n's runtime interface (`getInputData`, `getNodeParameter`, `getCredentials`, `helpers.httpRequest`, etc.) and calling `execute.call(mockContext)`.

### Why These Tests

The test suite is organized into **focused layers**, each with a distinct purpose:

| Layer | Tests | Why |
|-------|-------|-----|
| **Utility functions** (`isPlainObject`, `flattenObject`, `parseLooseValue`, `OBJECT_PARAMS`) | 27 | These pure functions are the foundation of query string construction. Testing them in isolation catches type-coercion bugs and edge cases (null, arrays, scientific notation, invalid JSON) before they propagate into API requests. |
| **Credential structure** | 12 | Credentials are loaded by n8n based on their declared structure. Incorrect names, missing defaults, or wrong types cause silent failures at runtime. These tests lock down the contract. |
| **Node description** | 17 | The description object is n8n's UI contract — operations, property types, defaults, and display conditions. A missing operation or wrong default can break the entire node in the n8n editor. Structural tests prevent regressions. |
| **Operations** (9 operations) | 15 | Each operation maps to different query parameters. The markdown and text operations have special behavior (force, meta, embed, data extraction). Operation tests verify the correct flags reach the HTTP request. |
| **Response modes** (auto, json, text, binary) | 11 | Response handling has four distinct code paths including buffer conversion, binary property naming, and automatic text detection via `embed`. These tests verify each path produces the correct output shape. |
| **Credentials & base URL** | 7 | The node auto-selects between free (`api.microlink.io`) and pro (`pro.microlink.io`) endpoints, handles custom URLs, whitespace trimming, and null/undefined credentials. These tests cover every routing combination. |
| **Simple options** (boolean, string, number) | 58 | Every option type has different inclusion/exclusion rules: booleans pass through even when `false`, strings are excluded when empty, numbers are excluded when zero. Parametric `it.each` tests cover all options in both included and excluded states. |
| **JSON options** (data, meta, headers, viewport, insights) | 9 | JSON options are merged with existing values and flattened into dot-notation. The merge logic is subtle — markdown/text operations pre-set `data`, and `insights` can be a boolean that needs overwriting. These tests verify correct merging and flattening. |
| **Additional parameters** | 7 | Additional params are the escape hatch for any API parameter. They support type coercion, JSON flattening, and override previously set values. Tests cover parsing, empty-key skipping, and override behavior. |
| **Query string building** | 4 | Validates the final assembly: URL is always present, nulls are filtered, objects are flattened, scalars pass through. |
| **Error handling** | 5 | Tests the three error paths: `NodeOperationError` wrapping, context preservation with `itemIndex`, and `continueOnFail` graceful degradation. |
| **Multiple items** | 2 | n8n processes items in batches. Tests verify independent per-item processing and that errors in one item don't block others when `continueOnFail` is enabled. |
| **Option overrides & combinations** | 6 | Real-world usage combines operations with options, credentials with additional params, and overrides at multiple levels. Integration-style tests verify these combinations work together correctly. |
| **Request shape** | 6 | HTTP method, `json` flag, and `encoding` must be set correctly for every response mode. These tests are the final gate before the request leaves the node. |

### Coverage

```
------------------------------|---------|----------|---------|---------|
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|
All files                     |   99.24 |    96.09 |     100 |     100 |
 MicrolinkApi.credentials.ts  |     100 |      100 |     100 |     100 |
 Microlink.node.ts            |   99.21 |    96.09 |     100 |     100 |
------------------------------|---------|----------|---------|---------|
```

**254 tests** across 2 test suites. 100% line and function coverage.

---

## Publishing to n8n

This package is published to npm by GitHub Actions with a [provenance](https://docs.npmjs.com/generating-provenance-statements) statement. Since **2026-05-01**, n8n [verified community nodes](https://docs.n8n.io/integrations/community-nodes/) must be published from CI with provenance — nodes published from a local machine are rejected for verification. (A plain local `npm publish` still works for an unverified npm/community install, but it will not pass verification.)

The release pipeline lives in [`.github/workflows/publish.yml`](.github/workflows/publish.yml): on every published GitHub Release it runs lint, tests, and build, then `npm publish --provenance --access public`.

### 1. Prerequisites

- A [npm account](https://www.npmjs.com/signup) with publish rights to the package.
- The `package.json` `name` field must start with `n8n-nodes-` (already set to `n8n-nodes-microlink`).
- The `n8n` field in `package.json` must list all credential and node files (already configured).
- The `keywords` array must include `"n8n-community-node-package"` (already present).

### 2. One-time setup: `NPM_TOKEN` secret

1. Create an npm **Automation** (or **Granular**) access token with publish rights.
2. In the GitHub repo, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Name it `NPM_TOKEN` and paste the token.

### 3. Verify locally before releasing

CI re-runs these, but check them first to avoid a failed release:

```bash
npm run lint
npm test
npm run build
```

### 4. Cut a release

```bash
npm version patch   # 0.1.0 → 0.1.1 (bug fixes); use minor / major as appropriate
git push --follow-tags
```

Then create a **GitHub Release** for the new tag (**Releases → Draft a new release → choose the tag → Publish release**). Publishing the release triggers `publish.yml`, which publishes to npm with provenance.

### 5. Verify the publish

- Watch the **Actions** tab for the "Publish to npm" run to finish green.
- Visit `https://www.npmjs.com/package/n8n-nodes-microlink` and confirm the **Provenance** badge appears on the new version.

### 6. Install in n8n

Once published, any n8n user can install it:

1. Open **Settings > Community Nodes** in their n8n instance.
2. Search for `n8n-nodes-microlink`.
3. Click **Install**.

The node appears in the editor immediately — no restart required on n8n Cloud. Self-hosted instances may need a restart.

### 7. Subsequent releases

Repeat steps 3–5: bump the version, push the tag, and publish a GitHub Release. n8n Cloud picks up new versions automatically; self-hosted users update via **Settings > Community Nodes > Update**.

---

## License

[MIT](LICENSE) &copy; [Microlink](https://microlink.io)
