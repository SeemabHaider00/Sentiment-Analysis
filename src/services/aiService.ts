import { GoogleGenAI, Type } from "@google/genai";
import { SentimentResult } from "../types";

// Using the newly provided API key to bypass quota limits on the original key.
const USER_PROVIDED_KEY = "AIzaSyB2xwemoYn5dACtg9eE8kkTCeJ4g6SJBog";
const ai = new GoogleGenAI({ apiKey: USER_PROVIDED_KEY || process.env.GEMINI_API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Step 1: Smart Text Preprocessing
function preprocessText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s.,!?'-]/g, '') // Remove unusual symbols
    .replace(/\s+/g, ' ') // Remove duplicate spaces
    .trim();
}

// Custom Business Rules Dictionaries
const POSITIVE_KEYWORDS = ['excellent', 'amazing', 'fast', 'satisfied', 'highly recommend', 'quality', 'good', 'loved', 'perfect', 'happy', 'great', 'awesome', 'best', 'super', 'beautiful', 'nice'];
const NEGATIVE_KEYWORDS = ['bad', 'delayed', 'poor', 'disappointed', 'damaged', 'refund', 'worst', 'useless', 'late', 'terrible', 'issue', 'problem', 'horrible', 'never', 'waste', 'pathetic', 'broken', 'slow'];

// Step 2 & 3: Hybrid Sentiment Rule Engine
function applyHybridRules(originalText: string, aiResult: any): any {
  let { sentiment, confidence, keywords, intensity } = aiResult;
  const cleanText = preprocessText(originalText);
  
  // Rule Evaluation
  let posScore = 0;
  let negScore = 0;
  
  POSITIVE_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) posScore++;
  });
  
  NEGATIVE_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) negScore++;
  });

  // Override logic for weak or Neutral classifications with strong textual evidence
  if (sentiment === 'Neutral' || confidence < 0.70) {
    if (posScore > negScore && posScore >= 1) {
      sentiment = 'Positive';
      confidence = Math.max(confidence, 0.75 + (posScore * 0.05));
      intensity = posScore >= 2 ? 'High' : 'Medium';
    } else if (negScore > posScore && negScore >= 1) {
      sentiment = 'Negative';
      confidence = Math.max(confidence, 0.75 + (negScore * 0.05));
      intensity = negScore >= 2 ? 'High' : 'Medium';
    }
  }

  // Cap confidence at 1.0 (100%)
  confidence = Math.min(confidence, 1.0);

  return {
    sentiment,
    confidence,
    keywords: Array.isArray(keywords) && keywords.length > 0 
      ? keywords 
      : (posScore > negScore ? ['satisfaction'] : negScore > posScore ? ['issue'] : []),
    intensity
  };
}

async function callGeminiWithRetry(batch: string[], retryCount = 0): Promise<any> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are an Enterprise NLP Sentiment Analysis Engine for Sapphire Retails Limited.
        Analyze the sentiment of the following customer reviews.
        
        Classification Guidelines:
        - Positive: Praise, satisfaction, good quality, fast delivery, recommendations, happy emotions.
        - Negative: Complaints, frustration, bad quality, delayed delivery, poor service, disappointment.
        - Neutral: Purely factual statements, order status updates, or ambiguous phrases with no clear emotion (e.g., "received my parcel", "order updated").
        
        CRITICAL RULES:
        1. DO NOT default to "Neutral" if there is any emotional intent, praise, or complaint.
        2. Accurately classify as Positive or Negative if words like "good", "bad", "late", or "perfect" are used.
        3. For mixed sentiment (e.g., "Good product but late delivery"), weigh the stronger emotion or classify based on the primary outcome.

        For each review, determine Sentiment (Positive/Negative/Neutral), Confidence (0.00-1.00), Keywords (2-3 exact words from text), and Intensity (High/Medium/Low).
        Return a valid JSON array of objects strictly matching the input order.

        Reviews:
        ${batch.map((r, idx) => `[ID:${idx}] ${preprocessText(r)}`).join('\n')}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sentiment: { type: Type.STRING, enum: ["Positive", "Negative", "Neutral"] },
              confidence: { type: Type.NUMBER },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              intensity: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["sentiment", "confidence", "keywords", "intensity"]
          }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error: any) {
    const isQuotaError = error?.message?.toLowerCase().includes("quota") || error?.status === 429;
    
    if (isQuotaError && retryCount < 2) {
      // Longer wait for quota - 45s, 90s
      const waitTime = (retryCount + 1) * 45000;
      console.warn(`Quota limit reached. Pausing for ${waitTime/1000}s...`);
      await delay(waitTime);
      return callGeminiWithRetry(batch, retryCount + 1);
    }
    
    // If it still fails, return empty structure so the hybrid engine can fallback gracefully
    console.error("Batch Analysis Interrupted:", error);
    return batch.map(() => ({
      sentiment: 'Neutral',
      confidence: 0.1,
      keywords: [],
      intensity: 'Low'
    }));
  }
}

export async function analyzeReviews(
  reviews: string[], 
  onProgress?: (progress: number) => void
): Promise<SentimentResult[]> {
  try {
    const batchSize = 40; // High batch size = fewer RPM hits
    const results: SentimentResult[] = [];
    const totalBatches = Math.ceil(reviews.length / batchSize);

    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);
      
      const batchResults = await callGeminiWithRetry(batch);
      
      batch.forEach((text, index) => {
        const rawAiResult = batchResults[index] || { sentiment: 'Neutral', confidence: 0, keywords: [], intensity: 'Low' };
        
        // Apply hybrid logic to correct weak classifications
        const finalizedResult = applyHybridRules(text, rawAiResult);

        results.push({
          text,
          ...finalizedResult
        });
      });

      const completed = Math.floor(i / batchSize) + 1;
      if (onProgress) {
        onProgress(Math.floor((completed / totalBatches) * 100));
      }

      // Safe delay between batches to stay under RPM
      if (i + batchSize < reviews.length) {
        await delay(3000); 
      }
    }

    return results;
  } catch (error) {
    console.error("Final Analysis Error:", error);
    throw error;
  }
}
