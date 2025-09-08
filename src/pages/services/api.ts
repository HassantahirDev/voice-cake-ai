import axios from "axios";
import config from "@/lib/config";
import { VoiceCloneCreate, VoiceCloneResponse } from "@/types/voice";

const api = axios.create({
  // baseURL: "/api-proxy",
  baseURL: config.api.baseURL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only set Content-Type for non-FormData requests
    if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => { 
    return Promise.reject(error);
  }
); 

// Agent API functions
export const agentAPI = {
  createAgent: async (agentData: {
    name: string;
    voice_provider: string;
    voice_id: string;
    description: string;
    custom_instructions: string;
    model_provider: string;
    model_resource: string;
    agent_type: string;
    tool_ids?: string[];
  }) => {
    const response = await api.post('/agents/', agentData);
    return response.data;
  },
  
  getAgents: async () => {
    const response = await api.get('/agents/');
    return response.data;
  },
  
  getAgent: async (id: string) => {
    const response = await api.get(`/agents/${id}`);
    return response.data;
  },
  
  updateAgent: async (id: string, agentData: {
    name: string;
    voice_provider: string;
    voice_id: string;
    description: string;
    custom_instructions: string;
    model_provider: string;
    model_resource: string;
    agent_type: string;
    tool_ids?: string[];
  }) => {
    const response = await api.put(`/agents/${id}`, agentData);
    return response.data;
  },
  
  deleteAgent: async (id: string) => {
    const response = await api.delete(`/agents/${id}`);
    return response.data;
  },

  // LiveKit session creation for authenticated users
  createLiveKitSession: async (agentId: number) => {
    const response = await api.post('/livekit/session/start', {
      agent_id: agentId,
      participant_name: 'User'
    });
    return response.data;
  }
};

// Tools API functions
export const toolsAPI = {
  getTools: async () => {
    const response = await api.get('/tools/');
    return response.data;
  }
};

// Auth API functions
export const authAPI = {
  requestPasswordReset: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { 
      token, 
      new_password: newPassword 
    });
    return response.data;
  }
};

// Voice Clone API functions
export const voiceCloneAPI = {
  getVoiceClones: async (): Promise<VoiceCloneResponse[]> => {
    const response = await api.get('/voice-clones/');
    return response.data;
  },
  
  getVoiceClone: async (id: number): Promise<VoiceCloneResponse> => {
    const response = await api.get(`/voice-clones/${id}`);
    return response.data;
  },
  
  deleteVoiceClone: async (id: string): Promise<void> => {
    const response = await api.delete(`/voice-clones/${id}`);
    return response.data;
  },
  
  // Create voice clone with audio file (required by backend)
  createVoiceCloneWithAudio: async (
    voiceCloneData: VoiceCloneCreate, 
    audioFile: File
  ): Promise<VoiceCloneResponse> => {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('name', voiceCloneData.name);
    if (voiceCloneData.description) {
      formData.append('description', voiceCloneData.description);
    }
    if (voiceCloneData.language) {
      formData.append('language', voiceCloneData.language);
    }
    
    const response = await api.post('/voice-clones/', formData);
    return response.data;
  }
};

// Hamsa API functions
export const hamsaAPI = {
  getVoices: async (): Promise<any[]> => { // Replace 'any' with a proper type later
    const response = await api.get('/hamsa/voices');
    return response.data;
  }
};

export default api; 