import { sdk, API_METHODS } from '@bigid/app-fw-ui-sdk';

export const tpaGetAll = async (appId) => {
    if (!appId) {
        console.warn("appId not available, skipping TPA getAll");
        return {};
    }
    const path = `tpa/${appId}/storage`;
    console.log(`TPAgetAll with path: ${path}`);
    try {
        const response = await sdk.bigidAPI({
            path,
            method: API_METHODS.GET,
        });
        const allData = response.data.reduce((acc, curr) => {
            try {
                acc[curr.key] = JSON.parse(curr.value);
            } catch (e) {
                acc[curr.key] = curr.value;
            }
            return acc;
        }, {});
        return allData;
    } catch (error) {
        if (error?.response?.status === 404) {
            return {};
        }
        throw error;
    }
};

export const tpaGet = async (appId, key) => {
    if (!appId) {
        console.warn("appId not available, skipping TPA get");
        return;
    }
    const path = `tpa/${appId}/storage/key/${key}`;
    console.log(`TPAget with path: ${path}`);
    try {
        const response = await sdk.bigidAPI({
            path,
            method: API_METHODS.GET,
        });
        try {
            return JSON.parse(response.data.value);
        } catch (e) {
            return response.data.value;
        }
    } catch (error) {
        if (error?.response?.status === 404) {
            return undefined;
        }
        throw error;
    }
};

export const tpaSet = async (appId, key, value) => {
    if (!appId) {
        console.warn("appId not available, skipping TPA set");
        return;
    }
    const path = `tpa/${appId}/storage`;
    const data = {
        keysValues: [{
            key: key,
            value: typeof value === 'string' ? value : JSON.stringify(value)
        }]
    };
    return sdk.bigidAPI({
        path,
        method: API_METHODS.PUT,
        data: data,
    });
};
