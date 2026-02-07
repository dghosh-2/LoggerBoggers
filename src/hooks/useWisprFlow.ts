import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioRecorder } from '@/lib/audio-recorder';

interface WisprFlowState {
    isRecording: boolean;
    isTranscribing: boolean;
    error: string | null;
}

interface WisprFlowToken {
    token: string;
    expiresAt: number;
}

/**
 * Custom hook for Wispr Flow voice recognition
 */
export function useWisprFlow() {
    const [state, setState] = useState<WisprFlowState>({
        isRecording: false,
        isTranscribing: false,
        error: null,
    });

    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const tokenRef = useRef<WisprFlowToken | null>(null);
    const clientIdRef = useRef<string>('');

    // Generate a stable client ID on mount
    useEffect(() => {
        if (!clientIdRef.current) {
            clientIdRef.current = `scotbot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }, []);

    /**
     * Get or refresh the client token
     */
    const getToken = useCallback(async (): Promise<string> => {
        // Check if we have a valid token
        if (tokenRef.current && tokenRef.current.expiresAt > Date.now()) {
            return tokenRef.current.token;
        }

        try {
            const response = await fetch('/api/wispr/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: clientIdRef.current,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get token');
            }

            const data = await response.json();

            // Store token with expiration time
            tokenRef.current = {
                token: data.token,
                expiresAt: Date.now() + (data.expiresIn - 60) * 1000, // Refresh 1 min before expiry
            };

            return data.token;
        } catch (error) {
            console.error('Token generation error:', error);
            throw error;
        }
    }, []);

    /**
     * Start recording audio
     */
    const startRecording = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isRecording: true, error: null }));

            if (!audioRecorderRef.current) {
                audioRecorderRef.current = new AudioRecorder();
            }

            await audioRecorderRef.current.startRecording();
        } catch (error) {
            console.error('Recording start error:', error);
            setState(prev => ({
                ...prev,
                isRecording: false,
                error: 'Failed to start recording. Please check microphone permissions.',
            }));
        }
    }, []);

    /**
     * Stop recording and transcribe the audio
     */
    const stopRecordingAndTranscribe = useCallback(async (): Promise<string> => {
        if (!audioRecorderRef.current) {
            throw new Error('No recording in progress');
        }

        try {
            setState(prev => ({ ...prev, isRecording: false, isTranscribing: true, error: null }));

            // Stop recording and get base64 audio
            const base64Audio = await audioRecorderRef.current.stopRecording();

            // Get token
            const token = await getToken();

            // Transcribe audio
            const response = await fetch('/api/wispr/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio: base64Audio,
                    token,
                }),
            });

            if (!response.ok) {
                const error = await response.json();

                // If token expired, retry once with a new token
                if (error.tokenExpired) {
                    tokenRef.current = null;
                    const newToken = await getToken();

                    const retryResponse = await fetch('/api/wispr/transcribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            audio: base64Audio,
                            token: newToken,
                        }),
                    });

                    if (!retryResponse.ok) {
                        throw new Error('Transcription failed after token refresh');
                    }

                    const retryData = await retryResponse.json();
                    setState(prev => ({ ...prev, isTranscribing: false }));
                    return retryData.text;
                }

                throw new Error(error.error || 'Transcription failed');
            }

            const data = await response.json();
            setState(prev => ({ ...prev, isTranscribing: false }));

            return data.text;
        } catch (error) {
            console.error('Transcription error:', error);
            setState(prev => ({
                ...prev,
                isRecording: false,
                isTranscribing: false,
                error: error instanceof Error ? error.message : 'Transcription failed',
            }));
            throw error;
        }
    }, [getToken]);

    /**
     * Cancel recording
     */
    const cancelRecording = useCallback(() => {
        if (audioRecorderRef.current && audioRecorderRef.current.isRecording()) {
            // Stop recording without transcribing
            audioRecorderRef.current.stopRecording().catch(console.error);
        }
        setState(prev => ({ ...prev, isRecording: false, isTranscribing: false, error: null }));
    }, []);

    return {
        ...state,
        startRecording,
        stopRecordingAndTranscribe,
        cancelRecording,
    };
}
