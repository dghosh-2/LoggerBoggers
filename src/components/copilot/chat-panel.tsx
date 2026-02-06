"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  isTyping?: boolean;
}

function HighlightedText({ text }: { text: string }) {
  // Highlight numbers and percentages
  const parts = text.split(/(\$[\d,]+\.?\d*|\d+%|\+\d+\.?\d*%|-\d+\.?\d*%)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (/^\$[\d,]+\.?\d*$/.test(part) || /^\d+%$/.test(part)) {
          return (
            <span key={i} className="text-primary font-semibold">
              {part}
            </span>
          );
        }
        if (/^\+\d+\.?\d*%$/.test(part)) {
          return (
            <span key={i} className="text-success font-semibold">
              {part}
            </span>
          );
        }
        if (/^-\d+\.?\d*%$/.test(part)) {
          return (
            <span key={i} className="text-destructive font-semibold">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChatPanel({ messages, isTyping = false }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto space-y-4 pr-2"
      style={{ maxHeight: "400px" }}
    >
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === "user"
                  ? "bg-primary/10"
                  : "bg-accent/10"
              }`}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-primary" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent" />
              )}
            </div>
            
            <div
              className={`flex-1 p-3 rounded-xl ${
                message.role === "user"
                  ? "bg-primary/10 ml-8"
                  : "bg-secondary mr-8"
              }`}
            >
              <p className="text-sm leading-relaxed">
                <HighlightedText text={message.content} />
              </p>
              <p className="text-xs text-foreground-muted mt-2">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="p-3 rounded-xl bg-secondary">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-foreground-muted"
                    animate={{ 
                      y: [0, -4, 0],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
