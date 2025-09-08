import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { X, Plus, Loader2, MessageSquare, Mic } from "lucide-react";
import { agentAPI } from "@/pages/services/api";
import { toast } from "sonner";
import { AgentType } from "@/types/agent";
import { VoiceSelector } from "@/components/ui/voice-selector";
import { ToolSelector } from "@/components/ui/tool-selector";
import { useVoices } from "@/contexts/VoiceContext";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (agentData: any) => void;
}



// Voice options are now managed in the centralized voiceConfig.ts file

const modelOptions = [
  { provider: "HUME_AI", simpleName: "voicecake STS", displayName: "VoiceCake STS" },
  { provider: "OPEN_AI", simpleName: "gpt-5", displayName: "GPT 5" },
  { provider: "OPEN_AI", simpleName: "gpt-5-mini", displayName: "GPT 5 Mini" },
  { provider: "OPEN_AI", simpleName: "gpt-5-nano", displayName: "GPT 5 Nano" },
  { provider: "ANTHROPIC", simpleName: "claude-sonnet-4-20250514", displayName: "Claude Sonnet 4" },
  { provider: "OPEN_AI", simpleName: "gpt-4.1", displayName: "GPT 4.1" },
  { provider: "GOOGLE", simpleName: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
  { provider: "GROQ", simpleName: "kimi-k2-instruct", displayName: "Kimi K2" },
  { provider: "SAMBANOVA", simpleName: "Llama-4-Maverick-17B-128E-Instruct", displayName: "Llama 4 Maverick (17Bx128E)" },
  { provider: "CEREBRAS", simpleName: "qwen-3-235b-a22b-thinking-2507", displayName: "Qwen3 235B Thinking" },
  { provider: "CEREBRAS", simpleName: "qwen-3-235b-a22b-instruct-2507", displayName: "Qwen3 235B Instruct" },
  { provider: "ANTHROPIC", simpleName: "claude-3-7-sonnet-latest", displayName: "Claude 3.7 Sonnet" },
  { provider: "ANTHROPIC", simpleName: "claude-3-5-sonnet-latest", displayName: "Claude 3.5 Sonnet (latest)" },
  { provider: "AMAZON_BEDROCK", simpleName: "claude-3-5-sonnet-20240620-v1", displayName: "Claude 3.5 Sonnet (Amazon Bedrock)" },
  { provider: "OPEN_AI", simpleName: "gpt-4o", displayName: "GPT 4o" },
  { provider: "SAMBANOVA", simpleName: "Qwen3-32B", displayName: "Qwen3 32B" },
  { provider: "SAMBANOVA", simpleName: "DeepSeek-R1-Distill-Llama-70B", displayName: "DeepSeek R1-Distill (Llama 3.3 70B Instruct)" },
  { provider: "CEREBRAS", simpleName: "gpt-oss-120b", displayName: "Cerebras OpenAI GPT OSS" },
  { provider: "ANTHROPIC", simpleName: "claude-3-5-haiku-latest", displayName: "Claude 3.5 Haiku (latest)" },
  { provider: "ANTHROPIC", simpleName: "claude-3-5-sonnet-20240620", displayName: "Claude 3.5 Sonnet (20240620)" },
  { provider: "ANTHROPIC", simpleName: "claude-3-haiku-20240307", displayName: "Claude 3 Haiku (20240307)" },
  { provider: "AMAZON_BEDROCK", simpleName: "claude-3-5-haiku-20241022-v1", displayName: "Claude 3.5 Haiku (Amazon Bedrock Latency Optimized)" },
  { provider: "AMAZON_BEDROCK", simpleName: "claude-3-haiku-20240307-v1", displayName: "Claude 3 Haiku (Amazon Bedrock)" },
  { provider: "GOOGLE", simpleName: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
  { provider: "OPEN_AI", simpleName: "gpt-4-turbo", displayName: "GPT 4 Turbo" },
  { provider: "OPEN_AI", simpleName: "gpt-4o-mini", displayName: "GPT 4o Mini" },
  { provider: "GROQ", simpleName: "llama3-8b-8192", displayName: "Llama 3 8B (8192)" },
  { provider: "GROQ", simpleName: "llama3-70b-8192", displayName: "Llama 3 70B (8192)" },
  { provider: "GROQ", simpleName: "llama-3.3-70b-versatile", displayName: "Llama 3.3 70B (versatile)" },
  { provider: "GROQ", simpleName: "llama-3.1-8b-instant", displayName: "Llama 3.1 8B (instant)" },
  { provider: "FIREWORKS", simpleName: "mixtral-8x7b-instruct", displayName: "Mixtral 8x7B" },
  { provider: "FIREWORKS", simpleName: "llama-v3p1-405b-instruct", displayName: "Llama V3.1 405B" },
  { provider: "FIREWORKS", simpleName: "llama-v3p1-70b-instruct", displayName: "Llama V3.1 70B" },
  { provider: "FIREWORKS", simpleName: "llama-v3p1-8b-instruct", displayName: "Llama V3.1 8B" }
];

// Group models by provider for better organization
const groupedModels = modelOptions.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = [];
  }
  acc[model.provider].push(model);
  return acc;
}, {} as Record<string, typeof modelOptions>);

