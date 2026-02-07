'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface DogLoadingAnimationProps {
    message?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showMessage?: boolean;
}

export function DogLoadingAnimation({ 
    message = 'Loading...',
    className = '',
    size = 'md',
    showMessage = true,
}: DogLoadingAnimationProps) {
    const [dogPosition, setDogPosition] = useState(0);
    const [movingRight, setMovingRight] = useState(true); // true = moving right, false = moving left
    
    // Size configurations with faster speeds
    const sizeConfig = {
        sm: { width: 80, height: 80, containerHeight: 'h-28', speed: 1.08 },
        md: { width: 120, height: 120, containerHeight: 'h-40', speed: 0.9 },
        lg: { width: 160, height: 160, containerHeight: 'h-48', speed: 0.72 },
        xl: { width: 200, height: 200, containerHeight: 'h-56', speed: 0.63 },
    };
    
    const config = sizeConfig[size];
    
    // Animate dog running back and forth
    useEffect(() => {
        const animateDog = () => {
            setDogPosition(prev => {
                if (movingRight) {
                    const newPos = prev + config.speed;
                    if (newPos >= 100) {
                        setMovingRight(false);
                        return 100;
                    }
                    return newPos;
                } else {
                    const newPos = prev - config.speed;
                    if (newPos <= 0) {
                        setMovingRight(true);
                        return 0;
                    }
                    return newPos;
                }
            });
        };
        
        const interval = setInterval(animateDog, 16); // ~60fps for smooth animation
        return () => clearInterval(interval);
    }, [config.speed, movingRight]);
    
    // Dog faces LEFT by default in the gif (running left)
    // When moving right (position increasing): flip horizontally (scaleX(-1))
    // When moving left (position decreasing): don't flip (scaleX(1))
    
    // Calculate the left position using calc() to account for dog width
    // At 0%: left edge of dog at left edge of container
    // At 100%: right edge of dog at right edge of container
    const leftPosition = `calc(${dogPosition}% - ${(dogPosition / 100) * config.width}px)`;
    
    return (
        <div className={`w-full flex flex-col items-center ${className}`}>
            {/* Running dog */}
            <div className={`relative w-full ${config.containerHeight} overflow-visible rounded-lg bg-secondary/30`}>
                <div
                    className="absolute bottom-2"
                    style={{ 
                        left: leftPosition,
                    }}
                >
                    <Image
                        src="/scotrun.gif"
                        alt="Loading..."
                        width={config.width}
                        height={config.height}
                        className="object-contain"
                        style={{ transform: movingRight ? 'scaleX(-1)' : 'scaleX(1)' }}
                        unoptimized // Required for GIFs
                    />
                </div>
                
                {/* Ground line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-border/50" />
            </div>
            
            {/* Message */}
            {showMessage && (
                <p className="text-center text-sm text-foreground-muted mt-4">
                    {message}
                </p>
            )}
        </div>
    );
}

// Simple version for inline use (just the dog running)
export function DogRunnerSimple({ 
    className = '', 
    size = 'sm' 
}: { 
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
    const [dogPosition, setDogPosition] = useState(0);
    const [movingRight, setMovingRight] = useState(true);
    
    const sizeConfig = {
        sm: { width: 80, height: 80, containerHeight: 'h-28', speed: 1.08 },
        md: { width: 100, height: 100, containerHeight: 'h-32', speed: 0.9 },
        lg: { width: 120, height: 120, containerHeight: 'h-40', speed: 0.72 },
        xl: { width: 160, height: 160, containerHeight: 'h-48', speed: 0.63 },
    };
    
    const config = sizeConfig[size];
    
    useEffect(() => {
        const animateDog = () => {
            setDogPosition(prev => {
                if (movingRight) {
                    const newPos = prev + config.speed;
                    if (newPos >= 100) {
                        setMovingRight(false);
                        return 100;
                    }
                    return newPos;
                } else {
                    const newPos = prev - config.speed;
                    if (newPos <= 0) {
                        setMovingRight(true);
                        return 0;
                    }
                    return newPos;
                }
            });
        };
        
        const interval = setInterval(animateDog, 16); // ~60fps
        return () => clearInterval(interval);
    }, [config.speed, movingRight]);
    
    // Calculate the left position using calc() to account for dog width
    const leftPosition = `calc(${dogPosition}% - ${(dogPosition / 100) * config.width}px)`;
    
    return (
        <div className={`relative ${config.containerHeight} overflow-visible ${className}`}>
            <div
                className="absolute bottom-1"
                style={{ 
                    left: leftPosition,
                }}
            >
                <Image
                    src="/scotrun.gif"
                    alt="Loading..."
                    width={config.width}
                    height={config.height}
                    className="object-contain"
                    style={{ transform: movingRight ? 'scaleX(-1)' : 'scaleX(1)' }}
                    unoptimized
                />
            </div>
        </div>
    );
}

export default DogLoadingAnimation;
