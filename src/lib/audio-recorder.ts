/**
 * Audio recording utility for Wispr Flow integration
 * Records audio from the browser microphone and converts to 16kHz WAV format
 */

export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    /**
     * Start recording audio from the microphone
     */
    async startRecording(): Promise<void> {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000, // Request 16kHz if supported
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Create MediaRecorder with supported MIME type
            const options = { mimeType: 'audio/webm' };
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('Failed to access microphone');
        }
    }

    /**
     * Stop recording and return the audio as a base64-encoded 16kHz WAV
     */
    async stopRecording(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No recording in progress'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                try {
                    // Create blob from recorded chunks
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

                    // Convert to WAV format
                    const wavBlob = await this.convertToWav(audioBlob);

                    // Convert to base64
                    const base64Audio = await this.blobToBase64(wavBlob);

                    // Cleanup
                    this.cleanup();

                    resolve(base64Audio);
                } catch (error) {
                    console.error('Error processing audio:', error);
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Convert WebM audio to 16kHz WAV format
     */
    private async convertToWav(webmBlob: Blob): Promise<Blob> {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Decode the audio data
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Resample to 16kHz if needed
        const targetSampleRate = 16000;
        const resampled = this.resampleAudioBuffer(audioBuffer, targetSampleRate);

        // Convert to WAV format
        const wavBlob = this.audioBufferToWav(resampled);

        return wavBlob;
    }

    /**
     * Resample audio buffer to target sample rate
     */
    private resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
        const offlineContext = new OfflineAudioContext(
            1, // mono
            audioBuffer.duration * targetSampleRate,
            targetSampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        return offlineContext.startRendering() as any; // Returns a promise in modern browsers
    }

    /**
     * Convert AudioBuffer to WAV blob
     */
    private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
        const numChannels = 1;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const channelData = audioBuffer.getChannelData(0);
        const samples = new Int16Array(channelData.length);

        // Convert float32 to int16
        for (let i = 0; i < channelData.length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // Write WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
        view.setUint16(32, numChannels * bitDepth / 8, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        // Write audio data
        for (let i = 0; i < samples.length; i++) {
            view.setInt16(44 + i * 2, samples[i], true);
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Convert blob to base64 string
     */
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data URL prefix to get only base64 data
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Cleanup resources
     */
    private cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    /**
     * Check if recording is in progress
     */
    isRecording(): boolean {
        return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
    }
}
