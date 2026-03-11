export declare class MicrolinkApi {
    name: string;
    displayName: string;
    documentationUrl: string;
    properties: ({
        displayName: string;
        name: string;
        type: string;
        default: string;
        typeOptions: {
            password: boolean;
        };
        description: string;
        placeholder?: undefined;
    } | {
        displayName: string;
        name: string;
        type: string;
        default: string;
        placeholder: string;
        description: string;
        typeOptions?: undefined;
    })[];
}
