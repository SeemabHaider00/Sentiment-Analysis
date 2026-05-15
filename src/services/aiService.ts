import { SentimentResult } from "../types";
import { pipeline, env } from '@xenova/transformers';
import { applyLearnedOverrides } from "./learningService";

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

// Custom Business Rules Dictionaries (Refined for Impact Keyword Understanding)
const IMPACT_PHRASES: Record<string, string> = {
  // Negative / Issues
  'poor quality': 'Negative',
  'bad quality': 'Negative',
  'worst quality': 'Negative',
  'damaged article': 'Negative',
  'received broken': 'Negative',
  'torn': 'Negative',
  'defective': 'Negative',
  'late delivery': 'Negative',
  'delayed shipment': 'Negative',
  'package not received': 'Negative',
  'refund issue': 'Negative',
  'no refund': 'Negative',
  'payment failed': 'Negative',
  'not responding': 'Negative',
  'rude staff': 'Negative',
  'poor service': 'Negative',
  'wrong size': 'Negative',
  'fitting issue': 'Negative',
  'missing items': 'Negative',
  'incomplete order': 'Negative',
  'waste of money': 'Negative',
  'never again': 'Negative',
  
  // Positive / Praise
  'amazing fabric': 'Positive',
  'love the quality': 'Positive',
  'fast delivery': 'Positive',
  'highly recommend': 'Positive',
  'perfect fit': 'Positive',
  'excellent service': 'Positive',
  'beautiful design': 'Positive',
  'worth it': 'Positive',
  'satisfied customer': 'Positive'
};

const POSITIVE_KEYWORDS = ['excellent', 'amazing', 'fast', 'satisfied', 'highly recommend', 'quality', 'good', 'loved', 'perfect', 'happy', 'great', 'awesome', 'best', 'super', 'beautiful', 'nice', 'smooth', 'impressed', 'prompt', 'worth'];
const NEGATIVE_KEYWORDS = ['bad', 'delayed', 'poor', 'disappointed', 'damaged', 'refund', 'worst', 'useless', 'late', 'terrible', 'issue', 'problem', 'horrible', 'never', 'waste', 'pathetic', 'broken', 'slow', 'unresponsive', 'frustrating', 'missing', 'incomplete', 'defective', 'torn'];
const NEUTRAL_KEYWORDS = ['received', 'arrived', 'okay', 'average', 'normal', 'standard', 'updated', 'yesterday', 'parcel'];

// Core Reason Mapping Logic (User Requested Categories)
const REASON_MAP: Record<string, string[]> = {
  'Damaged Article': ['damaged', 'broken', 'torn', 'defective', 'tear', 'crack', 'faulty'],
  'Late Delivery': ['late', 'delivery', 'delayed', 'shipment', 'arrived late', 'tracking', 'wait', 'slow'],
  'Refund Issue': ['refund', 'money', 'payment', 'return', 'back', 'credited', 'transaction'],
  'Customer Support Issue': ['support', 'service', 'staff', 'help', 'response', 'talking', 'call', 'rude', 'unhelpful'],
  'Size Issue': ['size', 'fit', 'small', 'large', 'tight', 'loose', 'measurement', 'matching'],
  'Missing Order / Missing Components': ['missing', 'incomplete', 'half', 'part', 'only received', 'not received everything', 'shortage'],
  'Quality': ['stuff', 'fabric', 'material', 'quality', 'poor stuff', 'cheap', 'good quality', 'texture'],
};

function extractImpactKeywordsAndReason(text: string): { impactKeywords: string[], coreReason: string } {
  const lowerText = text.toLowerCase();
  const impactKeywords: string[] = [];
  
  // 1. Phrasal Matches (High Priority)
  Object.keys(IMPACT_PHRASES).forEach(phrase => {
    if (lowerText.includes(phrase)) {
      impactKeywords.push(phrase);
    }
  });

  // 2. Keyword/Categorical Extraction
  let bestReason = 'General Feedback';
  let maxMatches = 0;

  for (const [reason, keywords] of Object.entries(REASON_MAP)) {
    let matches = 0;
    keywords.forEach(kw => {
      if (lowerText.includes(kw)) {
        matches++;
        // Add to impact keywords if it's a significant word not already captured
        if (kw.length > 3 && !impactKeywords.includes(kw)) {
          // Check if it's part of an already captured phrase
          if (!impactKeywords.some(p => p.includes(kw))) {
             impactKeywords.push(kw);
          }
        }
      }
    });
    
    // Weight phrase matches higher for reason extraction
    impactKeywords.forEach(phrase => {
       const mappedKeywords = REASON_MAP[reason] || [];
       if (mappedKeywords.some(kw => phrase.includes(kw))) {
         matches += 2;
       }
    });

    if (matches > maxMatches) {
      maxMatches = matches;
      bestReason = reason;
    }
  }

  // Deduplicate and clean keywords
  const uniqueKeywords = Array.from(new Set(impactKeywords));

  return { 
    impactKeywords: uniqueKeywords.slice(0, 5), 
    coreReason: bestReason 
  };
}

