
import { GoogleGenAI } from "@google/genai";

// Access the key safely. In Vite, process.env.API_KEY is replaced by the define plugin string.
// We also fallback to an empty string to prevent undefined errors.
// @ts-ignore - process might be undefined in some browser contexts if not polyfilled, but the string replacement handles it.
const apiKey = process.env.API_KEY || '';

// Initialisation conditionnelle pour éviter le crash global de l'app si la clé est absente
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Erreur d'initialisation Gemini:", error);
  }
} else {
  console.warn("API_KEY manquante. L'assistant IA sera désactivé.");
}

export const generateCommunication = async (
  prompt: string, 
  language: 'fr' | 'ar',
  context: string = ''
): Promise<string> => {
  if (!ai) {
    return language === 'fr' 
      ? "Service IA indisponible (Clé API manquante)." 
      : "خدمة الذكاء الاصطناعي غير متاحة (مفتاح API مفقود).";
  }

  try {
    const systemInstruction = `
      You are an expert administrative assistant for the State Asset Management Department in Mauritania.
      Your goal is to facilitate collaborative work between ministries regarding asset inventory and management.
      
      CRITICAL INSTRUCTION:
      You MUST provide the response in BOTH French AND Arabic for every request.
      
      Format your response exactly like this:
      
      --- 🇫🇷 Français ---
      [The response in French]

      --- 🇲🇷 العربية ---
      [The response in Arabic]
      
      Tone: Formal, Administrative, Respectful (Governmental standard).
      Currency: Use MRU (Ouguiya) if values are mentioned.
      
      Topics often include:
      1. Requesting asset declarations (Real Estate, Vehicles, Furniture).
      2. Scheduling technical inspections.
      3. Explaining the legal obligation of state property census.
      
      Additional Context: ${context}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Erreur de génération / خطأ في الإنشاء";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Service indisponible / الخدمة غير متاحة";
  }
};
