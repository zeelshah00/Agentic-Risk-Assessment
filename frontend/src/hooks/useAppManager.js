import React from 'react';
import { sdk } from '@bigid/app-fw-ui-sdk';
import useAppStore from '../store/appStore';

export const useAppManager = () => {
    const {
        setAppId,
        setIsInBigIdInstance,
        setIsLoading,
        loadFromTpa,
        showNotification,
        setActiveTab,
    } = useAppStore();

    React.useEffect(() => {
        const initializeApp = async () => {
            setIsLoading(true);
            try {
                // Step 1: Get App ID from SDK
                await sdk.hidePageHeader(true);
                const params = await sdk.getRouteParams();
                const currentAppId = params?.id;

                if (!currentAppId) {
                    // Not in BigID instance, prompt for manual config
                    setIsInBigIdInstance(false);
                    return; // Stop initialization
                }
                
                // Set appId in the store for global access
                setAppId(currentAppId);

                // Step 2: Fetch all data concurrently, passing appId directly
                const [serverConfigRes, apiUrl, token] = await Promise.all([
                    fetch('/api/config'),
                    sdk.getApiUrl(),
                    sdk.getToken(),
                    loadFromTpa(currentAppId), // Pass appId directly
                ]);
                const serverConfig = await serverConfigRes.json();
                const bigidInfo = { bigidServerUrl: apiUrl, bigidAuthToken: token };

                // Step 3: Set bigidContext in store for components to use
                useAppStore.setState({ 
                    bigidContext: { 
                        bigidBaseUrl: apiUrl, 
                        bigidToken: token 
                    } 
                });

                // Step 4: Consolidate config and perform the check
                // We get the latest state directly from the store after TPA load
                const finalConfig = {
                    ...useAppStore.getState().config,
                    ...bigidInfo,
                    isApiKeySetByEnv: serverConfig.isApiKeySetByEnv,
                    isUsingRole: serverConfig.isUsingRole,
                    stdioSafeHostnames: serverConfig.stdioSafeHostnames || [],
                };
                
                // Update the store with the fully consolidated config
                useAppStore.setState({ config: finalConfig });

                // Step 4: Perform the final check
                if (!finalConfig.geminiApiKey && !finalConfig.isApiKeySetByEnv && !finalConfig.isUsingRole) {
                    setActiveTab('settings');
                    showNotification('Please configure your Gemini API Key to begin.', 'info');
                }

            } catch (error) {
                console.error("Error initializing app:", error);
                showNotification('Could not initialize the application.', 'error');
                setIsInBigIdInstance(false); // Assume failure means we can't operate
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
        // This effect should only run once on component mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {};
};
