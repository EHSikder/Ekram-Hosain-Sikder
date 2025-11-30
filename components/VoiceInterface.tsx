import React, { useState, useEffect, useRef } from 'react';
// FIX: Import Loader2 icon
import { Mic, PhoneOff, Video, Volume2, Grip, User, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { BusinessConfig, IntegrationConfig } from '../types';

// --- Audio Utility Functions ---
// Helper to encode raw audio buffer to Base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to decode Base64 string to audio buffer
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface VoiceInterfaceProps {
  onHangup: () => void;
  config: BusinessConfig;
  integrations: IntegrationConfig;
}

type CallStatus = 'initializing' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onHangup, config, integrations }) => {
  const [status, setStatus] = useState<CallStatus>('initializing');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  
  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);

  const connectWebSocket = () => {
    if (!integrations.liveWebSocketUrl) {
      setStatus('error');
      setAiTranscript("Error: Live WebSocket URL is not configured in the dashboard.");
      return;
    }
    
    setStatus('connecting');
    ws.current = new WebSocket(integrations.liveWebSocketUrl);

    ws.current.onopen = () => {
      setStatus('connected');
      setAiTranscript(`Connected to ${config.name} AI...`);
      startStreamingMicrophone();
    };

    ws.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'user_transcript') {
        setUserTranscript(message.text);
      } else if (message.type === 'ai_transcript') {
        setAiTranscript(message.text);
      } else if (message.type === 'ai_audio' && message.data) {
        const audioData = decode(message.data);
        playAudio(audioData);
      }
    };

    ws.current.onclose = () => {
      setStatus('disconnected');
      setAiTranscript("Call ended.");
      stopStreamingMicrophone();
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('error');
      setAiTranscript("A connection error occurred.");
      stopStreamingMicrophone();
    };
  };

  const startStreamingMicrophone = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media Devices API not available.");
      }
      micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.current.createMediaStreamSource(micStream.current);
      processor.current = audioContext.current.createScriptProcessor(1024, 1, 1);
      
      processor.current.onaudioprocess = (e) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16[i] = inputData[i] * 32768;
          }
          const base64 = encode(new Uint8Array(int16.buffer));
          ws.current.send(JSON.stringify({ type: 'audio_in', data: base64 }));
        }
      };

      source.connect(processor.current);
      processor.current.connect(audioContext.current.destination);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setStatus('error');
      setAiTranscript("Microphone access denied. Please enable microphone permissions in your browser.");
    }
  };

  const stopStreamingMicrophone = () => {
    micStream.current?.getTracks().forEach(track => track.stop());
    processor.current?.disconnect();
    audioContext.current?.close();
  };

  const playAudio = async (audioData: Uint8Array) => {
    if (!audioContext.current) return;
    const dataInt16 = new Int16Array(audioData.buffer);
    const frameCount = dataInt16.length;
    const buffer = audioContext.current.createBuffer(1, frameCount, audioContext.current.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    const source = audioContext.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.current.destination);
    source.start();
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      ws.current?.close();
      stopStreamingMicrophone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIndicator = () => {
    switch(status) {
      case 'initializing': return { text: "Initializing...", color: 'text-yellow-400', icon: <Loader2 className="animate-spin" /> };
      case 'connecting': return { text: "Connecting...", color: 'text-yellow-400', icon: <Wifi className="animate-pulse" /> };
      case 'connected': return { text: "Connected", color: 'text-emerald-400', icon: <Wifi /> };
      case 'disconnected': return { text: "Call Ended", color: 'text-gray-400', icon: <WifiOff /> };
      case 'error': return { text: "Error", color: 'text-red-400', icon: <WifiOff /> };
      default: return { text: "Standby", color: 'text-gray-400', icon: <WifiOff /> };
    }
  };
  const { text, color, icon } = getStatusIndicator();

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col items-center justify-between p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 z-0"></div>

      <div className="z-10 mt-8 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4 shadow-xl border-4 border-gray-600">
           <User size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-semibold tracking-wide">{config.name}</h2>
        <div className={`flex items-center space-x-2 mt-2 font-medium ${color}`}>
            {icon}
            <span>{text}</span>
        </div>
      </div>

      <div className="z-10 flex-1 flex flex-col justify-center w-full max-w-md text-center">
         <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm min-h-[150px] flex flex-col justify-between">
            <div>
              <p className="text-sm text-gray-400 text-left">AI Response:</p>
              <p className="text-lg text-gray-200 italic text-center my-2">"{aiTranscript}"</p>
            </div>
            <div className="border-t border-gray-600/50 pt-2">
              <p className="text-sm text-gray-400 text-left">You said:</p>
              <p className="text-md text-gray-300 italic text-center">"{userTranscript}"</p>
            </div>
         </div>
      </div>
      
      <div className="z-10 w-full flex justify-center mb-8">
        <button 
            onClick={onHangup}
            className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50 transition transform hover:scale-105"
        >
            <PhoneOff size={28} />
        </button>
      </div>
    </div>
  );
};

export default VoiceInterface;