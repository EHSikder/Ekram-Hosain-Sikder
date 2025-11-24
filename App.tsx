
import React, { useState, useEffect } from 'react';
import { AppView, LogEntry, BusinessConfig, IntegrationConfig, Order } from './types';
import ChatInterface from './components/ChatInterface';
import VoiceInterface from './components/VoiceInterface';
import SaaSDashboard from './components/SaaSDashboard';
import LoginScreen from './components/LoginScreen';
import { initializeGemini } from './services/geminiService';
import { GEMINI_API_KEY } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  
  // Start with empty logs and orders (No Mock Data)
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Default Business Config (Will be overwritten by login/signup)
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({
    name: "My Business",
    industry: "General",
    description: "",
    tone: "Professional",
    services: "",
    products: [],
    welcomeMessage: "Hello! How can I help you today?",
    enablePayments: false,
    currency: "KD"
  });

  // Integration state - includes real credential fields and webhook placeholders
  const [integrations, setIntegrations] = useState<IntegrationConfig>({
    isWhatsAppConnected: false,
    whatsappPhoneNumber: undefined,
    whatsappBusinessId: undefined,
    phoneNumberId: '',
    accessToken: '',

    isPhoneConnected: false,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',

    // Simulated Webhook details for the user to copy
    webhookUrl: 'https://api.gulf-laundry-agent.com/v1/webhook',
    webhookToken: 'gulf_secure_token_2024'
  });

  const addLog = (log: LogEntry) => {
    setLogs(prev => [...prev, log]);
  };

  const handleLogin = (newConfig?: BusinessConfig) => {
      if (newConfig) {
          setBusinessConfig(newConfig);
      }
      setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
      // Reset state on logout
      setLogs([]);
      setOrders([]);
      setIntegrations({ 
          isWhatsAppConnected: false,
          phoneNumberId: '',
          accessToken: '',
          isPhoneConnected: false,
          twilioAccountSid: '',
          twilioAuthToken: '',
          twilioPhoneNumber: '',
          webhookUrl: 'https://api.gulf-laundry-agent.com/v1/webhook',
          webhookToken: 'gulf_secure_token_2024'
      });
      setCurrentView(AppView.LOGIN);
  };

  // Re-initialize Gemini when config changes
  useEffect(() => {
    if (currentView !== AppView.LOGIN) {
      // We pass the system key conceptually, though service uses hardcoded one
      initializeGemini(addLog, GEMINI_API_KEY, businessConfig);
    }
  }, [businessConfig, integrations, currentView]);

  const renderContent = () => {
    switch (currentView) {
      case AppView.LOGIN:
        return <LoginScreen onLogin={handleLogin} />;
      
      case AppView.DASHBOARD:
        return (
          <SaaSDashboard 
            logs={logs} 
            orders={orders}
            config={businessConfig}
            integrations={integrations}
            onUpdateConfig={setBusinessConfig}
            onUpdateIntegrations={setIntegrations}
            onLaunchPreview={(mode) => setCurrentView(mode === 'chat' ? AppView.CHAT_PREVIEW : AppView.VOICE_PREVIEW)}
            onLogout={handleLogout}
            onSimulateLog={addLog}
          />
        );
      
      case AppView.CHAT_PREVIEW:
        return (
          <ChatInterface 
            onBack={() => setCurrentView(AppView.DASHBOARD)} 
            onSwitchToVoice={() => setCurrentView(AppView.VOICE_PREVIEW)}
            config={businessConfig}
          />
        );
      
      case AppView.VOICE_PREVIEW:
        return (
          <VoiceInterface 
            onHangup={() => setCurrentView(AppView.DASHBOARD)}
            config={businessConfig}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <main className="flex-1 h-full relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