export function CreateAgentModal({ isOpen, onClose, onSubmit }: CreateAgentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    voice_provider: "",
    voice: "",
    model_provider: "",
    model_resource: "",
    instructions: "",
    tool_ids: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null);
  const { findHamsaVoiceById } = useVoices();

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentType(null);
      setFormData({
        name: "",
        description: "",
        voice_provider: "",
        voice: "",
        model_provider: "",
        model_resource: "",
        instructions: "",
        tool_ids: []
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate agent type selection
    if (!selectedAgentType) {
      toast.error("Please select an agent type");
      return;
    }
    
    // Validate description length
    if (formData.description.length > 1500) {
      toast.error("Description cannot exceed 1,500 characters");
      return;
    }
    
    // Validate required fields based on agent type
    if (selectedAgentType === 'SPEECH') {
      // For STS agents, require voice selection from Hume
      if (!formData.name || !formData.description || !formData.voice || !formData.model_resource) {
        toast.error("Please fill in all required fields for Speech-To-Speech agent");
        return;
      }
    } else {
      if (!formData.name || !formData.description || !formData.voice_provider || !formData.voice || !formData.instructions) {
        toast.error("Please fill in all required fields for Text-To-Speech agent");
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // For Hamsa TTS, we need to get the speaker name from the selected voice
      let voiceId = formData.voice;
      if (formData.voice_provider === "hamsa") {
        const selectedVoice = findHamsaVoiceById(formData.voice);
        if (selectedVoice) {
          voiceId = selectedVoice.name; // Use speaker name for Hamsa
        }
      }

      // Map form data to backend expected format
      const agentData = {
        name: formData.name,
        voice_provider: selectedAgentType === 'SPEECH' ? "hume" : (formData.voice_provider === "voicecake" ? "hume" : formData.voice_provider.toLowerCase()),
        voice_id: voiceId, // Include voice_id for both STS and TTS agents
        description: formData.description,
        custom_instructions: formData.instructions,
        model_provider: formData.model_provider,
        model_resource: formData.model_resource,
        agent_type: selectedAgentType!,
        tool_ids: formData.tool_ids
      };

      const response = await agentAPI.createAgent(agentData);
      toast.success("Agent created successfully!");
      onSubmit(response);
      onClose();
    } catch (error: any) {
      console.error("Error creating agent:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create agent";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form data when closing
    setSelectedAgentType(null);
    setFormData({
      name: "",
      description: "",
      voice_provider: "",
      voice: "",
      model_provider: "",
      model_resource: "",
      instructions: "",
      tool_ids: []
    });
    onClose();
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Create New Agent</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Agent Type Selection */}
            {!selectedAgentType ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-center">Choose Agent Type</h3>
                <p className="text-muted-foreground text-center">Select the type of agent you want to create</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAgentType === 'SPEECH' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedAgentType('SPEECH')}
                  >
                    <CardContent className="p-6 text-center">
                      <Mic className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <h4 className="font-semibold text-lg mb-2">Speech-To-Speech</h4>
                      <p className="text-muted-foreground text-sm">
                        Full voice conversation with AI. User speaks, AI responds with voice.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAgentType === 'TEXT' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedAgentType('TEXT')}
                  >
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <h4 className="font-semibold text-lg mb-2">Text-To-Speech</h4>
                      <p className="text-muted-foreground text-sm">
                        Text input, AI responds with voice. Perfect for chatbots with voice output.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <>
                {/* Agent Type Display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedAgentType === 'SPEECH' ? (
                      <Mic className="w-5 h-5 text-primary" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-primary" />
                    )}
                    <span className="font-semibold">
                      {selectedAgentType === 'SPEECH' ? 'Speech-To-Speech' : 'Text-To-Speech'} Agent
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedAgentType(null)}
                  >
                    Change Type
                  </Button>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Basic Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Customer Support AI"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <div className="space-y-1">
                      <Textarea
                        id="description"
                        placeholder="Describe what this agent does and how it helps users..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        required
                        maxLength={1500}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {formData.description.length}/1,500 characters
                        </span>
                        {formData.description.length > 1400 && (
                          <span className="text-xs text-orange-500">
                            {1500 - formData.description.length} characters remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Voice Settings - Always shown when agent type is selected */}
            {selectedAgentType && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Voice & Personality</h3>
                
                <div className="space-y-4">
                  {selectedAgentType === 'SPEECH' ? (
                    // For STS agents, automatically set to Hume and show voice selection
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="font-medium text-blue-900">Hume EVI Integration</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Speech-To-Speech agent using Hume's Empathic Voice Interface with advanced emotional intelligence.
                        </p>
                      </div>
                      
                      <VoiceSelector
                        value={formData.voice}
                        onValueChange={(value) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            voice: value,
                            voice_provider: "voicecake" // Auto-set for STS
                          }));
                        }}
                        provider="voicecake"
                        placeholder="Select a Hume voice"
                      />
                    </div>
                  ) : (
                    // For TTS agents, show provider selection
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>TTS Provider</Label>
                        <Select 
                          value={formData.voice_provider} 
                          onValueChange={(value) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              voice_provider: value,
                              voice: "" // Reset voice when provider changes
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a TTS provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="voicecake">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                VoiceCake
                              </div>
                            </SelectItem>
                            <SelectItem value="cartesia">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                Cartesia
                              </div>
                            </SelectItem>
                            <SelectItem value="hamsa">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                Hamsa
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.voice_provider && (
                        <VoiceSelector
                          value={formData.voice}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, voice: value }))}
                          provider={formData.voice_provider}
                          placeholder="Select a voice"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Model - Only for Speech-To-Speech */}
            {selectedAgentType === 'SPEECH' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select 
                    value={formData.model_resource} 
                    onValueChange={(value) => {
                      const selectedModel = modelOptions.find(model => model.simpleName === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        model_provider: selectedModel?.provider || "",
                        model_resource: value 
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedModels).map(([provider, models]) => (
                        <SelectGroup key={provider}>
                          <SelectLabel>{provider.replace('_', ' ')}</SelectLabel>
                          {models.map((model) => (
                            <SelectItem key={model.simpleName} value={model.simpleName}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                {model.displayName}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Instructions - Always shown when agent type is selected */}
            {selectedAgentType && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Instructions</h3>
                <div className="space-y-2">
                  <Label htmlFor="instructions">
                    {selectedAgentType === 'SPEECH' ? 'Custom Instructions' : 'Instructions'}
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder={
                      selectedAgentType === 'SPEECH' 
                        ? `You are a helpful AI assistant. Provide detailed instructions for how you should behave, respond, and interact with users.

Examples:
• Your personality and communication style
• Specific topics you're knowledgeable about
• How to handle different types of questions
• Any specific behaviors or responses to avoid
• Context about your role or purpose

Be as detailed as possible to ensure consistent and helpful responses.`
                        : `Provide detailed instructions for how the agent should respond to text inputs.

Examples:
• Response style and tone
• Specific topics or domains of expertise
• How to handle different types of requests
• Any limitations or guidelines
• Context about the agent's purpose

Be specific to ensure the agent provides helpful and consistent responses.`
                    }
                    value={formData.instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                    rows={8}
                    className="min-h-[200px] resize-y"
                    required={selectedAgentType === 'TEXT'}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: The more detailed your instructions, the better the agent will perform. Include personality traits, response style, and specific guidelines.
                  </p>
                </div>
              </div>
            )}

            {/* Tools Selection - Always shown when agent type is selected */}
            {selectedAgentType && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tools & Capabilities</h3>
                <div className="space-y-2">
                  <ToolSelector
                    value={formData.tool_ids}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tool_ids: value }))}
                    placeholder="Select tools for this agent..."
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: Select tools that your agent can use to perform specific tasks. Tools will be available to the agent during conversations.
                  </p>
                </div>
              </div>
            )}

            {/* Actions - Only show when agent type is selected */}
            {selectedAgentType && (
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose} 
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="outline" 
                  className="flex-1 btn-theme-gradient border-theme-primary hover:border-theme-secondary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}