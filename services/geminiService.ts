
import { GoogleGenAI, Type } from "@google/genai";
import { UIComponent, UIComponentType } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY  });

const UI_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      label: { type: Type.STRING, description: 'Short name of the component' },
      type: { 
        type: Type.STRING, 
        description: 'Category of UI component',
        enum: Object.values(UIComponentType)
      },
      description: { type: Type.STRING, description: 'Brief explanation of what it is' },
      box_2d: {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
        description: 'Bounding box [ymin, xmin, ymax, xmax] normalized to 0-1000'
      }
    },
    required: ['label', 'type', 'box_2d']
  }
};

export async function detectUIComponents(base64Image: string): Promise<UIComponent[]> {
  // Extract data from dataURL
  const data = base64Image.split(',')[1];
  const mimeType = base64Image.split(';')[0].split(':')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: mimeType,
          },
        },
        {
          text: `Analyze this screenshot and identify all functional UI components including Headers, Navigation menus, Buttons, Icons, Input fields, Forms, Cards, and Footers. For each component, provide its label, type, a brief description, and its bounding box coordinates as [ymin, xmin, ymax, xmax] normalized from 0 to 1000.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: UI_SCHEMA
    }
  });

  try {
    const rawData = JSON.parse(response.text || '[]');
    return rawData.map((item: any, index: number) => ({
      id: `comp-${index}-${Date.now()}`,
      label: item.label,
      type: item.type as UIComponentType,
      description: item.description || '',
      box_2d: {
        ymin: item.box_2d[0],
        xmin: item.box_2d[1],
        ymax: item.box_2d[2],
        xmax: item.box_2d[3]
      }
    }));
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
}
