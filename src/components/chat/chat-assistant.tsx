"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "How's my spending this month?",
  "What's my net worth trend?",
  "Tips to reduce expenses?",
  "Analyze my portfolio risk",
];

// Audio wave visualization bars
const AudioWave = ({ isActive, intensity = 1 }: { isActive: boolean; intensity?: number }) => {
  const bars = 12;
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white"
          animate={isActive ? {
            height: [8, 20 + Math.random() * 40 * intensity, 12, 30 + Math.random() * 30 * intensity, 8],
          } : { height: 8 }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
};

export function ChatAssistant() {
  const { chatHidden } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm ScotBot. Ask me anything about your finances. Tap the phone to start a voice call.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const continueListeningRef = useRef(false);

  // Find the best available voice (prefer natural/premium voices)
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Priority order for natural-sounding voices
      const preferredVoices = [
        // macOS premium voices
        'Samantha', 'Karen', 'Daniel', 'Moira', 'Tessa',
        // Google/Chrome voices
        'Google US English', 'Google UK English Female',
        // Microsoft voices
        'Microsoft Zira', 'Microsoft David',
        // Generic fallbacks
        'English', 'en-US', 'en-GB'
      ];

      let bestVoice: SpeechSynthesisVoice | null = null;

      for (const preferred of preferredVoices) {
        const found = voices.find(v =>
          v.name.includes(preferred) ||
          v.lang.includes(preferred)
        );
        if (found) {
          bestVoice = found;
          break;
        }
      }

      // Fallback to any English voice
      if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }

      setSelectedVoice(bestVoice);
      console.log('Selected voice:', bestVoice?.name);
    };

    if (typeof window !== 'undefined') {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize speech recognition with continuous mode support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            // Don't add to messages in call mode - keep it conversational
            if (!continueListeningRef.current) {
              addMessage("user", transcript.trim());
            }
            fetchResponseForCall(transcript.trim());
          }
        };

        recognitionRef.current.onerror = (e: any) => {
          console.log('Recognition error:', e.error);
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            setIsListening(false);
            setCallStatus('idle');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // In call mode, restart listening after speaking ends (handled in speakText)
        };
      }
    }
  }, []);

  const speakText = useCallback((text: string, onComplete?: () => void) => {
    if (!speechEnabled || typeof window === 'undefined') {
      onComplete?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0; // Slightly slower for more natural sound
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCallStatus('speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onComplete?.();

      // In call mode, automatically start listening again
      if (continueListeningRef.current && recognitionRef.current) {
        setTimeout(() => {
          if (continueListeningRef.current) {
            try {
              setCallStatus('listening');
              setIsListening(true);
              recognitionRef.current.start();
            } catch (e) {
              console.log('Could not restart recognition:', e);
            }
          }
        }, 300); // Small delay before listening again
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      onComplete?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [speechEnabled, selectedVoice]);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isCallMode) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isCallMode]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  // Fetch response for call mode (continuous conversation)
  const fetchResponseForCall = async (userMessage: string) => {
    setCallStatus('thinking');
    setIsThinking(true);

    try {
      const conversationMessages = messages
        .filter(msg => msg.id !== 'welcome')
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantMessage += decoder.decode(value);
        }

        setIsThinking(false);

        // Speak the response
        if (assistantMessage) {
          speakText(assistantMessage);
        }
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      speakText("Sorry, I couldn't process that. Try again.");
      setIsThinking(false);
    }
  };

  const fetchResponse = async (userMessage: string) => {
    setIsThinking(true);

    try {
      const conversationMessages = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({ role: msg.role, content: msg.content }));

      conversationMessages.push({ role: 'user', content: userMessage });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        const msgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: msgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        }]);
        setIsThinking(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages(prev => prev.map(msg =>
            msg.id === msgId ? { ...msg, content: assistantMessage } : msg
          ));
        }

        if (assistantMessage && speechEnabled) {
          speakText(assistantMessage);
        }
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      setIsThinking(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    addMessage("user", text);
    setInput("");
    fetchResponse(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Start/end call mode
  const toggleCallMode = () => {
    if (isCallMode) {
      // End call
      continueListeningRef.current = false;
      stopSpeaking();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      setIsCallMode(false);
      setCallStatus('idle');
    } else {
      // Start call
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in your browser.');
        return;
      }
      setIsCallMode(true);
      setCallStatus('connecting');

      // Greet and start listening
      setTimeout(() => {
        continueListeningRef.current = true;
        speakText("Hi! What would you like to know about your finances?", () => {
          // After greeting, start listening
        });
      }, 500);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    addMessage("user", prompt);
    fetchResponse(prompt);
  };

  if (chatHidden) return null;

  return (
    <>
      {/* Call Mode - Full Screen Bubble Interface */}
      <AnimatePresence>
        {isCallMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center"
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                style={{
                  background: callStatus === 'speaking'
                    ? 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)'
                    : callStatus === 'listening'
                    ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(148,163,184,0.2) 0%, transparent 70%)'
                }}
                animate={{
                  scale: callStatus === 'idle' ? 1 : [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Main Bubble */}
            <motion.div
              className={cn(
                "relative w-40 h-40 rounded-full flex items-center justify-center",
                callStatus === 'speaking' ? "bg-blue-500" :
                callStatus === 'listening' ? "bg-green-500" :
                callStatus === 'thinking' ? "bg-amber-500" :
                "bg-slate-600"
              )}
              animate={{
                scale: callStatus === 'speaking' || callStatus === 'listening' ? [1, 1.05, 1] : 1,
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Outer pulse rings */}
              {(callStatus === 'speaking' || callStatus === 'listening') && (
                <>
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full",
                      callStatus === 'speaking' ? "bg-blue-500" : "bg-green-500"
                    )}
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full",
                      callStatus === 'speaking' ? "bg-blue-500" : "bg-green-500"
                    )}
                    animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                  />
                </>
              )}

              {/* Audio wave visualization */}
              <AudioWave
                isActive={callStatus === 'speaking' || callStatus === 'listening'}
                intensity={callStatus === 'speaking' ? 1.2 : 0.8}
              />
            </motion.div>

            {/* Status Text */}
            <motion.p
              className="mt-8 text-xl font-medium text-white"
              key={callStatus}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'listening' && 'Listening...'}
              {callStatus === 'thinking' && 'Thinking...'}
              {callStatus === 'speaking' && 'ScotBot'}
              {callStatus === 'idle' && 'Ready'}
            </motion.p>

            <p className="mt-2 text-sm text-slate-400">
              {callStatus === 'listening' && 'Speak your question'}
              {callStatus === 'speaking' && 'Speaking...'}
              {callStatus === 'thinking' && 'Processing your request'}
            </p>

            {/* End Call Button */}
            <motion.button
              onClick={toggleCallMode}
              className="mt-12 w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </motion.button>
            <p className="mt-3 text-sm text-slate-500">Tap to end call</p>

            {/* Mute button */}
            <button
              onClick={() => { stopSpeaking(); setSpeechEnabled(!speechEnabled); }}
              className="absolute top-6 right-6 p-3 rounded-full bg-slate-700/50 hover:bg-slate-700 transition-colors"
            >
              {speechEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button — top right */}
      {!isCallMode && (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed top-5 right-6 z-[60] w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-md",
            isOpen
              ? "bg-foreground text-background"
              : "bg-card border border-border text-foreground hover:bg-secondary"
          )}
          whileTap={{ scale: 0.92 }}
          aria-label={isOpen ? "Close assistant" : "Open assistant"}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageCircle className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      )}

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && !isCallMode && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-16 right-6 z-[59] w-[380px] h-[640px] bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-lg"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1.5 shrink-0">
                  <Image src="/logo.png" alt="ScotBot" width={28} height={28} className="object-contain" />
                </div>
                <h3 className="text-sm font-semibold leading-none">ScotBot</h3>
              </div>
              <div className="flex items-center gap-2">
                {isListening && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Listening
                  </span>
                )}
                {isSpeaking && (
                  <span className="text-xs text-blue-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Speaking
                  </span>
                )}
                <button
                  onClick={() => { stopSpeaking(); setSpeechEnabled(!speechEnabled); }}
                  className="p-1.5 rounded-md hover:bg-secondary"
                  title={speechEnabled ? "Mute" : "Unmute"}
                >
                  {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Voice Listening Overlay */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-card/95 flex flex-col items-center justify-center gap-4"
                >
                  <motion.div
                    className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <motion.div
                      className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                    >
                      <Mic className="w-6 h-6 text-green-500" />
                    </motion.div>
                  </motion.div>
                  <p className="text-sm font-medium">Listening...</p>
                  <p className="text-xs text-foreground-muted">Speak your question</p>
                  <button
                    onClick={toggleVoice}
                    className="mt-2 px-4 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Stop
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-2.5",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === "assistant"
                        ? "bg-accent/10"
                        : "bg-secondary"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3 h-3 text-accent" />
                    ) : (
                      <User className="w-3 h-3 text-foreground-muted" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[75%] px-3 py-2 rounded-xl text-[13px] leading-relaxed",
                      msg.role === "assistant"
                        ? "bg-secondary text-foreground"
                        : "bg-foreground text-background"
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-accent" />
                  </div>
                  <div className="bg-secondary px-3 py-2.5 rounded-xl flex items-center gap-1">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Suggested prompts */}
              {messages.length === 1 && !isThinking && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] text-foreground-muted uppercase tracking-wider font-medium">
                    Try asking
                  </p>
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="block w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-background-tertiary text-[12px] text-foreground-secondary transition-colors cursor-pointer"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border shrink-0">
              <div className="flex items-center gap-2">
                {/* Call button */}
                <button
                  onClick={toggleCallMode}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer"
                  aria-label="Start voice call"
                  title="Start voice call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
                {/* Mic button */}
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-secondary text-foreground-muted hover:text-foreground"
                  )}
                  aria-label="Voice input"
                >
                  {isListening ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-[13px] placeholder:text-foreground-muted outline-none focus:ring-1 focus:ring-foreground/10 transition-shadow"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                    input.trim()
                      ? "bg-foreground text-background"
                      : "bg-secondary text-foreground-muted"
                  )}
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
