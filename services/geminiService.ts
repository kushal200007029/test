
import { GoogleGenAI, Type } from "@google/genai";
import { AIInsights } from "../types";
import * as pdfjsLib from 'pdfjs-dist';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePDFContent = async (text: string): Promise<AIInsights> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following text extracted from a PDF document and provide insights in JSON format.
      
      Text Content:
      "${text.substring(0, 4000)}"
      
      Requirements:
      1. summary: A 1-2 sentence overview of the document content.
      2. keywords: 5-8 relevant keywords.
      3. suggestedFileName: A professional, snake_case filename based on the content (without extension).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggestedFileName: { type: Type.STRING }
          },
          required: ["summary", "keywords", "suggestedFileName"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      summary: "Could not analyze document content.",
      keywords: [],
      suggestedFileName: "document_export"
    };
  }
};

export const extractTextFromFirstPage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  return content.items.map((item: any) => (item as any).str).join(' ');
};
