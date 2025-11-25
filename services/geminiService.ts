import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateShapeMask = async (prompt: string): Promise<string> => {
  try {
    const fullPrompt = `Create a high-contrast, black and white silhouette icon of: ${prompt}. Solid black shape on white background. Minimalist vector style. Do not add text or gray details.`;
    
    // We use gemini-2.5-flash-image for speed or pro-image for quality if key is paid, 
    // defaulting to the flash image model as per instructions for general generation.
    // If the user provided key supports it, gemini-3-pro-image-preview is better for quality.
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [{ text: fullPrompt }],
      },
       config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (part && part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    
    throw new Error("Nessuna immagine generata");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};