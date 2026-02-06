"use client";

import React, { useState } from 'react';
import { Mic, Send, Sparkles, User } from 'lucide-react';
import { MOCK_COPILOT_HISTORY } from '@/data/fake_data';
import { cn } from '@/lib/utils';
import { useInsightsStore } from '@/store/useInsightsStore';

export function TalkCopilot() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState(MOCK_COPILOT_HISTORY);
    const { setSelectedInsightId } = useInsightsStore();

    const handleSend = () => {
        if (!input.trim()) return;

        // Optimistic user message
        const newMsg = { role: 'user', content: input, actions: [] };
        setMessages([...messages, newMsg]);
        setInput('');

        // Mock response delay
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm running in demo mode, but I'd normally analyze your graph to answer that.",
                actions: []
            }]);
        }, 800);
    };

    return (
        <div className="flex flex-col h-full bg-background border-l">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h2 className="text-sm font-semibold">Talk Copilot</h2>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-muted-foreground">Online</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex space-x-3", msg.role === 'user' ? "justify-end" : "justify-start")}>

                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                            </div>
                        )}

                        <div className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                            msg.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-secondary text-secondary-foreground rounded-tl-none"
                        )}>
                            <p>{msg.content}</p>

                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.actions.map((action: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => action.action === 'show_drivers' && setSelectedInsightId('i1')}
                                            className="text-xs bg-background/50 hover:bg-background border border-border/50 px-2 py-1 rounded-md transition-colors"
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary-foreground" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input - Fixed at bottom */}
            <div className="p-4 border-t bg-background shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about your spending..."
                        className="w-full pl-4 pr-24 py-3 rounded-full border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                    <div className="absolute right-2 flex items-center space-x-1">
                        <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                            <Mic className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Disclaimer - Separate sticky section at very bottom */}
            <div className="px-4 py-2 border-t bg-background/50 shrink-0">
                <span className="text-[10px] text-muted-foreground block text-center">
                    Copilot can make mistakes. Please verify important info.
                </span>
            </div>
        </div>
    );
}
