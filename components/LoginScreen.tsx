
import React, { useState, useRef } from 'react';
import { LayoutDashboard, Lock, Mail, ArrowRight, UserPlus, Building2, ShoppingBag, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { BusinessConfig, Product } from '../types';
import { parseProductFile } from '../services/geminiService';

interface LoginScreenProps {
  onLogin: (config?: BusinessConfig) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup Wizard State
  const [signupStep, setSignupStep] = useState(1);
  const [signupData, setSignupData] = useState({
    name: '',
    industry: 'Laundry & Dry Cleaning',
    description: '',
    products: [] as Product[]
  });

  // Product Input State
  const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity: 'Unlimited' });
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onLogin(); // Log in with default/existing config
    }, 1000);
  };

  const handleSignupNext = () => {
    setSignupStep(prev => prev + 1);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    setSignupData(prev => ({
      ...prev,
      products: [...prev.products, { ...newProduct, id: Date.now().toString() }]
    }));
    setNewProduct({ name: '', price: '', quantity: 'Unlimited' });
  };

  const handleRemoveProduct = (id: string) => {
    setSignupData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      
      try {
          // Pass the File object directly to the service which handles Excel/Word parsing
          const extractedProducts = await parseProductFile(file);
          
          if (extractedProducts.length > 0) {
              setSignupData(prev => ({
                  ...prev,
                  products: [...prev.products, ...extractedProducts]
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

  const handleSignupFinish = () => {
    setLoading(true);
    setTimeout(() => {
      // Create a BusinessConfig object from the signup data
      const config: BusinessConfig = {
        name: signupData.name || "My New Business",
        industry: signupData.industry,
        description: signupData.description || "We provide excellent services to our customers.",
        tone: "Professional",
        services: "", // Will be derived from products
        products: signupData.products,
        welcomeMessage: `Hello! Welcome to ${signupData.name || "our business"}. How can I assist you today?`,
        enablePayments: false,
        currency: "KD"
      };
      setLoading(false);
      onLogin(config);
    }, 1500);
  };

  // --- Render Functions ---

  const renderLoginForm = () => (
    <form className="space-y-6" onSubmit={handleLogin}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
            placeholder="you@business.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );

  const renderSignupStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Create Account</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="you@business.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="••••••••" />
      </div>
      <button onClick={handleSignupNext} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 mt-4">
        Next: Business Info
      </button>
    </div>
  );

  const renderSignupStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Business Profile</h3>
      <p className="text-xs text-gray-500">Tell the AI about your company.</p>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Business Name</label>
        <input 
            type="text" 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            placeholder="e.g. Speed Clean Laundry"
            value={signupData.name}
            onChange={(e) => setSignupData({...signupData, name: e.target.value})}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Industry</label>
        <select 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
            value={signupData.industry}
            onChange={(e) => setSignupData({...signupData, industry: e.target.value})}
        >
            <option>Laundry & Dry Cleaning</option>
            <option>Restaurant / Food</option>
            <option>Retail</option>
            <option>Service Provider</option>
            <option>Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
            placeholder="Briefly describe what you do..."
            rows={2}
            value={signupData.description}
            onChange={(e) => setSignupData({...signupData, description: e.target.value})}
        />
      </div>

      <button 
        onClick={handleSignupNext} 
        disabled={!signupData.name}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 mt-4 disabled:bg-gray-300"
      >
        Next: Catalogue
      </button>
    </div>
  );

  const renderSignupStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Product Catalogue</h3>
      <p className="text-xs text-gray-500">Add your products manually or upload a file (Excel, CSV, Menu) for the AI to analyze.</p>
      
      <div className="flex justify-end">
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
             className="text-xs flex items-center space-x-1 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition border border-blue-200 disabled:opacity-50"
          >
             {isUploading ? <Loader2 size={14} className="animate-spin mr-1"/> : <Upload size={14} className="mr-1" />}
             <span>{isUploading ? 'Analyzing File...' : 'Upload from File'}</span>
          </button>
      </div>

      {/* List */}
      <div className="bg-gray-50 rounded-md p-2 max-h-40 overflow-y-auto space-y-2 border border-gray-200">
        {signupData.products.length === 0 && <p className="text-center text-xs text-gray-400 py-2">No items added yet.</p>}
        {signupData.products.map(p => (
            <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                <span className="font-medium truncate max-w-[40%]">{p.name}</span>
                <span className="text-gray-600">{p.price}</span>
                <span className="text-xs text-gray-400">Qty: {p.quantity}</span>
                <button onClick={() => handleRemoveProduct(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
            </div>
        ))}
      </div>

      {/* Add Form */}
      <div className="grid grid-cols-3 gap-2">
         <input 
            placeholder="Name" 
            className="col-span-1 p-2 border border-gray-300 rounded text-sm"
            value={newProduct.name}
            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
         />
         <input 
            placeholder="Price" 
            className="col-span-1 p-2 border border-gray-300 rounded text-sm"
            value={newProduct.price}
            onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
         />
         <div className="col-span-1 flex space-x-1">
             <input 
                placeholder="Qty" 
                className="w-full p-2 border border-gray-300 rounded text-sm"
                value={newProduct.quantity}
                onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
             />
             <button 
                onClick={handleAddProduct}
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
             >
                 <Plus size={16} />
             </button>
         </div>
      </div>

      <div className="flex space-x-3 mt-4">
          <button 
            onClick={handleSignupFinish}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Skip
          </button>
          <button 
            onClick={handleSignupFinish}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Setting up...' : 'Finish Setup'}
          </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center text-blue-900 mb-4">
           <div className="bg-blue-100 p-3 rounded-xl">
             <LayoutDashboard size={32} className="text-blue-600" />
           </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">AutoAgent AI</h2>
        <p className="mt-2 text-sm text-gray-600">
          {isLoginView ? 'Sign in to your dashboard' : 'Create your AI business agent'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 relative">
          
          {isLoginView ? renderLoginForm() : (
            <>
                <div className="mb-6 flex items-center justify-between">
                    <div className={`h-2 flex-1 rounded-full mr-1 ${signupStep >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 flex-1 rounded-full mr-1 ${signupStep >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 flex-1 rounded-full ${signupStep >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                </div>
                {signupStep === 1 && renderSignupStep1()}
                {signupStep === 2 && renderSignupStep2()}
                {signupStep === 3 && renderSignupStep3()}
            </>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLoginView ? 'New to AutoAgent?' : 'Already have an account?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                    setIsLoginView(!isLoginView);
                    setSignupStep(1);
                }}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {isLoginView ? (
                    <>Create an account <UserPlus size={16} className="ml-2" /></>
                ) : (
                    'Sign in instead'
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