// Step 2 & 3: Hybrid Sentiment Rule Engine
function applyHybridRules(originalText: string, aiResult: any): any {
  let { sentiment, confidence, intensity } = aiResult;
  const cleanText = preprocessText(originalText);
  
  // 1. Extract Impact Keywords and Reason first
  const { impactKeywords, coreReason } = extractImpactKeywordsAndReason(originalText);

  // 2. Check AI Memory / Learning System overrides
  const overrideMatch = applyLearnedOverrides(originalText, sentiment, confidence);
  if (overrideMatch.overridden) {
    sentiment = overrideMatch.sentiment;
    confidence = overrideMatch.confidence;
  }
  
  
  // 3. Rule Evaluation for Sentiment Adjustment
  let posScore = 0;
  let negScore = 0;
  let neuScore = 0;
  
  impactKeywords.forEach(p => {
    if (IMPACT_PHRASES[p] === 'Positive') posScore += 3;
    if (IMPACT_PHRASES[p] === 'Negative') negScore += 3;
  });

  POSITIVE_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) {
      posScore += 2;
    }
  });
  
  NEGATIVE_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) {
      negScore += 2;
    }
  });

  NEUTRAL_KEYWORDS.forEach(kw => {
    if (cleanText.includes(kw)) {
      neuScore++;
    }
  });

  // 4. Final Sentiment Prediction
  if (!overrideMatch.overridden) {
    // Override logic based on Impact Keywords and Core Reasons
    if (negScore > posScore + 1) {
      sentiment = 'Negative';
      confidence = Math.min(0.9, 0.7 + (negScore * 0.05));
    } else if (posScore > negScore + 1) {
      sentiment = 'Positive';
      confidence = Math.min(0.9, 0.7 + (posScore * 0.05));
    } else if (neuScore >= 1 && posScore < 2 && negScore < 2) {
      sentiment = 'Neutral';
      confidence = 0.85;
    }
    
    // Intensity adjustment
    intensity = (posScore > 4 || negScore > 4) ? 'High' : (posScore > 2 || negScore > 2 ? 'Medium' : 'Low');
  }

  return {
    sentiment,
    confidence: Math.min(confidence, 1.0),
    coreReason,
    keywords: impactKeywords,
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
    
    // Process in batches for better performance while maintaining UI responsiveness
    const total = reviews.length;
    const batchSize = 5; 
    
    for (let i = 0; i < total; i += batchSize) {
        const batch = reviews.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (text) => {
            const cleanParams = preprocessText(text);
            let aiResult = { sentiment: 'Neutral', confidence: 0, keywords: [], intensity: 'Low' };
            
            try {
                if (cleanParams.length > 2) {
                    const out = await classifier(cleanParams.slice(0, 512)); 
                    const pred = out[0];
                    aiResult.sentiment = pred.label === 'POSITIVE' ? 'Positive' : 'Negative';
                    aiResult.confidence = pred.score;
                    aiResult.intensity = pred.score > 0.9 ? 'High' : (pred.score > 0.7 ? 'Medium' : 'Low');
                }
            } catch(e) {
                console.warn("Classifier error:", e);
            }

            const finalizedResult = applyHybridRules(text, aiResult);
            return {
              id: Math.random().toString(36).substring(2, 11),
              text,
              ...finalizedResult
            } as SentimentResult;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        if (onProgress) {
            onProgress(Math.floor((Math.min(i + batchSize, total) / total) * 100));
            // Small break to keep the event loop moving
            await new Promise(resolve => setTimeout(resolve, 0)); 
        }
    }
    
    return results;
  } catch (error) {
    console.error("Final Analysis Error:", error);
    throw error;
  }
}

