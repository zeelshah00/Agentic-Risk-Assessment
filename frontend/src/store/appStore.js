import { create } from 'zustand';
import { tpaSet, tpaGetAll } from '../utils/tpa';
import { TPA_STORAGE_KEYS } from '../utils/tpaStorageKeys';

const useAppStore = create((set, get) => ({
  appId: null,
  isInBigIdInstance: true,
  activeTab: 'home',
  config: { geminiApiKey: '', bigidServerUrl: '', bigidAuthToken: '', isApiKeySetByEnv: false },
  bigidContext: null,
  // COMMENTED OUT - AGENT FUNCTIONALITY DISABLED
  // agents: [],
  mcpServers: [],
  mcpToolsCache: {},
  isLoading: true,
  isSaving: false,
  notification: null,
  messages: [],
  
  // Model selection state
  availableModels: [],
  selectedModel: 'gemini-2.5-pro',
  isLoadingModels: false,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),

  setAppId: (appId) => set({ appId }),
  setIsInBigIdInstance: (isInBigIdInstance) => set({ isInBigIdInstance }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setBigidContext: (bigidContext) => set({ bigidContext }),
  setConfig: (newConfig) => {
    set((state) => ({ config: { ...state.config, ...newConfig } }));
    const { appId, config } = get();
    if (appId) {
      // We only want to persist the API key, not the other dynamic config values
      const configToSave = { geminiApiKey: config.geminiApiKey };
      tpaSet(appId, TPA_STORAGE_KEYS.CONFIG, configToSave);
    }
  },
  // COMMENTED OUT - AGENT FUNCTIONALITY DISABLED
  /*
  setAgents: (agents) => {
    set({ agents });
    const { appId } = get();
    if (appId) {
      tpaSet(appId, TPA_STORAGE_KEYS.AGENTS, agents);
    }
  },
  */
  setMcpServers: (mcpServers) => {
    set({ mcpServers });
    const { appId } = get();
    if (appId) {
      tpaSet(appId, TPA_STORAGE_KEYS.MCP_SERVERS, mcpServers.filter(s => s.id !== 'bigid-mcp-local'));
    }
  },
  setMcpToolsCache: (mcpToolsCache) => set({ mcpToolsCache }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setNotification: (notification) => set({ notification }),
  
  showNotification: (message, type = 'success', duration = 3000) => {
    set({ notification: { message, type } });
    setTimeout(() => set({ notification: null }), duration);
  },

  // Model selection actions
  setAvailableModels: (models) => set({ availableModels: models }),
  setSelectedModel: (modelId) => {
    set({ selectedModel: modelId });
    const { appId } = get();
    if (appId) {
      tpaSet(appId, TPA_STORAGE_KEYS.SELECTED_MODEL, modelId);
      // Show notification that model selection was saved
      get().showNotification('AI model selection saved', 'success', 2000);
    }
  },
  setIsLoadingModels: (isLoading) => set({ isLoadingModels: isLoading }),

  loadAvailableModels: async () => {
    set({ isLoadingModels: true });
    try {
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch available models');
      }
      const data = await response.json();
      set({ availableModels: data.models });
    } catch (error) {
      console.error('Error loading models:', error);
      get().showNotification('Failed to load available models', 'error');
    } finally {
      set({ isLoadingModels: false });
    }
  },

  loadFromTpa: async (appId) => {
    if (!appId) {
      console.warn("appId not provided, skipping TPA load");
      return;
    }
    try {
      const allTpaData = await tpaGetAll(appId);
      const storedConfig = allTpaData?.[TPA_STORAGE_KEYS.CONFIG];
      // COMMENTED OUT - AGENT FUNCTIONALITY DISABLED
      // const storedAgents = allTpaData?.[TPA_STORAGE_KEYS.AGENTS];
      const storedMcpServers = allTpaData?.[TPA_STORAGE_KEYS.MCP_SERVERS];
      const storedSelectedModel = allTpaData?.[TPA_STORAGE_KEYS.SELECTED_MODEL];

      if (storedConfig) {
        set((state) => ({ config: { ...state.config, ...storedConfig } }));
      }
      // COMMENTED OUT - AGENT FUNCTIONALITY DISABLED
      /*
      if (storedAgents) {
        set({ agents: storedAgents });
      }
      */
      
      if (storedSelectedModel) {
        set({ selectedModel: storedSelectedModel });
      }
      
      set({ mcpServers: storedMcpServers || [] });
      
      const toolsCache = {};
      if (storedMcpServers) {
          for (const server of storedMcpServers) {
              // Load tools from server object (unified storage method)
              if (server.tools && Array.isArray(server.tools)) {
                  toolsCache[server.id] = server.tools;
              }
          }
      }
      // BigID tools are still stored separately as they're built-in
      const bigIdTools = allTpaData?.[TPA_STORAGE_KEYS.MCP_TOOLS_CACHE('bigid-mcp-local')];
      if (bigIdTools) {
          toolsCache['bigid-mcp-local'] = bigIdTools;
      }
      set({ mcpToolsCache: toolsCache });

      //get().showNotification('Data loaded from BigID TPA Storage.', 'info');

    } catch (error) {
      console.error("Error loading from TPA:", error);
      get().showNotification('Could not load data from TPA.', 'error');
    }
  }
}));

export default useAppStore;
