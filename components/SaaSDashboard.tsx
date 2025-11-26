

import React, { useState, useRef } from 'react';
import { LogEntry, BusinessConfig, IntegrationConfig, Order, Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Settings, Link, Activity, Save, MessageSquare, Phone, LogOut, Plus, Trash2, CheckCircle, Loader2, AlertCircle, ExternalLink, HelpCircle, Smartphone, CreditCard, Copy, PlayCircle, Upload } from 'lucide-react';
import { parseProductFile } from '../services/geminiService';

interface SaaSDashboardProps {
  logs: LogEntry[];
  orders: Order[];
  config: BusinessConfig;
  integrations: IntegrationConfig;
  onUpdateConfig: (newConfig: BusinessConfig) => void;
  onUpdateIntegrations: (newInt: IntegrationConfig) => void;
  onLaunchPreview: (mode: 'chat' | 'voice') => void;
  onLogout: () => void;
  onSimulateLog?: (log: LogEntry) => void;
}

const SaaSDashboard: React.FC<SaaSDashboardProps> = ({ 
  logs, 
  orders, 
  config, 
  integrations, 
  onUpdateConfig, 
  onUpdateIntegrations,
  onLaunchPreview,
  onLogout,
  onSimulateLog
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'connect' | 'logs'>('overview');
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaved, setIsSaved] = useState(false);
  
  // WhatsApp Integration State
  const [waCreds, setWaCreds] = useState({
      phoneNumberId: integrations.phoneNumberId || '',
      accessToken: integrations.accessToken || ''
  });
  const [waConnectStatus, setWaConnectStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [waErrorMessage, setWaErrorMessage] = useState('');

  // Voice Integration State
  const [voiceTab, setVoiceTab] = useState<'sip' | 'twilio'>('sip');
  
  // SIP Creds State
  const [sipCreds, setSipCreds] = useState({
      sipUsername: integrations.sipUsername || '',
      sipPassword: integrations.sipPassword || '',
      sipServer: integrations.sipServer || '',
      sipPort: integrations.sipPort || '5060',
  });
  const [sipConnectStatus, setSipConnectStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [sipErrorMessage, setSipErrorMessage] = useState('');
  
  // Twilio Creds State
  const [twilioCreds, setTwilioCreds] = useState({
      twilioAccountSid: integrations.twilioAccountSid || '',
      twilioAuthToken: integrations.twilioAuthToken || '',
      twilioPhoneNumber: integrations.twilioPhoneNumber || '',
  });
  const [twilioConnectStatus, setTwilioConnectStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [twilioErrorMessage, setTwilioErrorMessage] = useState('');

  // Shared Phone number state
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState(integrations.businessPhoneNumber || '');

  // Catalogue Edit State
  const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity: 'Unlimited' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdateConfig(localConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    const product: Product = { ...newProduct, id: Date.now().toString() };
    setLocalConfig(prev => ({
      ...prev,
      products: [...(prev.products || []), product]
    }));
    setNewProduct({ name: '', price: '', quantity: 'Unlimited' });
  };

  const handleRemoveProduct = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      
      try {
          const extractedProducts = await parseProductFile(file);
          
          if (extractedProducts.length > 0) {
              setLocalConfig(prev => ({
                  ...prev,
                  products: [...(prev.products || []), ...extractedProducts]
              }));
          } else {
              alert("Could not extract any products. Please check file format.");
          }
      } catch (error: any) {
          console.error("Upload failed", error);
          alert(`Failed to process file: ${error.message}`);
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleVerifyWhatsApp = async () => {
      if (!waCreds.phoneNumberId.match(/^[0-9]+$/)) {
          setWaErrorMessage("Invalid format. Phone Number ID should only contain numbers.");
          setWaConnectStatus('error');
          return;
      }
      if (!waCreds.phoneNumberId || !waCreds.accessToken) {
          setWaErrorMessage("Please fill in both Phone Number ID and Access Token.");
          setWaConnectStatus('error');
          return;
      }

      setWaConnectStatus('verifying');
      setWaErrorMessage('');

      try {
          const response = await fetch(`https://graph.facebook.com/v17.0/${waCreds.phoneNumberId}`, {
              headers: { 
                  'Authorization': `Bearer ${waCreds.accessToken}` 
              }
          });

          if (!response.ok) {
              const errData = await response.json();
              if (errData.error?.message?.includes('Unsupported get request')) {
                  throw new Error("Connection failed. It looks like you entered a phone number instead of the numeric 'Phone Number ID'.");
              }
              throw new Error(errData.error?.message || 'Connection failed');
          }

          const data = await response.json();
          
          if (data.display_phone_number) {
              onUpdateIntegrations({ 
                  ...integrations, 
                  isWhatsAppConnected: true, 
                  whatsappPhoneNumber: data.display_phone_number,
                  whatsappBusinessId: data.id,
                  phoneNumberId: waCreds.phoneNumberId,
                  accessToken: waCreds.accessToken
              });
              setWaConnectStatus('success');
              setTimeout(() => setWaConnectStatus('idle'), 2000);
          } else {
              throw new Error('Invalid response from Meta API');
          }

      } catch (error: any) {
          console.error("WhatsApp Connection Error:", error);
          setWaErrorMessage(error.message || "Could not verify credentials. Please check permissions.");
          setWaConnectStatus('error');
      }
  };

  const handleDisconnectWhatsApp = () => {
      onUpdateIntegrations({
          ...integrations,
          isWhatsAppConnected: false,
          whatsappPhoneNumber: undefined,
          phoneNumberId: '',
          accessToken: ''
      });
      setWaCreds({ phoneNumberId: '', accessToken: '' });
      setWaConnectStatus('idle');
  };

  const handleConnectSip = () => {
      if (!sipCreds.sipUsername || !sipCreds.sipPassword || !sipCreds.sipServer || !businessPhoneNumber) {
          setSipErrorMessage("All fields except Port are required.");
          setSipConnectStatus('error');
          return;
      }
      
      setSipConnectStatus('verifying');
      
      setTimeout(() => {
          onUpdateIntegrations({
              ...integrations,
              isPhoneConnected: true,
              voiceIntegrationType: 'sip',
              sipUsername: sipCreds.sipUsername,
              sipPassword: sipCreds.sipPassword,
              sipServer: sipCreds.sipServer,
              sipPort: sipCreds.sipPort || '5060',
              businessPhoneNumber: businessPhoneNumber,
          });
          setSipConnectStatus('success');
          setTimeout(() => setSipConnectStatus('idle'), 1500);
      }, 1500);
  };

  const handleConnectTwilio = () => {
    if (!twilioCreds.twilioAccountSid || !twilioCreds.twilioAuthToken || !twilioCreds.twilioPhoneNumber) {
        setTwilioErrorMessage("All Twilio fields are required.");
        setTwilioConnectStatus('error');
        return;
    }
    
    setTwilioConnectStatus('verifying');
    
    setTimeout(() => {
        onUpdateIntegrations({
            ...integrations,
            isPhoneConnected: true,
            voiceIntegrationType: 'twilio',
            twilioAccountSid: twilioCreds.twilioAccountSid,
            twilioAuthToken: twilioCreds.twilioAuthToken,
            twilioPhoneNumber: twilioCreds.twilioPhoneNumber,
            businessPhoneNumber: twilioCreds.twilioPhoneNumber,
        });
        setTwilioConnectStatus('success');
        setTimeout(() => setTwilioConnectStatus('idle'), 1500);
    }, 1500);
  };

  const handleDisconnectPhone = () => {
      onUpdateIntegrations({
          ...integrations,
          isPhoneConnected: false,
          voiceIntegrationType: 'none',
          sipUsername: '', sipPassword: '', sipServer: '', sipPort: '5060',
          twilioAccountSid: '', twilioAuthToken: '', twilioPhoneNumber: '',
          businessPhoneNumber: '',
      });
      setSipCreds({ sipUsername: '', sipPassword: '', sipServer: '', sipPort: '5060' });
      setTwilioCreds({ twilioAccountSid: '', twilioAuthToken: '', twilioPhoneNumber: '' });
      setBusinessPhoneNumber('');
      setSipConnectStatus('idle');
      setTwilioConnectStatus('idle');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const simulateRealEvent = (channel: 'WhatsApp' | 'Voice') => {
      if (!onSimulateLog) return;
      const eventId = Math.floor(Math.random() * 1000);
      onSimulateLog({
          id: `SIM-${Date.now()}-IN`,
          timestamp: new Date().toISOString(),
          user: channel === 'WhatsApp' ? "+965 9988 7766" : "+965 5544 3322",
          intent: "Webhook Received",
          summary: `Incoming ${channel} Webhook Event ID: ${eventId}`,
          channel: channel
      });
      setTimeout(() => {
          onSimulateLog({
              id: `SIM-${Date.now()}-OUT`,
              timestamp: new Date().toISOString(),
              user: "AI Agent",
              intent: "Auto-Reply",
              summary: "Order status checked. Reply sent successfully.",
              channel: channel
          });
      }, 1000);
  };

  const hasData = logs.length > 0;
  const chartData = hasData ? [
      { name: 'Mon', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 1).length },
      { name: 'Tue', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 2).length },
      { name: 'Wed', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 3).length },
      { name: 'Thu', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 4).length },
      { name: 'Fri', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 5).length },
      { name: 'Sat', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 6).length },
      { name: 'Sun', interactions: logs.filter(l => new Date(l.timestamp).getDay() === 0).length },
  ] : Array(7).fill(0).map((_, i) => ({ name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], interactions: 0 }));

  return (
    <div className="flex-1 bg-gray-50 min-h-full overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">{config.name || 'My Business'} Dashboard</h1>
           <div className="flex items-center space-x-4 mt-1">
               <p className="text-sm">
                   {integrations.isWhatsAppConnected ? (
                       <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle size={12}/> WhatsApp Active</span>
                   ) : (
                       <span className="text-gray-400 flex items-center gap-1"><AlertCircle size={12}/> WhatsApp Inactive</span>
                   )}
               </p>
               <p className="text-sm">
                   {integrations.isPhoneConnected ? (
                       <span className="text-purple-600 flex items-center gap-1 font-medium"><CheckCircle size={12}/> Voice Active</span>
                   ) : (
                       <span className="text-gray-400 flex items-center gap-1"><AlertCircle size={12}/> Voice Inactive</span>
                   )}
               </p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
             <button 
                onClick={() => onLaunchPreview('voice')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
             >
                <Phone size={18} />
                <span className="hidden sm:inline">Simulate Voice Call</span>
             </button>
             <button 
                onClick={() => onLaunchPreview('chat')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
             >
                <MessageSquare size={18} />
                <span className="hidden sm:inline">Simulate Chat</span>
             </button>
             <div className="h-8 w-px bg-gray-300 mx-2"></div>
             <button 
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                title="Logout"
             >
                <LogOut size={20} />
             </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-6 border-b border-gray-200">
          <div className="flex space-x-6 overflow-x-auto">
              {[
                  {id: 'overview', label: 'Overview', icon: Activity},
                  {id: 'settings', label: 'Business Profile', icon: Settings},
                  {id: 'connect', label: 'Integrations', icon: Link},
                  {id: 'logs', label: 'Live Logs', icon: FileText}
              ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                      <tab.icon size={18} />
                      <span className="font-medium">{tab.label}</span>
                  </button>
              ))}
          </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
              <div className="space-y-6">
                  {(!integrations.isWhatsAppConnected || !integrations.isPhoneConnected) && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between">
                          <div className="mb-4 md:mb-0">
                              <h3 className="text-lg font-bold text-blue-900">Finish Setting Up Your AI Agent</h3>
                              <p className="text-blue-700 mt-1">
                                  {!integrations.isWhatsAppConnected && !integrations.isPhoneConnected ? "Connect WhatsApp and your Phone System to go live." : 
                                   !integrations.isWhatsAppConnected ? "Connect WhatsApp to enable chat automation." : "Connect your Phone System to enable voice AI."}
                              </p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('connect')}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                          >
                              Go to Integrations
                          </button>
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-gray-500 text-sm font-medium">Total Conversations</h3>
                          {hasData ? (
                              <p className="text-3xl font-bold text-gray-800 mt-2">{logs.length}</p>
                          ) : (
                              <p className="text-3xl font-bold text-gray-400 mt-2">N/A</p>
                          )}
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-gray-500 text-sm font-medium">Active Channels</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                             {integrations.isWhatsAppConnected ? (
                                 <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center"><MessageSquare size={12} className="mr-1"/> WhatsApp</span>
                             ) : (
                                 <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded text-xs font-bold">WhatsApp Off</span>
                             )}
                             {integrations.isPhoneConnected ? (
                                 <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center"><Phone size={12} className="mr-1"/> Voice ({integrations.voiceIntegrationType})</span>
                             ) : (
                                 <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded text-xs font-bold">Voice Off</span>
                             )}
                          </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-gray-500 text-sm font-medium">System Health</h3>
                          <div className="flex items-center space-x-2 mt-2">
                              <div className={`w-3 h-3 rounded-full bg-green-500 animate-pulse`}></div>
                              <span className="text-gray-700 font-medium">
                                  Operational (Dashboard)
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Engagement Analytics</h3>
                      {!hasData ? (
                          <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                              <Activity className="text-gray-300 mb-2" size={48} />
                              <p className="text-gray-500 font-medium">No data available yet</p>
                              <p className="text-sm text-gray-400">Conversations will appear here once you start using the agent.</p>
                          </div>
                      ) : (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <Tooltip 
                                        cursor={{fill: '#f0f2f5'}} 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                                    />
                                    <Bar dataKey="interactions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* Business Profile Settings */}
          {activeTab === 'settings' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl">
                  <h2 className="text-lg font-semibold mb-1">Agent Configuration</h2>
                  <p className="text-sm text-gray-500 mb-6">Define who your AI agent is and what it knows about your business.</p>
                  
                  <div className="space-y-6">
                      {/* ... other settings ... */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                              <input 
                                type="text" 
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={localConfig.name}
                                onChange={e => setLocalConfig({...localConfig, name: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                              <select 
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={localConfig.industry}
                                onChange={e => setLocalConfig({...localConfig, industry: e.target.value})}
                              >
                                  <option>Laundry & Dry Cleaning</option>
                                  <option>Restaurant / Food Delivery</option>
                                  <option>Retail / E-commerce</option>
                                  <option>Healthcare / Clinic</option>
                                  <option>Real Estate</option>
                                  <option>Other</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Business Description & Values</label>
                          <textarea 
                             rows={3}
                             className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                             value={localConfig.description}
                             onChange={e => setLocalConfig({...localConfig, description: e.target.value})}
                             placeholder="e.g. We are a premium laundry service focusing on speed and quality..."
                          />
                      </div>
                       <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                           <h3 className="text-sm font-semibold text-gray-800 flex items-center mb-3">
                               <CreditCard size={18} className="mr-2 text-blue-600"/> Payments & Transactions
                           </h3>
                           <div className="flex items-center justify-between mb-4">
                               <div>
                                   <label className="text-sm font-medium text-gray-700">Enable Payment Links</label>
                                   <p className="text-xs text-gray-500">Allow the AI to generate payment links for customers.</p>
                               </div>
                               <button 
                                  onClick={() => setLocalConfig({...localConfig, enablePayments: !localConfig.enablePayments})}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localConfig.enablePayments ? 'bg-blue-600' : 'bg-gray-200'}`}
                               >
                                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.enablePayments ? 'translate-x-6' : 'translate-x-1'}`} />
                               </button>
                           </div>
                           
                           {localConfig.enablePayments && (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                   <div>
                                       <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                                       <select 
                                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                                          value={localConfig.currency || 'KD'}
                                          onChange={e => setLocalConfig({...localConfig, currency: e.target.value})}
                                       >
                                           <option value="KD">Kuwaiti Dinar (KD)</option>
                                           <option value="SAR">Saudi Riyal (SAR)</option>
                                           <option value="AED">UAE Dirham (AED)</option>
                                           <option value="QAR">Qatari Riyal (QAR)</option>
                                           <option value="USD">US Dollar (USD)</option>
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-medium text-gray-700 mb-1">Payment Provider</label>
                                       <select disabled className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed">
                                           <option>Tap Payments (Managed)</option>
                                       </select>
                                   </div>
                               </div>
                           )}
                       </div>
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-medium text-gray-700">Product / Service Catalogue</label>
                              <div>
                                  <input 
                                      type="file" 
                                      accept=".csv,.txt,.json,.xlsx,.xls,.docx" 
                                      className="hidden" 
                                      ref={fileInputRef}
                                      onChange={handleFileUpload}
                                  />
                                  <button 
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={isUploading}
                                      className="text-xs flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition disabled:opacity-50"
                                  >
                                      {isUploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Upload size={12} />}
                                      <span>{isUploading ? 'Analyzing...' : 'Upload Catalogue'}</span>
                                  </button>
                              </div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-600">
                                  <div className="col-span-5">ITEM NAME</div>
                                  <div className="col-span-3">PRICE</div>
                                  <div className="col-span-3">QUANTITY / INFO</div>
                                  <div className="col-span-1 text-center">ACTION</div>
                              </div>
                              
                              {localConfig.products && localConfig.products.length > 0 ? (
                                  localConfig.products.map(product => (
                                      <div key={product.id} className="grid grid-cols-12 gap-2 p-3 border-b border-gray-100 items-center hover:bg-white text-sm">
                                          <div className="col-span-5 font-medium">{product.name}</div>
                                          <div className="col-span-3 text-gray-600">{product.price}</div>
                                          <div className="col-span-3 text-gray-500 text-xs">{product.quantity}</div>
                                          <div className="col-span-1 flex justify-center">
                                              <button 
                                                onClick={() => handleRemoveProduct(product.id)}
                                                className="text-red-400 hover:text-red-600 p-1 rounded"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-4 text-center text-sm text-gray-500 italic">No products added. The AI will assume generic services.</div>
                              )}
                              <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 items-center border-t border-gray-200">
                                  <div className="col-span-5">
                                      <input 
                                        placeholder="New Product Name"
                                        className="w-full p-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                                        value={newProduct.name}
                                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                                      />
                                  </div>
                                  <div className="col-span-3">
                                      <input 
                                        placeholder="Price (e.g. 5 KD)"
                                        className="w-full p-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                                        value={newProduct.price}
                                        onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                                      />
                                  </div>
                                  <div className="col-span-3">
                                      <input 
                                        placeholder="Qty (or 'Unlimited')"
                                        className="w-full p-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                                        value={newProduct.quantity}
                                        onChange={e => setNewProduct({...newProduct, quantity: e.target.value})}
                                      />
                                  </div>
                                  <div className="col-span-1 flex justify-center">
                                      <button 
                                        onClick={handleAddProduct}
                                        disabled={!newProduct.name || !newProduct.price}
                                        className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 disabled:bg-gray-300"
                                      >
                                          <Plus size={16} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>

                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Agent Tone</label>
                          <select 
                             className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                             value={localConfig.tone}
                             onChange={e => setLocalConfig({...localConfig, tone: e.target.value})}
                          >
                              <option>Professional & Formal</option>
                              <option>Friendly & Casual</option>
                              <option>Enthusiastic & Sales-focused</option>
                              <option>Empathetic & Support-focused</option>
                          </select>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                            onClick={handleSave}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-white font-medium transition-all ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                              <Save size={18} />
                              <span>{isSaved ? 'Changes Saved!' : 'Save Configuration'}</span>
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'connect' && (
              <div className="space-y-6">
                  {/* ... header ... */}
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 rounded-xl shadow-lg">
                      <div className="flex items-center justify-between">
                          <div>
                              <h2 className="text-2xl font-bold mb-2">Connect Your Channels</h2>
                              <p className="opacity-90 max-w-2xl">
                                  Enable your AI to communicate across multiple platforms. To receive real messages, you must configure the Webhook URL in your Meta/SIP Provider settings.
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* WhatsApp Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                          {/* ... whatsapp content ... */}
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                             <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <MessageSquare size={20} className="mr-2 text-green-600" /> WhatsApp Integration
                             </h3>
                             {integrations.isWhatsAppConnected && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">CONNECTED</span>}
                          </div>
                          
                          {integrations.isWhatsAppConnected ? (
                              <div className="flex-1 space-y-4">
                                  <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                                      <div className="w-10 h-10 bg-green-200 text-green-700 rounded-full flex items-center justify-center mb-2">
                                          <CheckCircle size={20} />
                                      </div>
                                      <h4 className="font-bold text-gray-800">{integrations.whatsappPhoneNumber}</h4>
                                      <button onClick={handleDisconnectWhatsApp} className="text-xs text-red-600 hover:underline mt-1">Disconnect</button>
                                  </div>
                                  <div className="border-t border-gray-100 pt-4">
                                      <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center"><Link size={14} className="mr-1"/> Webhook Configuration</h4>
                                      <p className="text-xs text-gray-500 mb-3">Copy these values to your <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Meta App Dashboard</a> to receive real messages.</p>
                                      <div className="space-y-3">
                                          <div>
                                              <label className="text-xs text-gray-400 font-semibold uppercase">Callback URL</label>
                                              <div className="flex mt-1">
                                                  <input readOnly value={integrations.webhookUrl} className="flex-1 bg-gray-50 border border-gray-200 rounded-l p-2 text-xs font-mono text-gray-600" />
                                                  <button onClick={() => copyToClipboard(integrations.webhookUrl)} className="px-3 bg-gray-200 hover:bg-gray-300 rounded-r text-gray-600"><Copy size={14}/></button>
                                              </div>
                                          </div>
                                          <div>
                                              <label className="text-xs text-gray-400 font-semibold uppercase">Verify Token</label>
                                              <div className="flex mt-1">
                                                  <input readOnly value={integrations.webhookToken} className="flex-1 bg-gray-50 border border-gray-200 rounded-l p-2 text-xs font-mono text-gray-600" />
                                                  <button onClick={() => copyToClipboard(integrations.webhookToken)} className="px-3 bg-gray-200 hover:bg-gray-300 rounded-r text-gray-600"><Copy size={14}/></button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <button 
                                    onClick={() => simulateRealEvent('WhatsApp')}
                                    className="w-full py-2 border border-green-500 text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 flex justify-center items-center"
                                  >
                                      <PlayCircle size={16} className="mr-2"/> Test Real Event (Simulate)
                                  </button>
                              </div>
                          ) : (
                              <div className="flex-1">
                                  {waConnectStatus === 'error' && (
                                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start text-sm mb-4">
                                          <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" /> <div><span className="font-bold">Connection Error:</span> {waErrorMessage}</div>
                                      </div>
                                  )}
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp Phone Number ID</label>
                                           <input 
                                              type="text"
                                              placeholder="e.g. 102938475610293"
                                              className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                                              value={waCreds.phoneNumberId}
                                              onChange={e => setWaCreds({...waCreds, phoneNumberId: e.target.value})}
                                          />
                                          <p className="text-xs text-gray-400 mt-1">This is a long number from your Meta dashboard, not your actual phone number.</p>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Token</label>
                                          <input 
                                              type="password"
                                              className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                                              value={waCreds.accessToken}
                                              onChange={e => setWaCreds({...waCreds, accessToken: e.target.value})}
                                          />
                                      </div>
                                      <button 
                                          onClick={handleVerifyWhatsApp}
                                          disabled={waConnectStatus === 'verifying'}
                                          className="w-full py-2 bg-[#25D366] hover:bg-[#1ebc57] text-white rounded-lg font-bold shadow-sm disabled:opacity-70 flex justify-center items-center"
                                      >
                                          {waConnectStatus === 'verifying' ? <Loader2 className="animate-spin" size={18}/> : "Connect WhatsApp"}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Phone / Voice Card with Tabs */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                             <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <Phone size={20} className="mr-2 text-purple-600" /> Voice & Phone System
                             </h3>
                             {integrations.isPhoneConnected && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold">CONNECTED</span>}
                          </div>

                          {integrations.isPhoneConnected ? (
                              <div className="flex-1 space-y-4">
                                  <div className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg border border-purple-100 text-center">
                                      <div className="w-10 h-10 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center mb-2">
                                          <CheckCircle size={20} />
                                      </div>
                                      <h4 className="font-bold text-gray-800">{integrations.businessPhoneNumber}</h4>
                                      <p className="text-xs text-gray-500 capitalize">via {integrations.voiceIntegrationType}</p>
                                      <button onClick={handleDisconnectPhone} className="text-xs text-red-600 hover:underline mt-1">Disconnect</button>
                                  </div>
                                  <button 
                                    onClick={() => simulateRealEvent('Voice')}
                                    className="w-full py-2 border border-purple-500 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 flex justify-center items-center"
                                  >
                                      <PlayCircle size={16} className="mr-2"/> Test Real Call (Simulate)
                                  </button>
                              </div>
                          ) : (
                              <div>
                                {/* Voice Integration Tabs */}
                                <div className="flex border-b border-gray-200 mb-4">
                                  <button onClick={() => setVoiceTab('sip')} className={`px-4 py-2 text-sm font-medium ${voiceTab === 'sip' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>SIP / VoIP</button>
                                  <button onClick={() => setVoiceTab('twilio')} className={`px-4 py-2 text-sm font-medium ${voiceTab === 'twilio' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>Twilio</button>
                                </div>
                                
                                {/* SIP Form */}
                                {voiceTab === 'sip' && (
                                  <div className="space-y-4 animate-fadeIn">
                                    {sipConnectStatus === 'error' && (
                                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{sipErrorMessage}</div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Phone Number</label>
                                        <input type="text" placeholder="+1 555 123 4567" value={businessPhoneNumber} onChange={e => setBusinessPhoneNumber(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SIP Username</label>
                                          <input type="text" value={sipCreds.sipUsername} onChange={e => setSipCreds({...sipCreds, sipUsername: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SIP Password</label>
                                          <input type="password" value={sipCreds.sipPassword} onChange={e => setSipCreds({...sipCreds, sipPassword: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SIP Server / Domain</label>
                                          <input type="text" placeholder="sip.yourprovider.com" value={sipCreds.sipServer} onChange={e => setSipCreds({...sipCreds, sipServer: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Port</label>
                                          <input type="text" placeholder="5060" value={sipCreds.sipPort} onChange={e => setSipCreds({...sipCreds, sipPort: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                      </div>
                                    </div>
                                    <button onClick={handleConnectSip} disabled={sipConnectStatus === 'verifying'} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-70 flex justify-center items-center">
                                      {sipConnectStatus === 'verifying' ? <Loader2 className="animate-spin" size={18}/> : "Save & Connect SIP"}
                                    </button>
                                  </div>
                                )}

                                {/* Twilio Form */}
                                {voiceTab === 'twilio' && (
                                  <div className="space-y-4 animate-fadeIn">
                                    {twilioConnectStatus === 'error' && (
                                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{twilioErrorMessage}</div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Twilio Phone Number</label>
                                        <input type="text" placeholder="+15017122661" value={twilioCreds.twilioPhoneNumber} onChange={e => setTwilioCreds({...twilioCreds, twilioPhoneNumber: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account SID</label>
                                        <input type="text" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioCreds.twilioAccountSid} onChange={e => setTwilioCreds({...twilioCreds, twilioAccountSid: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Auth Token</label>
                                        <input type="password" value={twilioCreds.twilioAuthToken} onChange={e => setTwilioCreds({...twilioCreds, twilioAuthToken: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"/>
                                    </div>
                                    <button onClick={handleConnectTwilio} disabled={twilioConnectStatus === 'verifying'} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-70 flex justify-center items-center">
                                      {twilioConnectStatus === 'verifying' ? <Loader2 className="animate-spin" size={18}/> : "Connect Twilio"}
                                    </button>
                                  </div>
                                )}
                              </div>
                          )}
                      </div>

                  </div>
              </div>
          )}

          {/* Logs Tab */}
           {activeTab === 'logs' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700">Interaction History</h3>
                      <button className="text-xs text-blue-600 hover:underline">Download CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-gray-500 border-b">
                        <tr>
                          <th className="p-4 font-medium">Time</th>
                          <th className="p-4 font-medium">Channel</th>
                          <th className="p-4 font-medium">Intent</th>
                          <th className="p-4 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {logs.slice().reverse().map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 text-gray-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${log.channel === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {log.channel}
                                </span>
                            </td>
                            <td className="p-4 font-medium text-gray-800">{log.intent}</td>
                            <td className="p-4 text-gray-600 truncate max-w-md">{log.summary}</td>
                          </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <FileText size={48} className="mb-2 opacity-20" />
                                        <p className="text-lg font-medium text-gray-500">No logs found</p>
                                        <p className="text-sm">Interactions will appear here once the agent starts chatting.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
           )}

      </div>
    </div>
  );
};

export default SaaSDashboard;
