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

// CMU-themed blob — accepts a size multiplier for large/small usage
const BlobEntity = ({ status, size = 1 }: { status: string; size?: number }) => {
  const isActive = status === 'speaking' || status === 'listening';
  const isSpeaking = status === 'speaking';
  const isThinking = status === 'thinking';

  // CMU red/black palette
  const colors = {
    speaking: { primary: '#C41230', secondary: '#E8395B', glow: 'rgba(196,18,48,0.4)' },
    listening: { primary: '#C41230', secondary: '#E8395B', glow: 'rgba(196,18,48,0.3)' },
    thinking: { primary: '#8B0D24', secondary: '#C41230', glow: 'rgba(139,13,36,0.35)' },
    idle: { primary: '#2D2D2D', secondary: '#4A4A4A', glow: 'rgba(45,45,45,0.3)' },
    connecting: { primary: '#2D2D2D', secondary: '#4A4A4A', glow: 'rgba(45,45,45,0.3)' },
  };

  const c = colors[status as keyof typeof colors] || colors.idle;

  // Scale all dimensions by the size multiplier
  const s = (v: number) => v * size;

  return (
    <div className="relative flex items-center justify-center" style={{ width: s(64), height: s(64) }}>
      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: s(90),
          height: s(90),
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
        }}
        animate={{
          scale: isActive ? [1, 1.2, 1] : [1, 1.05, 1],
          opacity: isActive ? [0.5, 0.9, 0.5] : [0.2, 0.4, 0.2],
        }}
        transition={{ duration: isActive ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer blob */}
      <motion.div
        className="absolute"
        style={{ width: s(56), height: s(56) }}
        animate={{
          scale: isSpeaking ? [1, 1.15, 0.95, 1.1, 1] : isThinking ? [1, 1.05, 1] : [1, 1.06, 1],
          rotate: isThinking ? [0, 360] : isSpeaking ? [0, 10, -10, 5, 0] : [0, 3, -3, 0],
        }}
        transition={{
          duration: isSpeaking ? 0.8 : isThinking ? 4 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <motion.path
            fill={c.secondary}
            fillOpacity={0.35}
            animate={{
              d: isActive ? [
                "M 100 30 C 140 30, 170 60, 170 100 C 170 140, 140 170, 100 170 C 60 170, 30 140, 30 100 C 30 60, 60 30, 100 30",
                "M 100 25 C 150 35, 175 55, 175 100 C 175 145, 145 175, 100 175 C 55 175, 25 145, 25 100 C 25 55, 50 25, 100 25",
                "M 100 30 C 140 30, 170 60, 170 100 C 170 140, 140 170, 100 170 C 60 170, 30 140, 30 100 C 30 60, 60 30, 100 30",
              ] : [
                "M 100 30 C 140 30, 170 60, 170 100 C 170 140, 140 170, 100 170 C 60 170, 30 140, 30 100 C 30 60, 60 30, 100 30",
                "M 100 34 C 138 32, 168 62, 168 100 C 168 138, 138 168, 100 168 C 62 168, 32 138, 32 100 C 32 62, 62 34, 100 34",
                "M 100 30 C 140 30, 170 60, 170 100 C 170 140, 140 170, 100 170 C 60 170, 30 140, 30 100 C 30 60, 60 30, 100 30",
              ],
            }}
            transition={{ duration: isActive ? 1 : 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>

      {/* Core blob */}
      <motion.div
        className="absolute"
        style={{ width: s(40), height: s(40) }}
        animate={{
          scale: isSpeaking ? [1, 1.2, 0.88, 1.15, 1] : isThinking ? [1, 1.08, 1] : [1, 1.03, 1],
          rotate: isSpeaking ? [0, 12, -12, 6, 0] : [0, 2, -2, 0],
        }}
        transition={{
          duration: isSpeaking ? 0.6 : isThinking ? 2.5 : 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <radialGradient id="blobGradientCmu" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
              <stop offset="100%" stopColor={c.primary} stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <motion.path
            fill="url(#blobGradientCmu)"
            animate={{
              d: isActive ? [
                "M 100 40 C 130 40, 160 70, 160 100 C 160 130, 130 160, 100 160 C 70 160, 40 130, 40 100 C 40 70, 70 40, 100 40",
                "M 100 35 C 140 45, 165 65, 162 100 C 159 135, 135 168, 100 165 C 65 162, 38 135, 35 100 C 32 65, 60 35, 100 35",
                "M 100 40 C 130 40, 160 70, 160 100 C 160 130, 130 160, 100 160 C 70 160, 40 130, 40 100 C 40 70, 70 40, 100 40",
              ] : [
                "M 100 40 C 130 40, 160 70, 160 100 C 160 130, 130 160, 100 160 C 70 160, 40 130, 40 100 C 40 70, 70 40, 100 40",
                "M 100 42 C 128 41, 158 71, 158 100 C 158 129, 128 158, 100 158 C 72 158, 42 129, 42 100 C 42 71, 72 42, 100 42",
                "M 100 40 C 130 40, 160 70, 160 100 C 160 130, 130 160, 100 160 C 70 160, 40 130, 40 100 C 40 70, 70 40, 100 40",
              ],
            }}
            transition={{ duration: isActive ? 0.8 : 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>

      {/* Particles */}
      {isActive && (
        <>
          {[...Array(size > 2 ? 8 : 4)].map((_, i) => {
            const angle = (i * (size > 2 ? 45 : 90)) * Math.PI / 180;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ backgroundColor: c.secondary, width: s(4), height: s(4) }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: [0, Math.cos(angle) * s(38), 0],
                  y: [0, Math.sin(angle) * s(38), 0],
                  opacity: [0, 0.7, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.25,
                }}
              />
            );
          })}
        </>
      )}
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const continueListeningRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const pendingTranscriptRef = useRef('');
  const sendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Initialize speech recognition — continuous mode with debounced send
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          // Build full transcript from all results
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          const fullText = (finalTranscript + interimTranscript).trim();
          if (!fullText) return;

          pendingTranscriptRef.current = fullText;

          // Reset the debounce timer — send after 1.4s of silence
          if (sendTimerRef.current) clearTimeout(sendTimerRef.current);

          // Only auto-send in call mode when we have final results
          if (continueListeningRef.current && finalTranscript.trim()) {
            sendTimerRef.current = setTimeout(() => {
              const text = pendingTranscriptRef.current.trim();
              if (text && !isFetchingRef.current) {
                pendingTranscriptRef.current = '';
                // Stop recognition while processing
                try { recognitionRef.current?.stop(); } catch (e) { /* ignore */ }
                setIsListening(false);
                addMessage("user", text);
                fetchResponseForCall(text);
              }
            }, 1400);
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
          // In call mode, auto-restart listening if not currently fetching
          if (continueListeningRef.current && !isFetchingRef.current) {
            setTimeout(() => {
              if (continueListeningRef.current && recognitionRef.current && !isFetchingRef.current) {
                try {
                  setCallStatus('listening');
                  setIsListening(true);
                  recognitionRef.current.start();
                } catch (e) {
                  // already running, ignore
                }
              }
            }, 200);
          } else if (!continueListeningRef.current) {
            setIsListening(false);
          }
        };
      }
    }
  }, []);

  // Speak text using OpenAI TTS with browser SpeechSynthesis fallback
  const speakText = useCallback(async (text: string, onComplete?: () => void) => {
    if (!speechEnabled || typeof window === 'undefined') {
      onComplete?.();
      return;
    }

    // Stop any current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    setIsSpeaking(true);
    setCallStatus('speaking');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
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
          }, 300);
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
        onComplete?.();
      };

      await audio.play();
    } catch {
      // Fallback to browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      utterance.onend = () => {
        setIsSpeaking(false);
        onComplete?.();

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
          }, 300);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        onComplete?.();
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [speechEnabled]);

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Play audio blob and manage call state
  const playAudioBlob = useCallback((blob: Blob, onComplete?: () => void) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setIsSpeaking(true);
    setCallStatus('speaking');

    audio.onended = () => {
      setIsSpeaking(false);
      currentAudioRef.current = null;
      URL.revokeObjectURL(url);
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
        }, 300);
      }
    };

    audio.onerror = () => {
      setIsSpeaking(false);
      currentAudioRef.current = null;
      URL.revokeObjectURL(url);
      onComplete?.();
    };

    audio.play();
  }, []);

  // Fetch response for call mode — single server-side LLM+TTS call (with concurrency lock)
  const fetchResponseForCall = async (userMessage: string) => {
    if (isFetchingRef.current) return; // prevent overlapping calls
    isFetchingRef.current = true;

    setCallStatus('thinking');
    setIsThinking(true);

    try {
      const conversationMessages = messages
        .filter(msg => msg.id !== 'welcome')
        .slice(-6)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: conversationMessages }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      setIsThinking(false);

      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.startsWith('audio/')) {
        // Got audio directly — play it
        const responseText = decodeURIComponent(response.headers.get('X-Response-Text') || '');
        if (responseText) addMessage('assistant', responseText);
        const audioBlob = await response.blob();
        playAudioBlob(audioBlob);
      } else {
        // JSON fallback (no Hume key) — use browser TTS
        const data = await response.json();
        if (data.text) {
          addMessage('assistant', data.text);
          speakText(data.text);
        }
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      speakText("Sorry, I couldn't process that. Try again.");
      setIsThinking(false);
    } finally {
      isFetchingRef.current = false;
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
        credentials: 'include',
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
      // End call — clean up everything
      continueListeningRef.current = false;
      if (sendTimerRef.current) { clearTimeout(sendTimerRef.current); sendTimerRef.current = null; }
      pendingTranscriptRef.current = '';
      isFetchingRef.current = false;
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
      // Send accumulated transcript as a text chat message
      const pending = pendingTranscriptRef.current.trim();
      if (pending && !isCallMode) {
        pendingTranscriptRef.current = '';
        if (sendTimerRef.current) { clearTimeout(sendTimerRef.current); sendTimerRef.current = null; }
        addMessage("user", pending);
        fetchResponse(pending);
      }
    } else {
      stopSpeaking();
      pendingTranscriptRef.current = '';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    addMessage("user", prompt);
    fetchResponse(prompt);
  };

  if (chatHidden) return null;

  // Messages for the live transcript (exclude welcome)
  const transcriptMessages = messages.filter(m => m.id !== 'welcome');

  return (
    <>
      {/* Full-screen call mode */}
      <AnimatePresence>
        {isCallMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center"
          >
            {/* Top bar */}
            <div className="w-full flex items-center justify-between px-6 pt-5 shrink-0">
              <span className="text-[11px] font-medium text-white/40 uppercase tracking-widest">ScotBot Call</span>
              <button
                onClick={() => { stopSpeaking(); setSpeechEnabled(!speechEnabled); }}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {speechEnabled ? <Volume2 className="w-4 h-4 text-white/50" /> : <VolumeX className="w-4 h-4 text-white/50" />}
              </button>
            </div>

            {/* Orb section */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center pt-8 pb-4">
              <BlobEntity status={callStatus} size={3.5} />
              <motion.p
                className="mt-4 text-sm font-medium text-white/70"
                key={callStatus}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'listening' && 'Listening...'}
                {callStatus === 'thinking' && 'Thinking...'}
                {callStatus === 'speaking' && 'Speaking'}
                {callStatus === 'idle' && 'Ready'}
              </motion.p>
            </div>

            {/* Live transcription */}
            <div className="relative flex-1 w-full max-w-lg overflow-hidden min-h-0">
              {/* Top fade gradient */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0A0A0A] to-transparent z-10 pointer-events-none" />

              <div className="h-full overflow-y-auto px-8 pt-16 pb-6 scroll-smooth">
                <div className="space-y-6">
                  {transcriptMessages.map((msg, idx) => {
                    const isLatest = idx === transcriptMessages.length - 1;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="text-center"
                      >
                        <motion.span
                          className="inline-block text-[10px] uppercase tracking-[0.2em] mb-2"
                          style={{ color: msg.role === 'user' ? 'rgba(196,18,48,0.6)' : 'rgba(255,255,255,0.25)' }}
                        >
                          {msg.role === 'user' ? 'You' : 'ScotBot'}
                        </motion.span>
                        <motion.p
                          className={cn(
                            "leading-relaxed font-light",
                            msg.role === 'user' ? 'text-white/60' : 'text-white',
                            isLatest ? 'text-xl' : 'text-base opacity-50'
                          )}
                          animate={isLatest ? { opacity: 1 } : {}}
                        >
                          {msg.content}
                        </motion.p>
                      </motion.div>
                    );
                  })}

                  {/* Thinking indicator */}
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="text-center"
                    >
                      <span className="inline-block text-[10px] uppercase tracking-[0.2em] mb-2 text-white/25">ScotBot</span>
                      <div className="flex items-center justify-center gap-2">
                        <motion.span className="w-2 h-2 rounded-full bg-white/30" animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }} />
                        <motion.span className="w-2 h-2 rounded-full bg-white/30" animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
                        <motion.span className="w-2 h-2 rounded-full bg-white/30" animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
                      </div>
                    </motion.div>
                  )}

                  <div ref={transcriptEndRef} />
                </div>
              </div>

              {/* Bottom fade gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            </div>

            {/* End call button */}
            <div className="shrink-0 pb-10 pt-4 flex flex-col items-center">
              <motion.button
                onClick={toggleCallMode}
                className="w-14 h-14 rounded-full bg-[#C41230] hover:bg-[#A50E28] flex items-center justify-center shadow-lg shadow-red-900/30 transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </motion.button>
              <p className="mt-2 text-[11px] text-white/30">End call</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button — top right (hidden during call) */}
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

      {/* Chat Panel (hidden during call) */}
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

            {/* Voice Listening Overlay — only in text chat, not during call */}
            <AnimatePresence>
              {isListening && !isCallMode && (
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-400 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
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
