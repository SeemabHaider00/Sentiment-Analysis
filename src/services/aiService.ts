import { SentimentResult } from "../types";
import { pipeline, env } from '@xenova/transformers';

// Optional: Configure transformers for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Common Contractions Mapping
const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "couldn't": "could not",
  "won't": "will not",
  "wouldn't": "would not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "hasn't": "has not",
  "haven't": "have not",
  "hadn't": "had not",
  "shouldn't": "should not",
  "i'm": "i am",
  "it's": "it is",
  "that's": "that is"
};
const CONTRACTION_REGEX = new RegExp(`\\b(${Object.keys(CONTRACTIONS).map(k => k.replace(/'/g, "\\'")).join('|')})\\b`, 'g');

// Common Slang Mapping
const SLANG_MAP: Record<string, string> = {
  "gr8": "great",
  "awsm": "awesome",
  "thru": "through",
  "plz": "please",
  "pls": "please",
  "thx": "thanks",
  "ty": "thank you",
  "nvm": "nevermind",
  "omg": "oh my god",
  "btw": "by the way",
  "fyi": "for your information",
  "asap": "as soon as possible",
  "imo": "in my opinion",
  "imho": "in my honest opinion",
  "tbh": "to be honest",
  "idk": "i do not know",
  "wdym": "what do you mean",
  "wth": "what the hell",
  "wtf": "what the fuck",
  "smh": "shaking my head",
};
const SLANG_REGEX = new RegExp(`\\b(${Object.keys(SLANG_MAP).join('|')})\\b`, 'g');

// Step 1: Smart Text Preprocessing
function preprocessText(text: string): string {
  if (!text) return "";
  
  let processed = text.toLowerCase();

  // Expand contractions and slang
  processed = processed.replace(CONTRACTION_REGEX, match => CONTRACTIONS[match] || match);
  processed = processed.replace(SLANG_REGEX, match => SLANG_MAP[match] || match);

  return processed
    .replace(/[^\w\s.,!?'-]/g, '') // Remove unusual symbols
    .replace(/\s+/g, ' ') // Remove duplicate spaces
    .trim();
}

// Custom Business Rules Dictionaries
const POSITIVE_KEYWORDS = ['excellent', 'amazing', 'fast', 'satisfied', 'highly recommend', 'quality', 'good', 'loved', 'perfect', 'happy', 'great', 'awesome', 'best', 'super', 'beautiful', 'nice', 'smooth', 'impressed', 'prompt'];
const NEGATIVE_KEYWORDS = ['bad', 'delayed', 'poor', 'disappointed', 'damaged', 'refund', 'worst', 'useless', 'late', 'terrible', 'issue', 'problem', 'horrible', 'never', 'waste', 'pathetic', 'broken', 'slow', 'unresponsive', 'frustrating'];
const NEUTRAL_KEYWORDS = ['received', 'arrived', 'okay', 'average', 'normal', 'standard', 'updated'];

// Step 2 & 3: Hybrid Sentiment Rule Engine
function applyHybridRules(originalText: string, aiResult: any): any {
  let { sentiment, confidence, keywords, intensity } = aiResult;
  const cleanText = preprocessText(originalText);
  
  // Rule Evaluation
  let posScore = 0;
  let negScore = 0;
  let neuScore = 0;
  let foundPos: string[] = [];
  let foundNeg: string[] = [];
  
  POSITIVE_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) {
      posScore++;
      foundPos.push(kw);
    }
  });
  
  NEGATIVE_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) {
      negScore++;
      foundNeg.push(kw);
    }
  });

  NEUTRAL_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) {
      neuScore++;
    }
  });

  // Decide sentiment based on weighted scoring with AI result as a baseline
  
  // If AI classified as Positive but we see negative keywords...
  if (sentiment === 'Positive' && negScore > posScore) {
    sentiment = 'Negative';
    confidence = Math.max(0.6, confidence - 0.2);
  } else if (sentiment === 'Negative' && posScore > negScore) {
    sentiment = 'Positive';
    confidence = Math.max(0.6, confidence - 0.2);
  }
  
  // Override neutral explicitly based on user requests (if confidence low or strong keywords present)
  if (sentiment === 'Neutral' || confidence < 0.80) {
    if (posScore > negScore && posScore >= 1) {
      sentiment = 'Positive';
      confidence = Math.max(confidence, 0.75 + (posScore * 0.05));
      intensity = posScore >= 2 ? 'High' : 'Medium';
      keywords = foundPos.slice(0, 3);
    } else if (negScore > posScore && negScore >= 1) {
      sentiment = 'Negative';
      confidence = Math.max(confidence, 0.75 + (negScore * 0.05));
      intensity = negScore >= 2 ? 'High' : 'Medium';
      keywords = foundNeg.slice(0, 3);
    } else if (neuScore >= 1 && posScore === 0 && negScore === 0) {
       sentiment = 'Neutral';
       confidence = 0.85;
       intensity = 'Low';
    } else if (confidence === 0) {
       // Manual rule engine if everything failed
       sentiment = 'Neutral';
       confidence = 0.5;
       intensity = 'Low';
       keywords = [];
    }
  }

  // Hardcode missing keywords based on our known keywords
  if (!keywords || keywords.length === 0) {
     if (sentiment === 'Positive') keywords = foundPos.slice(0, 3);
     if (sentiment === 'Negative') keywords = foundNeg.slice(0, 3);
     if (keywords.length === 0 && sentiment === 'Positive') keywords = ['good experience'];
     if (keywords.length === 0 && sentiment === 'Negative') keywords = ['poor experience'];
  }

  // Cap confidence at 1.0 (100%)
  confidence = Math.min(confidence, 1.0);

  return {
    sentiment,
    confidence,
    keywords: Array.isArray(keywords) && keywords.length > 0 ? keywords : [],
    intensity
  };
}

