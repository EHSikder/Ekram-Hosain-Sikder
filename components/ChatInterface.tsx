import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, MoreVertical, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { Message, BusinessConfig } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface ChatInterfaceProps {
  onBack: () => void;
  onSwitchToVoice: () => void;
  config: BusinessConfig;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack, onSwitchToVoice, config }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: config.welcomeMessage || `Hello! Welcome to ${config.name}. How can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(input, 'WhatsApp');
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
      {/* WhatsApp Header */}
      <div className="bg-whatsapp-green text-white p-3 flex items-center shadow-md z-10 sticky top-0">
        <button onClick={onBack} className="mr-3 p-1 hover:bg-white/10 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 text-white font-bold border border-white/30">
          {config.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-base md:text-lg truncate max-w-[200px]">{config.name} AI</h2>
          <p className="text-xs text-white/80">Business Account</p>
        </div>
        <div className="flex space-x-4 mx-2">
          <button onClick={onSwitchToVoice} className="p-1 hover:bg-white/10 rounded-full transition">
            <Phone size={22} />
          </button>
          <button className="p-1 hover:bg-white/10 rounded-full transition">
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-50">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          // Simple heuristic for RTL
          const isArabic = /[\u0600-\u06FF]/.test(msg.content);
          
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[65%] rounded-lg p-2 shadow-sm relative text-sm md:text-base ${
                  isUser ? 'bg-whatsapp-chatSent rounded-tr-none' : 'bg-white rounded-tl-none'
                }`}
                dir={isArabic ? 'rtl' : 'ltr'}
              >
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <div className={`text-[10px] text-gray-500 mt-1 flex ${isUser ? 'justify-end' : 'justify-end'}`}>
                  {formatTime(msg.timestamp)}
                  {isUser && <span className="ml-1 text-blue-500">✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
                <Loader2 className="animate-spin text-gray-400" size={16} />
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-2 md:p-3 flex items-center space-x-2 sticky bottom-0">
        <button className="p-2 text-gray-500 hover:text-gray-700">
          <Paperclip size={22} />
        </button>
        <div className="flex-1 relative">
           <input
            type="text"
            className="w-full py-2 px-4 rounded-full border-none focus:outline-none focus:ring-1 focus:ring-whatsapp-green text-sm md:text-base"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={`p-2.5 rounded-full shadow-sm transition ${
             !input.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-whatsapp-green text-white hover:bg-[#006e5a]'
          }`}
        >
          <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
