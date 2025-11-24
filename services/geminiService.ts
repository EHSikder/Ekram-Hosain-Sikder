
import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { LogEntry, BusinessConfig, Product } from '../types';
import { GEMINI_API_KEY } from '../constants';

// --- Tool Definitions (Generic) ---

const checkStatusTool: FunctionDeclaration = {
  name: "checkStatus",
  description: "Check the status of an order, appointment, or ticket.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      identifier: {
        type: Type.STRING,
        description: "The ID (Order ID, Ticket ID) or Phone Number",
      },
    },
    required: ["identifier"],
  },
};

const createBookingTool: FunctionDeclaration = {
  name: "createBooking",
  description: "Create a new booking, order, or appointment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      details: { type: Type.STRING, description: "Details of the booking (date, time, address, items)" },
      customerContact: { type: Type.STRING, description: "Customer phone or email" },
    },
    required: ["details", "customerContact"],
  },
};

const getPricingTool: FunctionDeclaration = {
  name: "getPricing",
  description: "Get list of services and prices.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const logIssueTool: FunctionDeclaration = {
  name: "logIssue",
  description: "Log a customer complaint or issue.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "Description of the issue" },
    },
    required: ["description"],
  },
};

const generatePaymentLinkTool: FunctionDeclaration = {
  name: "generatePaymentLink",
  description: "Generate a payment link for the customer to pay for an order.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "Amount to charge" },
      description: { type: Type.STRING, description: "Description of items or service" },
    },
    required: ["amount", "description"],
  },
};

// --- Service Implementation ---

let chatSession: any = null;
let addLogCallback: ((log: LogEntry) => void) | null = null;
let currentConfig: BusinessConfig | null = null;

// Helper to generate dynamic instructions
const generateSystemInstruction = (config: BusinessConfig): string => {
  // Generate services list from structured products or fallback string
  let servicesList = config.services;
  if (config.products && config.products.length > 0) {
    servicesList = config.products
      .map(p => `- ${p.name}: ${p.price} (Availability: ${p.quantity || 'Unlimited'})`)
      .join('\n');
  }

  const paymentInstruction = config.enablePayments 
    ? `5. You can accept payments. When a customer confirms an order or asks to pay, calculate the total and use the 'generatePaymentLink' tool to send them a secure link.`
    : `5. You cannot process payments directly. Ask the customer to pay upon delivery or pickup.`;

  return `
    You are the AI customer support agent for "${config.name}".
    
    BUSINESS PROFILE:
    Industry: ${config.industry}
    Description: ${config.description}
    Currency: ${config.currency || 'KD'}
    
    CATALOGUE / SERVICES:
    ${servicesList}
    
    YOUR PERSONA:
    Tone: ${config.tone}
    Language: Detect user language (English/Arabic preferred) and reply in same.
    
    RESPONSIBILITIES:
    1. Answer queries about the business and services.
    2. Manage bookings/orders using the 'createBooking' tool.
    3. Check status using 'checkStatus'.
    4. Handle complaints politely and log them using 'logIssue'.
    ${paymentInstruction}
    
    Current Date: ${new Date().toLocaleString()}
    
    IMPORTANT:
    - Be helpful and concise.
    - If you need information (address, time, etc.) to complete a booking, ask for it.
    - Use the provided tools when relevant. Do not make up order statuses.
  `;
};

export const initializeGemini = (
  onLogAdd: (log: LogEntry) => void, 
  apiKey: string, // Kept for signature compatibility but ignored
  config: BusinessConfig
) => {
  addLogCallback = onLogAdd;
  currentConfig = config;
  
  // Always use the system key
  const keyToUse = GEMINI_API_KEY;

  if (!keyToUse) {
    console.warn("System API Key is missing.");
    return;
  }

  const activeFunctionDeclarations = [checkStatusTool, createBookingTool, getPricingTool, logIssueTool];

  if (config.enablePayments) {
    activeFunctionDeclarations.push(generatePaymentLinkTool);
  }

  const ai = new GoogleGenAI({ apiKey: keyToUse });
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: generateSystemInstruction(config),
      tools: [{ functionDeclarations: activeFunctionDeclarations }],
    },
  });
};

export const sendMessageToGemini = async (userMessage: string, channel: 'WhatsApp' | 'Voice'): Promise<string> => {
  if (!chatSession) {
    return "AI Agent is not initialized. Please ensure the system is configured.";
  }

  try {
    let result = await chatSession.sendMessage({ message: userMessage });
    
    // Handle Function Calls
    const calls = result.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall);

    if (calls && calls.length > 0) {
      const functionResponses = calls.map((part: any) => {
        const call = part.functionCall;
        const response = executeClientSideTool(call.name, call.args, channel);
        return {
          id: call.id,
          name: call.name,
          response: { result: response }
        };
      });

      result = await chatSession.sendMessage(functionResponses);
    }

    const responseText = result.text;
    return responseText || "I'm sorry, I didn't quite catch that.";

  } catch (error) {
    console.error("Gemini Error:", error);
    return "I am currently experiencing connectivity issues. Please try again.";
  }
};

