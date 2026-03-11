export class MicrolinkApi {
	name = 'microlinkApi';

	displayName = 'Microlink API';

	documentationUrl = 'https://microlink.io/docs/api';

	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: { password: true },
			description: 'Optional. Required for Pro/Enterprise features and higher rate limits.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://pro.microlink.io',
			description:
				'Leave empty to auto-select. Uses https://api.microlink.io when no key is set, otherwise https://pro.microlink.io.',
		},
	];
}
