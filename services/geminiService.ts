
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const generatePhotoCaption = async (base64Image: string): Promise<string> => {
  // Requirement: If no API Key, directly return default text
  if (!API_KEY || API_KEY.length == 0) {
    return "Beautiful Moment";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: "You are writing a caption on the bottom border of a Polaroid photo. Write a very short, nostalgic, or witty caption (max 5 words) describing this image. Do not use quotes. Just the text."
          }
        ]
      },
      config: {
        maxOutputTokens: 20,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking to preserve tokens for output
      }
    });

    return response.text?.trim() || "Beautiful Moment";
  } catch (error) {
    console.error("Error generating caption:", error);
    return "Beautiful Moment";
  }
};
