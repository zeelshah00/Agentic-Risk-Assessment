const createTpaStorageHelpers = (bigidBaseUrl, tpaId, bigidToken) => {
    // Sanitize the base URL to ensure it doesn't contain the API path,
    // which is added by the helper.
    const sanitizedBaseUrl = bigidBaseUrl.replace(/\/api\/v1\/?$/, '');

    const getTpaStorage = async (key) => {
        const url = `${sanitizedBaseUrl}/api/v1/tpa/${tpaId}/storage/key/${key}`;
        try {
            const response = await fetch(url, { headers: { 'Authorization': `${bigidToken}` } });
            if (response.status === 404) {
                return undefined; // Key not found is a normal case
            }
            if (!response.ok) {
                throw new Error(`Failed to get TPA storage for key '${key}'. Status: ${response.status}`);
            }
            const data = await response.json();
            // Values are stored as strings, so we need to parse them.
            return JSON.parse(data.value);
        } catch (e) {
            // This can happen if the value is not valid JSON, or if JSON.parse fails.
            // We'll return the raw value, or undefined if there was a non-JSON related error.
            // A more robust solution might check the error type.
            const response = await fetch(url, { headers: { 'Authorization': `${bigidToken}` } });
            if(response.ok) {
                const data = await response.json();
                return data.value;
            }
            return undefined;
        }
    };

    const setTpaStorage = async (key, value) => {
        const url = `${sanitizedBaseUrl}/api/v1/tpa/${tpaId}/storage`;
        const payload = {
            keysValues: [{
                key: key,
                value: typeof value === 'string' ? value : JSON.stringify(value)
            }]
        };
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `${bigidToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Failed to set TPA storage for key: ${key}. Status: ${response.status}`);
    };

    return { getTpaStorage, setTpaStorage };
};

module.exports = {
    createTpaStorageHelpers,
};
