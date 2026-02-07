"use client";

import { useState, useRef, useEffect } from "react";
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
  Phone,
  PhoneOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceProvider, useVoice } from "@humeai/voice-react";
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

function ChatAssistantContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm your financial assistant. Ask me anything about your finances, spending habits, or investment strategy. You can also tap the mic to talk.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hume Voice integration
  const { status, connect, disconnect, sendSessionSettings, messages: voiceMessages } = useVoice();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Voice messages are handled separately and not added to chat history

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

  const fetchResponse = async (userMessage: string) => {
    setIsThinking(true);

    try {
      // Get all messages for context
      const conversationMessages = messages
        .filter(msg => msg.id !== 'welcome') // Exclude welcome message
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Add the current user message
      conversationMessages.push({
        role: 'user',
        content: userMessage
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        // Add empty assistant message that we'll update
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

          // Update the message in real-time
          setMessages(prev => prev.map(msg =>
            msg.id === msgId
              ? { ...msg, content: assistantMessage }
              : msg
          ));
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

  const fetchAccessToken = async () => {
    try {
      const response = await fetch('/api/hume/token', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error('Error fetching access token:', error);
      throw error;
    }
  };

  const fetchOrCreateConfig = async () => {
    try {
      // Check localStorage for existing config
      const storedConfigId = localStorage.getItem('hume_scotbot_config_id');
      if (storedConfigId) {
        console.log('Using stored config:', storedConfigId);
        setConfigId(storedConfigId);
        return storedConfigId;
      }

      // Create new config with financial assistant prompt (no custom LLM)
      console.log('Creating new Hume config...');
      const response = await fetch('/api/hume/config?useCustomLLM=false', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create config:', error);
        return null;
      }

      const data = await response.json();
      const newConfigId = data.configId;

      console.log('Created config:', newConfigId);

      // Store for future use
      localStorage.setItem('hume_scotbot_config_id', newConfigId);
      setConfigId(newConfigId);

      return newConfigId;
    } catch (error) {
      console.error('Error fetching/creating config:', error);
      return null;
    }
  };

  const toggleVoice = async () => {
    if (status.value === 'connected') {
      // Disconnect from voice conversation
      disconnect();
      setIsVoiceMode(false);
    } else {
      // Connect to voice conversation
      try {
        setIsVoiceMode(true);

        // Get access token
        const token = await fetchAccessToken();
        setAccessToken(token);

        // Get or create config with financial assistant prompt
        const config = await fetchOrCreateConfig();

        // Fetch user's financial data
        const financialDataResponse = await fetch('/api/user/financial-context');
        const financialData = await financialDataResponse.json();

        // Connect to Hume EVI
        const connectOptions: any = {
          auth: { type: 'accessToken', value: token },
        };

        // Use config with financial assistant prompt if available
        if (config) {
          connectOptions.configId = config;
          console.log('Connecting with ScotBot config:', config);
        } else {
          console.warn('No config available, using Hume default');
        }

        await connect(connectOptions);

        // Send financial context via session settings
        await sendSessionSettings({
          context: {
            text: financialData.context || 'No financial data available yet.',
          },
        });

        console.log('Connected to Hume EVI with financial context');
      } catch (error) {
        console.error('Voice connection error:', error);
        setIsVoiceMode(false);
      }
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    addMessage("user", prompt);
    fetchResponse(prompt);
  };

  const isVoiceConnected = status.value === 'connected';
  const isVoiceConnecting = status.value === 'connecting';

  return (
    <>
      {/* Floating Chat Button — top right */}
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

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-16 right-6 z-[59] w-[380px] h-[640px] bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-lg"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1.5 shrink-0">
                <Image src="/logo.png" alt="ScotBot" width={28} height={28} className="object-contain" />
              </div>
              <h3 className="text-sm font-semibold leading-none">
                ScotBot
              </h3>
              {isVoiceConnected && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Voice Active
                </div>
              )}
            </div>

            {/* Voice Mode Overlay */}
            <AnimatePresence>
              {isVoiceMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-card/95 flex flex-col items-center justify-center gap-4"
                >
                  <motion.div
                    className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center"
                    animate={isVoiceConnected ? { scale: [1, 1.15, 1] } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center"
                      animate={isVoiceConnected ? { scale: [1, 1.1, 1] } : {}}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.15,
                      }}
                    >
                      <Phone className="w-6 h-6 text-accent" />
                    </motion.div>
                  </motion.div>
                  <p className="text-sm font-medium">
                    {isVoiceConnecting ? "Connecting..." : "Voice Mode Active"}
                  </p>
                  <p className="text-xs text-foreground-muted text-center px-8">
                    {isVoiceConnected
                      ? "Speak naturally. Your conversation will appear in the chat."
                      : "Establishing voice connection..."
                    }
                  </p>
                  <button
                    onClick={toggleVoice}
                    disabled={isVoiceConnecting}
                    className="mt-2 px-4 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <PhoneOff className="w-3.5 h-3.5 inline mr-1" />
                    End Call
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
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: 0,
                      }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-muted"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: 0.4,
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Suggested prompts (only when just the welcome message) */}
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
                <button
                  onClick={toggleVoice}
                  disabled={isVoiceConnecting}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                    isVoiceConnected
                      ? "bg-green-500 text-white"
                      : "bg-secondary text-foreground-muted hover:text-foreground",
                    isVoiceConnecting && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label="Voice conversation"
                >
                  {isVoiceConnected ? (
                    <PhoneOff className="w-3.5 h-3.5" />
                  ) : (
                    <Phone className="w-3.5 h-3.5" />
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
                  disabled={isVoiceConnected}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isVoiceConnected}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                    input.trim() && !isVoiceConnected
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

export function ChatAssistant() {
  const { chatHidden } = useUIStore();

  if (chatHidden) return null;

  return (
    <VoiceProvider>
      <ChatAssistantContent />
    </VoiceProvider>
  );
}
