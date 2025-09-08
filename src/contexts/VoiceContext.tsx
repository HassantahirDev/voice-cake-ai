import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { VoiceOption } from '@/lib/voiceConfig';
import { voiceCloneAPI, hamsaAPI } from '@/pages/services/api';
import type { VoiceCloneResponse } from '@/types/voice';

interface VoiceContextType {
  voices: {
    hume: VoiceOption[];
    cartesia: VoiceOption[];
    hamsa: VoiceOption[];
    custom: VoiceOption[];
  };
  isLoading: {
    hamsa: boolean;
    custom: boolean;
  };
  error: {
    hamsa: string | null;
    custom: string | null;
  };
  refreshHamsaVoices: () => Promise<void>;
  refreshCustomVoices: () => Promise<void>;
  getVoiceById: (id: string, provider?: string) => VoiceOption | undefined;
  getVoicesByProvider: (provider: string) => VoiceOption[];
  findHamsaVoiceByName: (name: string) => VoiceOption | undefined;
  findHamsaVoiceById: (id: string) => VoiceOption | undefined;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Transform voice clone API response to VoiceOption
const transformVoiceClone = (voiceClone: VoiceCloneResponse): VoiceOption => ({
  id: voiceClone.provider_voice_id,
  name: voiceClone.name,
  provider: voiceClone.provider || "custom",
  category: "Custom Clones",
  description: voiceClone.description || "Custom cloned voice",
  language: voiceClone.language,
});

interface VoiceProviderProps {
  children: ReactNode;
}

export function VoiceProvider({ children }: VoiceProviderProps) {
  const [voices, setVoices] = useState<VoiceContextType['voices']>({
    hume: [],
    cartesia: [],
    hamsa: [],
    custom: []
  });

  const [isLoading, setIsLoading] = useState({
    hamsa: false,
    custom: false
  });

  const [error, setError] = useState({
    hamsa: null as string | null,
    custom: null as string | null
  });

  // Load static voices from voiceConfig
  useEffect(() => {
    const loadStaticVoices = async () => {
      try {
        const { humeVoices, cartesiaVoices } = await import('@/lib/voiceConfig');
        setVoices(prev => ({
          ...prev,
          hume: humeVoices,
          cartesia: cartesiaVoices
        }));
      } catch (error) {
        console.error('Error loading static voices:', error);
      }
    };

    loadStaticVoices();
  }, []);

  // Fetch Hamsa voices
  const refreshHamsaVoices = async () => {
    setIsLoading(prev => ({ ...prev, hamsa: true }));
    setError(prev => ({ ...prev, hamsa: null }));

    try {
      const hamsaVoicesData = await hamsaAPI.getVoices();
      const transformedVoices: VoiceOption[] = hamsaVoicesData.map((voice: any) => ({
        id: voice.id,
        name: voice.name,
        provider: 'hamsa',
        category: voice.category || 'Hamsa',
        description: voice.description,
        language: voice.language
      }));

      setVoices(prev => ({
        ...prev,
        hamsa: transformedVoices
      }));
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch Hamsa voices';
      setError(prev => ({ ...prev, hamsa: errorMessage }));
      console.error('Error fetching Hamsa voices:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, hamsa: false }));
    }
  };

  // Fetch custom voices
  const refreshCustomVoices = async () => {
    setIsLoading(prev => ({ ...prev, custom: true }));
    setError(prev => ({ ...prev, custom: null }));

    try {
      const voiceClones = await voiceCloneAPI.getVoiceClones();
      const transformedClones = voiceClones.map(transformVoiceClone);
      
      setVoices(prev => ({
        ...prev,
        custom: transformedClones
      }));
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch custom voices';
      setError(prev => ({ ...prev, custom: errorMessage }));
      console.error('Error fetching custom voices:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, custom: false }));
    }
  };

  // Load voices on mount
  useEffect(() => {
    refreshHamsaVoices();
    refreshCustomVoices();
  }, []);

  // Helper functions
  const getVoiceById = (id: string, provider?: string): VoiceOption | undefined => {
    if (provider) {
      return voices[provider as keyof typeof voices]?.find(voice => voice.id === id);
    }
    
    // Search all providers
    for (const providerVoices of Object.values(voices)) {
      const voice = providerVoices.find(v => v.id === id);
      if (voice) return voice;
    }
    return undefined;
  };

  const getVoicesByProvider = (provider: string): VoiceOption[] => {
    if (provider === 'voicecake') {
      return voices.hume; // VoiceCake uses Hume voices
    }
    return voices[provider as keyof typeof voices] || [];
  };

  const findHamsaVoiceByName = (name: string): VoiceOption | undefined => {
    return voices.hamsa.find(voice => voice.name === name);
  };

  const findHamsaVoiceById = (id: string): VoiceOption | undefined => {
    return voices.hamsa.find(voice => voice.id === id);
  };

  const contextValue: VoiceContextType = {
    voices,
    isLoading,
    error,
    refreshHamsaVoices,
    refreshCustomVoices,
    getVoiceById,
    getVoicesByProvider,
    findHamsaVoiceByName,
    findHamsaVoiceById
  };

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoices(): VoiceContextType {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoices must be used within a VoiceProvider');
  }
  return context;
}