let nlpPipeline: any = null;

async function getPipeline() {
  if (!nlpPipeline) {
    // Lazy load the text-classification pipeline
    // using DistilBERT fine-tuned on SST-2 (positive/negative sentiment)
    nlpPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  }
  return nlpPipeline;
}

export async function analyzeReviews(
  reviews: string[], 
  onProgress?: (progress: number) => void
): Promise<SentimentResult[]> {
  try {
    const classifier = await getPipeline();
    const results: SentimentResult[] = [];
    
    // Process sequentially so we can update the UI per item
    const total = reviews.length;
    for (let i = 0; i < total; i++) {
        const text = reviews[i];
        const cleanParams = preprocessText(text);

        // Run Transformer Inference
        let aiResult = { sentiment: 'Neutral', confidence: 0, keywords: [], intensity: 'Low' };
        
        try {
            // Avoid empty strings. The model takes a string and outputs sentiment.
            if (cleanParams.length > 2) {
                const out = await classifier(cleanParams.slice(0, 512)); 
                // e.g. [{ label: 'POSITIVE', score: 0.99 }]
                const pred = out[0];
                aiResult.sentiment = pred.label === 'POSITIVE' ? 'Positive' : 'Negative';
                aiResult.confidence = pred.score;
                aiResult.intensity = pred.score > 0.9 ? 'High' : (pred.score > 0.7 ? 'Medium' : 'Low');
            }
        } catch(e) {
            console.warn("Classifier error on text:", text, e);
        }

        // Apply hybrid logic to correct weak classifications and correctly infer Neutral
        const finalizedResult = applyHybridRules(text, aiResult);

        results.push({
          text,
          ...finalizedResult
        });

        // Yield execution to the browser and update progress every iteration
        if (onProgress) {
            onProgress(Math.floor(((i + 1) / total) * 100));
            // Slight delay so the UI thread doesn't freeze
            await delay(10); 
        }
    }
    
    return results;
  } catch (error) {
    console.error("Final Analysis Error:", error);
    throw error;
  }
}