/**
 * Helper to extract text from various file types (CSV, JSON, TXT, XLSX, DOCX)
 */
const readFileContent = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Excel Support
  if (extension === 'xlsx' || extension === 'xls') {
    try {
        // Dynamic import to avoid bundling if not used, or to rely on importmap
        // @ts-ignore
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Convert to CSV for easier text analysis by Gemini
        return XLSX.utils.sheet_to_csv(worksheet);
    } catch (e) {
        console.error("Excel parse error", e);
        throw new Error("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
    }
  }
  
  // Word Support
  if (extension === 'docx') {
     try {
        // @ts-ignore
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        return result.value;
     } catch (e) {
         console.error("Word parse error", e);
         throw new Error("Failed to parse Word file. Please ensure it is a valid .docx file.");
     }
  }

  // Default: treat as text (CSV, JSON, TXT)
  return await file.text();
}

/**
 * Parses an uploaded file to extract product information using Gemini.
 */
export const parseProductFile = async (file: File): Promise<Product[]> => {
  const keyToUse = GEMINI_API_KEY;
  if (!keyToUse) throw new Error("System API Key is missing.");

  let fileContent = "";
  try {
    fileContent = await readFileContent(file);
  } catch (err: any) {
    throw new Error(err.message || "Failed to read file.");
  }

  if (!fileContent || fileContent.length < 5) {
      throw new Error("File appears to be empty or unreadable.");
  }

  const ai = new GoogleGenAI({ apiKey: keyToUse });
  
  const prompt = `
    You are a data extraction assistant.
    Analyze the following text (which might be from a CSV, menu, Excel sheet, or list) and extract a list of products or services offered.
    
    Return strictly a JSON array of objects. Do not include markdown formatting (like \`\`\`json).
    
    Schema for each object:
    {
      "name": "string (Name of item)",
      "price": "string (Price with currency if available, e.g. '5 KD')",
      "quantity": "string (Default to 'Unlimited' if not specified)"
    }

    Text content to analyze:
    ${fileContent.substring(0, 30000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawProducts = JSON.parse(text);
    
    // Map to ensure ID and types
    return rawProducts.map((p: any) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: String(p.name || 'Unknown Item'),
      price: String(p.price || 'Ask for Price'),
      quantity: String(p.quantity || 'Unlimited')
    }));

  } catch (error) {
    console.error("Error parsing product file:", error);
    throw new Error("Failed to analyze file content. Please check the format.");
  }
};

// --- Mock Backend Logic (Simulating the user's connected CRM) ---

const executeClientSideTool = (name: string, args: any, channel: 'WhatsApp' | 'Voice'): string => {
  let output = "";
  let intent = "Unknown";
  const businessName = currentConfig?.name || "Business";
  const currency = currentConfig?.currency || "KD";

  switch (name) {
    case "checkStatus":
      intent = "Status Check";
      output = `[Simulated CRM Response] Order/Ticket ${args.identifier} is currently In Progress. expected completion: Tomorrow.`;
      break;

    case "createBooking":
      intent = "New Booking";
      output = `[Simulated CRM Response] Booking confirmed for ${args.details}. Reference #BK-${Math.floor(Math.random() * 10000)}.`;
      break;

    case "getPricing":
      intent = "Pricing Inquiry";
      // Determine what pricing to show
      let pricingInfo = "";
      if (currentConfig?.products && currentConfig.products.length > 0) {
         pricingInfo = currentConfig.products.map(p => `${p.name}: ${p.price}`).join(", ");
      } else {
         pricingInfo = currentConfig?.services || "Standard rates apply.";
      }
      output = `[Simulated Database] Prices for ${businessName}: ${pricingInfo}`;
      break;
    
    case "logIssue":
      intent = "Complaint";
      output = "Ticket created #INC-9988. Escalated to human support team.";
      break;
    
    case "generatePaymentLink":
      intent = "Payment Request";
      output = `Link generated: https://pay.tap.company/${businessName.toLowerCase().replace(/\s/g,'')}/inv_${Math.floor(Math.random() * 10000)}?amt=${args.amount} (Amount: ${args.amount} ${currency} for ${args.description})`;
      break;

    default:
      output = "Function executed successfully.";
  }

  if (addLogCallback) {
    addLogCallback({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "Guest User",
      intent: intent,
      summary: `Action: ${name}`,
      channel: channel
    });
  }

  return output;
};
