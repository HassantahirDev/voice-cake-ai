import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Mic,
  MicOff,
  Play,
  Square,
  Volume2,
  VolumeX,
  Loader2,
  Radio,
  Settings,
  MessageSquare,
  Download,
  Trash2,
  Music,
  Volume1,
  Volume
} from "lucide-react";
import useUnifiedVoiceAgent, { INFERENCE_STATES } from "@/hooks/useUnifiedVoiceAgent";
import { toast } from "sonner";

const Inference = () => {
  const { agentId } = useParams();
  const [isAmbientSoundOn, setIsAmbientSoundOn] = useState(false);
  const [backgroundVolume, setBackgroundVolume] = useState(0.3);
  const [isBackgroundAudioPlaying, setIsBackgroundAudioPlaying] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState('background-chatter.mp3');
  const [usePublicEndpoint, setUsePublicEndpoint] = useState(false);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    inferenceState,
    isLoading,
    isMicOn,
    isConnected,
    isUserSpeaking,
    startInference,
    stopInference,
    toggleMic,
    transcription,
    isTranscribing,
    saveTranscription,
    clearTranscription,
    transcriptionUpdateTrigger
  } = useUnifiedVoiceAgent({
    agentId: agentId || '',
    usePublicEndpoint
  });

  const handleStartInference = () => {
    if (!agentId) {
      toast.error("Agent ID is required");
      return;
    }
    startInference(agentId);
  };

  const handleStopInference = () => {
    stopInference();
  };

  const cleanTranscriptionText = (text: string): string => {
    return text
      .replace(/\s*\[partial due to error\]\s*/gi, '')
      .replace(/\s*\[interrupted\]\s*/gi, '')
      .replace(/\s*\[AI Response\]\s*/gi, '')
      .trim();
  };

  const hasMeaningfulTranscription = (): boolean => {
    return transcription.some(entry => cleanTranscriptionText(entry.text).length > 0 && entry.isFinal === true);
  };

  const handleSaveTranscription = () => {
    saveTranscription();
    toast.success("Transcription saved");
  };

  const handleClearTranscription = () => {
    clearTranscription();
    toast.success("Transcription cleared");
  };

  const initializeBackgroundAudio = () => {
    if (!backgroundAudioRef.current) {
      const audioPath = `/${selectedAudioFile}`;
      console.log('Initializing audio with path:', audioPath);
      backgroundAudioRef.current = new Audio(audioPath);
      backgroundAudioRef.current.loop = true;
      backgroundAudioRef.current.volume = backgroundVolume;

      backgroundAudioRef.current.addEventListener('play', () => {
        setIsBackgroundAudioPlaying(true);
        console.log('Audio playing');
      });

      backgroundAudioRef.current.addEventListener('pause', () => {
        setIsBackgroundAudioPlaying(false);
        console.log('Audio paused');
      });

      backgroundAudioRef.current.addEventListener('ended', () => {
        setIsBackgroundAudioPlaying(false);
        console.log('Audio ended');
      });

      backgroundAudioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Error details:', backgroundAudioRef.current?.error);
        toast.error('Failed to load audio file. Check file path or format.');
      });
    }
  };

  const toggleBackgroundAudio = () => {
    if (!backgroundAudioRef.current) {
      initializeBackgroundAudio();
    }

    if (backgroundAudioRef.current) {
      if (isBackgroundAudioPlaying) {
        backgroundAudioRef.current.pause();
        setIsBackgroundAudioPlaying(false);
        toast.success("Background audio stopped");
      } else {
        backgroundAudioRef.current.play()
          .then(() => {
            setIsBackgroundAudioPlaying(true);
            toast.success("Background audio started");
          })
          .catch(error => {
            console.error('Error playing background audio:', error);
            toast.error(`Failed to play audio: ${error.message}`);
          });
      }
    } else {
      toast.error('Audio element not initialized');
    }
  };

  const handleBackgroundVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setBackgroundVolume(newVolume);
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = newVolume;
    }
  };

  const changeAudioFile = (newAudioFile: string) => {
    setSelectedAudioFile(newAudioFile);
    if (isBackgroundAudioPlaying && backgroundAudioRef.current) {
      // Pause and reset current audio
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
      backgroundAudioRef.current = null;

      // Initialize new audio
      initializeBackgroundAudio();
      
      // Wait for the new audio to be ready before playing
      if (backgroundAudioRef.current) {
        const playWhenReady = () => {
          backgroundAudioRef.current?.play()
            .then(() => {
              setIsBackgroundAudioPlaying(true);
              toast.success("Background audio changed");
            })
            .catch(error => {
              console.error('Error playing new background audio:', error);
              toast.error(`Failed to play new audio: ${error.message}`);
            });
        };

        // Check if audio is ready to play
        if (backgroundAudioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          playWhenReady();
        } else {
          backgroundAudioRef.current.addEventListener('canplay', playWhenReady, { once: true });
        }
      } else {
        toast.error('Audio element not initialized');
      }
    }
  };

  // Consolidated useEffect for auto-playing audio
  useEffect(() => {
    if (inferenceState === "ACTIVE" && isAmbientSoundOn && !isBackgroundAudioPlaying) {
      const timer = setTimeout(() => {
        if (!backgroundAudioRef.current) {
          initializeBackgroundAudio();
        }
        if (backgroundAudioRef.current) {
          console.log('Attempting to auto-play audio:', selectedAudioFile);
          backgroundAudioRef.current.play()
            .then(() => {
              console.log('Auto-play successful');
              setIsBackgroundAudioPlaying(true);
            })
            .catch(error => {
              console.error('Auto-play error:', error);
              toast.error('Autoplay blocked. Please start audio manually.');
            });
        } else {
          console.error('Audio element not initialized');
          toast.error('Audio element not ready');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [inferenceState, isAmbientSoundOn, isBackgroundAudioPlaying, selectedAudioFile]);

  // Stop audio when inference stops
  useEffect(() => {
    if (inferenceState === "IDLE" && isBackgroundAudioPlaying) {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current.currentTime = 0;
        setIsBackgroundAudioPlaying(false);
      }
    }
  }, [inferenceState, isBackgroundAudioPlaying]);

  // Cleanup background audio on unmount
  useEffect(() => {
    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
  }, []);

  const getStateColor = (state: keyof typeof INFERENCE_STATES) => {
    switch (state) {
      case "IDLE":
        return "secondary";
      case "CONNECTING":
        return "default";
      case "ACTIVE":
        return "default";
      case "ERROR":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStateIcon = (state: keyof typeof INFERENCE_STATES) => {
    switch (state) {
      case "IDLE":
        return <Square className="h-3 w-3" />;
      case "CONNECTING":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "ACTIVE":
        return <Radio className="h-3 w-3" />;
      case "ERROR":
        return <VolumeX className="h-3 w-3" />;
      default:
        return <Square className="h-3 w-3" />;
    }
  };

  const isActive = inferenceState === "ACTIVE";
  const isConnecting = inferenceState === "CONNECTING";

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Voice AI Inference</h1>
          <p className="text-muted-foreground">
            Connect with VoiceCake's voice AI for real-time conversation
          </p>
        </div>
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Current state of the inference connection
                </CardDescription>
              </div>
              <Badge
                variant={getStateColor(inferenceState)}
                className={`flex items-center gap-1 ${
                  inferenceState === "ACTIVE" ? "bg-green-500 text-white hover:bg-green-600" : ""
                }`}
              >
                {getStateIcon(inferenceState)}
                {inferenceState}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isMicOn ? (
                  <Mic className="h-4 w-4 text-green-500" />
                ) : (
                  <MicOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  Microphone {isMicOn ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isUserSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm">
                  {isUserSpeaking ? 'Speaking' : 'Silent'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Music className={`h-4 w-4 ${isBackgroundAudioPlaying ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-sm">
                  Ambient Sound {isBackgroundAudioPlaying ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Background Audio Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume className="h-5 w-5" />
              Background Audio
            </CardTitle>
            <CardDescription>
              Add ambient background sound to enhance the conversation experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Button to toggle background audio */}
                <Button
                  onClick={toggleBackgroundAudio}
                  variant={isBackgroundAudioPlaying ? "default" : "outline"}
                  size="sm"
                  disabled={!isActive}
                >
                  {isBackgroundAudioPlaying ? (
                    <>
                      <VolumeX className="mr-2 h-4 w-4" />
                      Stop Audio
                    </>
                  ) : (
                    <>
                      <Volume1 className="mr-2 h-4 w-4" />
                      Start Audio
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="backgroundAudioEnabled"
                    checked={isAmbientSoundOn}
                    onChange={(e) => setIsAmbientSoundOn(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="backgroundAudioEnabled" className="text-sm">
                    Auto-play when inference starts
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Background Audio File</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedAudioFile === 'background-chatter.mp3' ? "default" : "outline"}
                  size="sm"
                  onClick={() => changeAudioFile('background-chatter.mp3')}
                  disabled={!(isAmbientSoundOn || isBackgroundAudioPlaying)}
                >
                  Chatter 1
                </Button>
                <Button
                  variant={selectedAudioFile === 'background-chatter-2.mp3' ? "default" : "outline"}
                  size="sm"
                  onClick={() => changeAudioFile('background-chatter-2.mp3')}
                  disabled={!(isAmbientSoundOn || isBackgroundAudioPlaying)}
                >
                  Chatter 2
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(backgroundVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[backgroundVolume * 100]}
                onValueChange={handleBackgroundVolumeChange}
                max={100}
                min={0}
                step={5}
                className="w-full"
                disabled={!(isAmbientSoundOn || isBackgroundAudioPlaying)}
              />
            </div>
            {isAmbientSoundOn && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Background audio will play automatically when inference starts
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Audio Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Audio Controls
            </CardTitle>
            <CardDescription>
              Control voice inference and microphone settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {!isActive ? (
                <Button
                  onClick={handleStartInference}
                  disabled={!agentId || isLoading || isConnecting}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Inference
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={toggleMic}
                    variant={isMicOn ? "default" : "destructive"}
                    size="lg"
                    className="flex-1 sm:flex-none"
                  >
                    {isMicOn ? (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
                        Mute
                      </>
                    ) : (
                      <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Unmute
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={toggleBackgroundAudio}
                    variant={isBackgroundAudioPlaying ? "default" : "outline"}
                    size="lg"
                    className="flex-1 sm:flex-none"
                  >
                    <Music className="mr-2 h-4 w-4" />
                    {isBackgroundAudioPlaying ? 'Ambient On' : 'Ambient Off'}
                  </Button>
                  <Button
                    onClick={handleStopInference}
                    variant="destructive"
                    size="lg"
                    className="flex-1 sm:flex-none"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </div>
              )}
            </div>
            {isActive && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Voice inference is active. Speak naturally to interact with the AI.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Enhanced Transcription Display */}
        {(isActive || hasMeaningfulTranscription()) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Enhanced Conversation History
              </CardTitle>
              <CardDescription>
                View and manage the conversation history with LiveKit integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Enhanced Transcription</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTranscription}
                      disabled={!hasMeaningfulTranscription() || isTranscribing}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      onClick={handleClearTranscription}
                      disabled={!hasMeaningfulTranscription() || isTranscribing}
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
                {isTranscribing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-lg">LiveKit Transcribing...</span>
                  </div>
                ) : hasMeaningfulTranscription() ? (
                  <div className="overflow-y-auto max-h-60 p-4 bg-gray-50 rounded-md">
                    {transcription
                      .filter(entry => cleanTranscriptionText(entry.text).length > 0 && entry.isFinal === true)
                      .map((entry, index) => {
                        const cleanText = cleanTranscriptionText(entry.text);
                        if (!cleanText) return null;
                        return (
                          <div key={entry.id} className={`mb-4 p-3 rounded-lg ${
                            entry.speaker === 'user' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-green-50 border-l-4 border-green-400'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${
                                entry.speaker === 'user' ? 'text-blue-700' : 'text-green-700'
                              }`}>
                                {entry.speaker === 'user' ? '👤 User' : '🤖 Web Agent'}
                                {entry.source && (
                                  <span className="ml-1 text-xs text-gray-500">
                                    [{entry.source.toUpperCase()}]
                                  </span>
                                )}
                                {entry.participantId && (
                                  <span className="ml-1 text-xs text-gray-400">
                                    ({entry.participantId})
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                {entry.confidence && (
                                  <span className="text-xs text-gray-500">
                                    {(entry.confidence * 100).toFixed(1)}%
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {entry.timestamp.toLocaleTimeString()}
                                  {entry.duration && ` (${entry.duration.toFixed(1)}s)`}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-800">{cleanText}</p>
                            {entry.trackId && (
                              <div className="mt-1 text-xs text-gray-400">
                                Track: {entry.trackId}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {isActive ? (
                      <div className="space-y-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mx-auto"></div>
                        <p className="text-sm text-muted-foreground">
                          Start speaking to see LiveKit transcription here
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No LiveKit conversation history available
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Inference;