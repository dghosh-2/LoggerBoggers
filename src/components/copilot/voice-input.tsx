"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { Mic, MicOff, Send, Calculator, MessageCircle } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { WaveformVisualizer } from "./waveform-visualizer";

type Mode = "talk" | "simulate";

interface VoiceInputProps {
  onMessage: (message: string) => void;
}

export function VoiceInput({ onMessage }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<Mode>("talk");
  const [transcript, setTranscript] = useState("");

  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      if (transcript) {
        onMessage(transcript);
        setTranscript("");
      }
    } else {
      setIsListening(true);
      // Simulate voice recognition
      setTimeout(() => {
        const phrases = mode === "talk" 
          ? [
              "Show me my spending trends for this month",
              "What were my biggest expenses last week?",
              "How much did I save compared to last month?",
            ]
          : [
              "What if I increased my savings by 20%?",
              "Simulate cutting dining out expenses by half",
              "Project my portfolio growth at 8% annual return",
            ];
        setTranscript(phrases[Math.floor(Math.random() * phrases.length)]);
      }, 1500);
    }
  }, [isListening, transcript, onMessage, mode]);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-secondary">
        <button
          onClick={() => setMode("talk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "talk"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Talk
        </button>
        <button
          onClick={() => setMode("simulate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "simulate"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Simulate
        </button>
      </div>

      {/* Waveform */}
      <div className="py-4">
        <WaveformVisualizer isActive={isListening} />
      </div>

      {/* Transcript display */}
      <AnimatePresence mode="wait">
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center p-4 rounded-xl bg-secondary"
          >
            <p className="text-sm text-foreground-muted mb-1">
              {isListening ? "Listening..." : "You said:"}
            </p>
            <p className="font-medium">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <div className="flex justify-center">
        <motion.button
          onClick={toggleListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isListening
              ? "bg-destructive text-white"
              : "bg-primary text-primary-foreground"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={isListening ? { scale: [1, 1.05, 1] } : {}}
          transition={isListening ? { duration: 1, repeat: Infinity } : {}}
        >
          {isListening ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {(mode === "talk"
          ? ["Show spending", "Monthly summary", "Recent transactions"]
          : ["What if +10% income", "Cut subscriptions", "Double savings"]
        ).map((action) => (
          <motion.button
            key={action}
            onClick={() => onMessage(action)}
            className="px-3 py-1.5 text-sm rounded-lg bg-secondary text-foreground-muted hover:text-foreground hover:bg-secondary/80 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {action}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
