

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isVoiceTranscription?: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  status: 'Pending' | 'Picked Up' | 'Washing' | 'Out for Delivery' | 'Delivered';
  items: number;
  total: number;
  pickupDate: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  intent: string;
  summary: string;
  channel: 'WhatsApp' | 'Voice';
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  CHAT_PREVIEW = 'CHAT_PREVIEW',
  VOICE_PREVIEW = 'VOICE_PREVIEW'
}

export interface SubscriptionPlan {
  name: string;
  price: number;
  credit: number;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  quantity: string;
}

export interface BusinessConfig {
  name: string;
  industry: string;
  description: string;
  tone: string; // e.g., "Professional", "Friendly", "Formal"
  services: string; // Legacy string description, kept for fallback
  products: Product[]; // Structured catalogue
  welcomeMessage: string;
  enablePayments: boolean;
  currency: string;
}

export interface IntegrationConfig {
  // WhatsApp
  isWhatsAppConnected: boolean;
  whatsappPhoneNumber?: string;
  whatsappBusinessId?: string;
  phoneNumberId?: string;
  accessToken?: string;

  // Voice Integration (Choice between SIP or Twilio)
  isPhoneConnected: boolean;
  voiceIntegrationType: 'none' | 'sip' | 'twilio';

  // SIP Credentials
  sipUsername?: string;
  sipPassword?: string;
  sipServer?: string;
  sipPort?: string;
  
  // Twilio Credentials
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;

  // Generic Business Phone Number
  businessPhoneNumber?: string; 

  // Webhook Settings (Required for Real Traffic)
  webhookUrl: string;
  webhookToken: string;
}
