import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, RemoteTrack, Track, LocalAudioTrack } from 'livekit-client';
import { toast } from 'sonner';
import { agentAPI } from "@/pages/services/api";
import { publicAgentAPI } from "@/pages/services/publicApi";
import config from '@/lib/config';

// Inference states matching the existing useHumeInference pattern
export const INFERENCE_STATES = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING", 
  ACTIVE: "ACTIVE",
  ERROR: "ERROR"
} as const;

interface TranscriptionEntry {
  id: string;
  text: string;
  speaker: 'user' | 'agent';
  timestamp: Date;
  isFinal: boolean;
  confidence?: number;
  source?: string;
  participantId?: string;
  trackId?: string;
  duration?: number;
}

interface UnifiedVoiceAgentConfig {
  agentId: string;
  usePublicEndpoint?: boolean; // Flag to use public endpoint (no auth required)
}

interface VoiceSession {
  sessionId: string;
  roomName: string;
  token: string;
  url: string;
  participantIdentity: string;
  status: string;
}

export function useUnifiedVoiceAgent(hookConfig: UnifiedVoiceAgentConfig) {
  const { agentId, usePublicEndpoint = false } = hookConfig;
  
  // State matching useHumeInference interface
  const [inferenceState, setInferenceState] = useState<keyof typeof INFERENCE_STATES>('IDLE');
  const [isLoading, setIsLoading] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [transcriptionUpdateTrigger, setTranscriptionUpdateTrigger] = useState(0);
  
  // Refs for managing resources
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<VoiceSession | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const transcriptionIdCounter = useRef(0);

  // Start inference - unified for both TTS and STS agents
  const startInference = useCallback(async (targetAgentId?: string) => {
    const effectiveAgentId = targetAgentId || agentId;
    
    if (!effectiveAgentId) {
      toast.error('Agent ID is required');
      return;
    }

    if (inferenceState !== 'IDLE') {
      console.log('Inference already active or connecting');
      return;
    }

    setIsLoading(true);
    setInferenceState('CONNECTING');

    try {
      console.log('🚀 Starting unified LiveKit session for agent:', effectiveAgentId);
      
      // First get agent information
      const agentData = await publicAgentAPI.getAgent(effectiveAgentId);
      console.log('📋 Agent data retrieved:', agentData);
      
      // Use appropriate API service based on endpoint type
      let sessionData: VoiceSession;
      
      if (usePublicEndpoint) {
        // Use public API service
        sessionData = await publicAgentAPI.createLiveKitSession(effectiveAgentId);
      } else {
        // Use authenticated API service
        sessionData = await agentAPI.createLiveKitSession(parseInt(effectiveAgentId));
      }
      console.log('📋 Unified LiveKit session created:', sessionData);
      sessionRef.current = sessionData;

      // Create and connect to LiveKit room
      const room = new Room();
      roomRef.current = room;

      // Set up room event listeners
      room.on(RoomEvent.Connected, async () => {
        console.log('✅ Connected to unified LiveKit room');
        setIsConnected(true);
        setInferenceState('ACTIVE');
        setIsLoading(false);
        
        // Enable microphone for voice input
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMicOn(true);
          console.log('🎤 Microphone enabled for unified session');
          
          // Add audio level monitoring for user speaking detection
          room.localParticipant.audioTrackPublications.forEach((publication) => {
            if (publication.track) {
              const audioTrack = publication.track as LocalAudioTrack;
              console.log('🎵 Monitoring local audio track for speaking activity');
              
              // Monitor audio levels to detect speaking
              const monitorAudio = () => {
                if (audioTrack.mediaStreamTrack) {
                  console.log('🔊 Audio track active - monitoring for speech');
                }
              };
              
              audioTrack.on('muted', () => {
                console.log('🔇 Local audio track muted');
                setIsUserSpeaking(false);
              });
              
              audioTrack.on('unmuted', () => {
                console.log('🔊 Local audio track unmuted');
              });
              
              monitorAudio();
            }
          });
          
          toast.success('Voice session started successfully');
        } catch (error) {
          console.error('❌ Failed to enable microphone:', error);
          toast.error('Failed to enable microphone');
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 Disconnected from unified LiveKit room');
        setIsConnected(false);
        setInferenceState('IDLE');
        setIsMicOn(false);
        setIsUserSpeaking(false);
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('👤 Participant joined:', participant.identity);
      });

      // Add audio activity monitoring
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        console.log('🔊 Audio playback status changed');
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const userSpeaking = speakers.some(s => s.identity === room.localParticipant.identity);
        const agentSpeaking = speakers.some(s => s.identity !== room.localParticipant.identity);
        
        if (userSpeaking) {
          console.log('🗣️ User is actively speaking (detected by LiveKit)');
          setIsUserSpeaking(true);
        } else {
          console.log('🤐 User stopped speaking');
          setIsUserSpeaking(false);
        }
        
        if (agentSpeaking) {
          console.log('🤖 Agent is actively speaking');
        }
      });

      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log('📤 Track published:', publication.trackName, 'by', participant.identity);
        
        // Log when user's audio track is published (indicates audio being sent)
        if (participant.identity === room.localParticipant.identity && publication.kind === Track.Kind.Audio) {
          console.log('🎤 User audio track published - audio being sent to session');
          setIsUserSpeaking(true);
        }
      });

      room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
        console.log('📤 Track unpublished:', publication.trackName, 'by', participant.identity);
        
        // Log when user stops sending audio
        if (participant.identity === room.localParticipant.identity && publication.kind === Track.Kind.Audio) {
          console.log('🔇 User audio track unpublished - stopped sending audio');
          setIsUserSpeaking(false);
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('🎵 Subscribed to agent audio track (unified session)');
          const audioElement = track.attach();
          audioElement.autoplay = true;
          audioElement.volume = 1.0;
          document.body.appendChild(audioElement);
          
          // Add event listeners for audio playback
          audioElement.onplay = () => {
            console.log('🎵 Agent audio started playing');
            console.log('🤖 Agent is speaking (audio playback detected)');
          };
          audioElement.onended = () => {
            console.log('🔚 Agent audio ended');
            console.log('🤖 Agent finished speaking');
          };
          audioElement.onpause = () => console.log('⏸️ Agent audio paused');
          audioElement.onvolumechange = () => console.log('🔊 Agent audio volume changed:', audioElement.volume);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('🔇 Unsubscribed from agent audio track');
          track.detach();
        }
      });

      // Handle transcription events from LiveKit
      room.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {
        console.log('📝 Transcription received:', segments);
        
        segments.forEach(segment => {
          const isUser = participant?.identity === room.localParticipant.identity;
          
          // Log user speaking activity
          if (isUser) {
            console.log('🗣️ User speaking:', segment.text);
            setIsUserSpeaking(true);
            setIsTranscribing(true);
          } else {
            console.log('🤖 Agent speaking:', segment.text);
          }
          
          const transcriptionEntry: TranscriptionEntry = {
            id: `trans_${transcriptionIdCounter.current++}`,
            text: segment.text,
            speaker: isUser ? 'user' : 'agent',
            timestamp: new Date(),
            isFinal: segment.final,
            confidence: (segment as any).confidence,
            source: 'livekit',
            participantId: participant?.identity,
            trackId: publication?.trackSid
          };
          
          setTranscription(prev => [...prev, transcriptionEntry]);
          setTranscriptionUpdateTrigger(prev => prev + 1);
          
          // Reset speaking state when final transcript received
          if (segment.final && isUser) {
            setTimeout(() => {
              setIsUserSpeaking(false);
              setIsTranscribing(false);
            }, 500);
          }
        });
      });

      // Connect to the room
      await room.connect(sessionData.url, sessionData.token);

    } catch (error) {
      console.error('❌ Error starting unified voice session:', error);
      setInferenceState('ERROR');
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to start voice session');
    }
  }, [agentId, inferenceState]);

  // Stop inference
  const stopInference = useCallback(async () => {
    try {
      // Stop session on backend if we have a session
      if (sessionRef.current?.sessionId) {
        // For now, use direct fetch for session end since we don't have API service methods for this
        await fetch(`${config.api.baseURL}/livekit/session/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(usePublicEndpoint ? {} : { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
          },
          body: JSON.stringify({
            session_id: sessionRef.current.sessionId,
          }),
        });
      }
    } catch (error) {
      console.error('Error stopping session on backend:', error);
    }

    // Cleanup local resources
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    }

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Clean up any attached audio elements
    document.querySelectorAll('audio').forEach(audio => {
      if (audio.srcObject) {
        audio.remove();
      }
    });

    sessionRef.current = null;
    setIsConnected(false);
    setInferenceState('IDLE');
    setIsMicOn(false);
    setIsUserSpeaking(false);
    setIsLoading(false);
    
    toast.success('Voice session stopped');
  }, []);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    if (!roomRef.current) {
      toast.error('No active session');
      return;
    }

    try {
      if (isMicOn) {
        await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        setIsMicOn(false);
        console.log('🔇 Microphone muted');
      } else {
        await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        setIsMicOn(true);
        console.log('🎤 Microphone unmuted');
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      toast.error('Failed to toggle microphone');
    }
  }, [isMicOn]);

  // Save transcription
  const saveTranscription = useCallback(async () => {
    try {
      const transcriptionText = transcription
        .filter(entry => entry.isFinal)
        .map(entry => `[${entry.timestamp.toLocaleTimeString()}] ${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      const blob = new Blob([transcriptionText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('💾 Transcription saved');
    } catch (error) {
      console.error('Error saving transcription:', error);
      toast.error('Failed to save transcription');
    }
  }, [transcription]);

  // Clear transcription
  const clearTranscription = useCallback(() => {
    setTranscription([]);
    setTranscriptionUpdateTrigger(prev => prev + 1);
    console.log('🧹 Transcription cleared');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopInference();
    };
  }, [stopInference]);

  return {
    // State
    inferenceState,
    isLoading,
    isMicOn,
    isConnected,
    isUserSpeaking,
    isTranscribing,
    transcription,
    transcriptionUpdateTrigger,
    
    // Actions
    startInference,
    stopInference,
    toggleMic,
    saveTranscription,
    clearTranscription,
    
    // Placeholder functions for compatibility
    addAIResponseText: (text: string) => console.log('AI response:', text),
    onAIStartsSpeaking: () => console.log('AI started speaking'),
    onAIStopsSpeaking: () => console.log('AI stopped speaking'),
  };
}

// Default export for compatibility
export default useUnifiedVoiceAgent;
