"use client";

import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_COPILOT_HISTORY } from '@/lib/mock-data';

export function TalkCopilot() {
    const [input, setInput] = useState('');
    // Explicitly type the history state to allow messages without actions
    const [history, setHistory] = useState<{ role: string, content: string, actions?: { label: string, action: string }[] }[]>(MOCK_COPILOT_HISTORY);

    const handleSend = () => {
        if (!input.trim()) return;

        // Optimistic UI
        const newMsg = { role: 'user', content: input }; // actions is optional now
        setHistory(prev => [...prev, newMsg]);
        setInput('');

        // Mock Reply
        setTimeout(() => {
            setHistory(prev => [...prev, {
                role: 'assistant',
                content: "I'm focusing on the pie chart visualization right now. Let me know if you need specific category breakdowns."
            }]);
        }, 800);
    };

    return (
        <div className="h-full flex flex-col bg-card">
            {/* Header */}
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur shrink-0">
                <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Copilot
                </h2>
            </div>

            {/* Chat Area - Flex 1 to take available space */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.map((msg: any, i) => (
                    <div key={i} className={cn(
                        "flex gap-3 text-sm",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            msg.role === 'user' ? "bg-secondary" : "bg-primary/10"
                        )}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-foreground-muted" /> : <Bot className="w-4 h-4 text-primary" />}
                        </div>
                        <div className={cn(
                            "p-3 rounded-2xl max-w-[85%]",
                            msg.role === 'user' ? "bg-secondary text-foreground rounded-tr-sm" : "bg-secondary/50 text-foreground-muted rounded-tl-sm"
                        )}>
                            <p>{msg.content}</p>
                            {msg.actions && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {msg.actions.map((act: any, j: number) => (
                                        <button key={j} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                            {act.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input - Sticky at Bottom */}
            <div className="p-4 border-t border-border bg-card shrink-0 z-20">
                <div className="relative">
                    <input
                        className="w-full bg-input border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-10 text-foreground placeholder:text-muted-foreground"
                        placeholder="Ask about your spending..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
