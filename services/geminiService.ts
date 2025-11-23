
import { GoogleGenAI } from "@google/genai";
import { AiConfig } from "../types";

const API_KEY = process.env.API_KEY || '';

export const generatePhotoCaption = async (base64Image: string, config?: AiConfig): Promise<string> => {
  const defaultCaption = "Beautiful Moment";

  // Check if AI is enabled in config
  if (!config || !config.enabled) {
    return defaultCaption;
  }

  const promptText = "You are writing a caption on the bottom border of a Polaroid photo. Write a very short, nostalgic, or witty caption (max 5 words) describing this image. Do not use quotes. Just the text.";

  // NOTE: We removed the top-level try/catch to allow errors to propagate to the App component for UI display.
  
  if (config.provider === 'openai' && config.openaiConfig) {
    let { baseUrl, apiKey, model } = config.openaiConfig;
    
    // Basic validation
    if (!apiKey) {
        throw new Error("OpenAI API Key is missing");
    }

    // Auto-fix URL protocol to prevent CORS issues (users often forget 'https://')
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
        console.warn("Base URL missing protocol, prepending https://");
        baseUrl = `https://${baseUrl}`;
    }

    // Normalize Base URL
    let url = baseUrl || 'https://api.openai.com/v1';
    url = url.replace(/\/+$/, ''); // Remove trailing slash
    
    // Append completion endpoint if not present
    if (!url.endsWith('/chat/completions')) {
        url = `${url}/chat/completions`;
    }

    console.log(`[RetroSnap] Calling OpenAI: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: base64Image } } 
            ]
          }
        ],
        max_tokens: 20,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      let errorMsg = `Status ${response.status}: ${response.statusText}`;
      try {
          const errorBody = await response.text();
          console.error(`OpenAI API Error Details:`, errorBody);
          // Try to parse generic OpenAI error message
          const json = JSON.parse(errorBody);
          if (json.error && json.error.message) {
              errorMsg = json.error.message;
          } else {
              errorMsg = errorBody.substring(0, 100); // Truncate log
          }
      } catch (readError) {
          // Ignore parse error
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || defaultCaption;

  } else {
    // Gemini Implementation (Default)
    if (!API_KEY || API_KEY.length === 0) {
      // If no env key, we can't use Gemini. 
      // We don't throw here to avoid breaking the app for users without keys, just return default.
      return defaultCaption;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        // Handle data URL prefix if present for Gemini SDK
        const cleanBase64 = base64Image.includes('base64,') ? base64Image.split(',')[1] : base64Image;

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
                text: promptText
              }
            ]
          }
        });

        return response.text?.trim() || defaultCaption;
    } catch (geminiError: any) {
        console.error("Gemini Error", geminiError);
        throw new Error(`Gemini Error: ${geminiError.message || 'Unknown'}`);
    }
  }
};
