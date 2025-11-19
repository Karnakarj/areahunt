import { GoogleGenAI } from "@google/genai";
import { Coordinate, ChatMessage } from "../types.ts";

// Ensure API Key is present
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const askGeminiAboutArea = async (
  query: string,
  currentLocation: Coordinate | null
): Promise<ChatMessage> => {
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return {
          role: 'model',
          text: "Please set your API Key in index.html to use AI features."
      };
  }

  if (!currentLocation) {
    return {
      role: 'model',
      text: "I need your location to answer that. Please wait for the GPS signal (Green dot).",
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction: "You are a helpful assistant for the 'AreaHunt' app. The user is physically exploring a new neighborhood. Help them identify amenities, safety, or interesting facts about their CURRENT location using Google Maps. Be concise.",
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: currentLocation.lat,
              longitude: currentLocation.lng
            }
          }
        }
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls: { uri: string; title: string }[] = [];

    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          urls.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
        if (chunk.maps) {
            urls.push({ uri: chunk.maps.uri, title: chunk.maps.title || "Google Maps" });
        }
      });
    }

    return {
      role: 'model',
      text: response.text || "I couldn't find information about that location.",
      groundingUrls: urls,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      role: 'model',
      text: "Sorry, I encountered an error connecting to the AI. Please check your internet connection.",
    };
  }
};
