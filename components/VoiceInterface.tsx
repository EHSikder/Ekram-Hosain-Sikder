import React, { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Video, Volume2, Grip, User } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { BusinessConfig } from '../types';

interface VoiceInterfaceProps {
  onHangup: () => void;
  config: BusinessConfig;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onHangup, config }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening' | 'processing'>('connecting');
  const [transcript, setTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setStatus('connected');
      speak(`Hello! This is ${config.name} AI. How can I help you?`);
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text: string) => {
    if (!synthRef.current) return;
    
    // Stop any previous speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    setStatus('speaking');
    setAiResponseText(text);

    // Try to find a good voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('Google UK English Female'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      setStatus('listening');
      startListening();
    };

    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
        setTranscript("Browser does not support Speech API. Please use Chat.");
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
        setStatus('listening');
    };

    recognitionRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setStatus('processing');
        
        // Send to Gemini
        const response = await sendMessageToGemini(text, 'Voice');
        speak(response);
    };

    recognitionRef.current.onerror = (event: any) => {
       console.error("Speech error", event.error);
    };
    
    setTimeout(() => {
        try {
            recognitionRef.current.start();
        } catch(e) { console.log("Already started", e)}
    }, 500);
  };

  // Helper for manual input
  const handleManualInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          const text = e.currentTarget.value;
          e.currentTarget.value = '';
          setTranscript(text);
          setStatus('processing');
          const response = await sendMessageToGemini(text, 'Voice');
          speak(response);
      }
  }

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col items-center justify-between p-8 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 z-0"></div>

      {/* Header */}
      <div className="z-10 mt-8 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4 shadow-xl border-4 border-gray-600">
           <User size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-semibold tracking-wide">{config.name}</h2>
        <p className="text-emerald-400 mt-2 font-medium animate-pulse">
            {status === 'connecting' && "Connecting..."}
            {status === 'connected' && "Connected"}
            {status === 'speaking' && "AI Speaking..."}
            {status === 'listening' && "Listening..."}
            {status === 'processing' && "Thinking..."}
        </p>
        <p className="text-gray-400 text-sm mt-1">00:42</p>
      </div>

      {/* Visualizer / Transcript */}
      <div className="z-10 flex-1 flex flex-col justify-center w-full max-w-md text-center">
         {status === 'speaking' && (
             <div className="flex justify-center space-x-2 items-end h-16 mb-8">
                 <div className="w-2 bg-emerald-500 rounded-full animate-[bounce_1s_infinite] h-8"></div>
                 <div className="w-2 bg-emerald-500 rounded-full animate-[bounce_1.2s_infinite] h-12"></div>
                 <div className="w-2 bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite] h-6"></div>
                 <div className="w-2 bg-emerald-500 rounded-full animate-[bounce_1.1s_infinite] h-10"></div>
                 <div className="w-2 bg-emerald-500 rounded-full animate-[bounce_0.9s_infinite] h-8"></div>
             </div>
         )}
         
         <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm min-h-[100px] flex items-center justify-center flex-col">
            {status === 'listening' && (
                <input 
                    type="text" 
                    placeholder="Listening... (or type here)"
                    className="bg-transparent border-b border-gray-600 text-center text-white focus:outline-none w-full"
                    onKeyDown={handleManualInput}
                    autoFocus
                />
            )}
            {status !== 'listening' && (
                 <p className="text-lg text-gray-200 italic">"{status === 'speaking' ? aiResponseText : transcript}"</p>
            )}
         </div>
      </div>

      {/* Controls */}
      <div className="z-10 w-full max-w-xs grid grid-cols-3 gap-6 mb-8">
        <button className="flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition">
            <div className="p-4 rounded-full bg-gray-800 hover:bg-gray-700">
                <Volume2 size={24} />
            </div>
            <span className="text-xs">Speaker</span>
        </button>
        <button className="flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition">
             <div className="p-4 rounded-full bg-gray-800 hover:bg-gray-700">
                <Video size={24} />
            </div>
            <span className="text-xs">Video</span>
        </button>
        <button className="flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition">
             <div className="p-4 rounded-full bg-gray-800 hover:bg-gray-700">
                <Mic size={24} />
            </div>
            <span className="text-xs">Mute</span>
        </button>
        <button className="flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition">
             <div className="p-4 rounded-full bg-gray-800 hover:bg-gray-700">
                <Grip size={24} />
            </div>
            <span className="text-xs">Keypad</span>
        </button>
        <div className="col-span-1 flex justify-center items-center">
             <button 
                onClick={onHangup}
                className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50 transition transform hover:scale-105"
            >
                <PhoneOff size={28} />
            </button>
        </div>
        <button className="flex flex-col items-center justify-center space-y-2 text-gray-400 hover:text-white transition">
             <div className="p-4 rounded-full bg-gray-800 hover:bg-gray-700">
                <User size={24} />
            </div>
            <span className="text-xs">Contacts</span>
        </button>
      </div>
    </div>
  );
};

export default VoiceInterface;
