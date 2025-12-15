import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

// Safely access process.env to prevent ReferenceError in browsers
// If process is undefined, it defaults to empty string, preventing the white screen crash
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

const ai = new GoogleGenAI({ apiKey });

// Helper to sanitize JSON string if model returns markdown blocks
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const suggestProductDetails = async (productName: string): Promise<{ category: string; description: string }> => {
  if (!apiKey) return { category: 'General', description: '' };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short description (max 15 words) and a general category for a product named "${productName}". 
      Return JSON format only: { "category": "string", "description": "string" }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    return { category: 'Uncategorized', description: 'Could not generate description.' };
  }
};

export const analyzeInventory = async (inventory: Product[], userQuery: string): Promise<string> => {
  if (!apiKey) return "API Key is missing. Please check your configuration in Vercel settings.";

  // Create a lightweight version of inventory to save tokens
  const inventoryContext = inventory.map(p => ({
    name: p.name,
    qty: p.quantity,
    price: p.price,
    cat: p.category
  }));

  const prompt = `
    You are an intelligent inventory manager assistant.
    **Currency: Bangladeshi Taka (BDT). Symbol: ৳.**
    **Context: You are analyzing the user's LIVE inventory data.**

    Here is the current live inventory data in JSON format:
    ${JSON.stringify(inventoryContext)}

    User Question: "${userQuery}"

    Answer the user's question based on the data provided. 
    If they ask for suggestions, analyze the stock levels and prices.
    Keep the answer concise and helpful. 
    If the inventory is empty, tell them to add products first.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful inventory assistant. You analyze stock levels, value, and suggest actions.",
      }
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Sorry, I encountered an error while analyzing the inventory.";
  }
};