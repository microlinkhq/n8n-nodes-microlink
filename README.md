# n8n-nodes-microlink

Microlink.io integration for n8n. Fetch metadata, screenshots, PDFs, Markdown, audio/video sources, performance insights, and more using the Microlink API.

## Features
- One node with multiple operations: Extract, Screenshot, PDF, Markdown, Audio, Video, Iframe, Insights, Palette.
- Full Microlink parameter coverage via explicit options and arbitrary query parameters.
- Optional binary output for embedded responses.

## Installation
Use the standard n8n community nodes installation process. The package name is `n8n-nodes-microlink`.

## Credentials
Create **Microlink API** credentials:
- `API Key` (optional for free usage)
- `Base URL` (optional; leave empty for auto-select)

## Usage
Add the **Microlink** node, choose an operation, and set the URL.

### Markdown operation
This uses Microlink's `data` + `embed` pattern to return Markdown directly. You can override any setting via Options or Additional Query Parameters.

### Additional Query Parameters
Use dot-notation keys like `data.author.selector` or `headers.user-agent` to pass any parameter supported by the API.

## Development
- `npm install`
- `npm run build`
- `npm run dev`

## License
MIT
