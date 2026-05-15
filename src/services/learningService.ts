export interface LearnedRule {
  textSnippet: string;
  correctedSentiment: 'Positive' | 'Negative' | 'Neutral';
  correctionCount: number;
  weight: number;
}

const STORAGE_KEY = 'sentiment_learned_rules_v2'; // Changed key to ensure clean slate for improved schema

export function getLearnedRules(): LearnedRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load learned rules", e);
  }
  return [];
}

export function saveLearnedRules(rules: LearnedRule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error("Failed to save learned rules", e);
  }
}

export function addCorrection(text: string, newSentiment: 'Positive' | 'Negative' | 'Neutral') {
  const rules = getLearnedRules();
  const lowerText = text.toLowerCase().trim();
  
  // Extract key negative or positive phrases (heuristic)
  // For now we persist the whole text as a "pattern"
  const existing = rules.find(r => r.textSnippet === lowerText);

  if (existing) {
    if (existing.correctedSentiment === newSentiment) {
      existing.correctionCount += 1;
      existing.weight = Math.min(existing.weight + 0.1, 1.0);
    } else {
      existing.correctedSentiment = newSentiment;
      existing.correctionCount = 1;
      existing.weight = 0.5;
    }
  } else {
    rules.push({
      textSnippet: lowerText,
      correctedSentiment: newSentiment,
      correctionCount: 1,
      weight: 0.5
    });
  }

  saveLearnedRules(rules);
}

export function applyLearnedOverrides(text: string, currentSentiment: string, confidence: number): { sentiment: string; confidence: number; overridden: boolean } {
  const rules = getLearnedRules();
  const lowerText = text.toLowerCase().trim();
  
  // 1. Exact match override
  const exactMatch = rules.find(r => r.textSnippet === lowerText);
  if (exactMatch) {
    return {
      sentiment: exactMatch.correctedSentiment,
      confidence: 0.99, 
      overridden: true
    };
  }

  // 2. Substring pattern match
  // We prioritize rules with higher correction counts and weights
  const sortedRules = rules
    .filter(r => r.textSnippet.length > 3)
    .sort((a, b) => (b.correctionCount * b.weight) - (a.correctionCount * a.weight));

  for (const rule of sortedRules) {
    if (lowerText.includes(rule.textSnippet)) {
      // If it's a short snippet, it might be a powerful keyword the user taught us
      const boost = 0.2 * rule.weight;
      return {
        sentiment: rule.correctedSentiment,
        confidence: Math.min(confidence + boost, 0.98),
        overridden: true
      };
    }
  }

  return { sentiment: currentSentiment, confidence, overridden: false };
}

export function getSnippetStats(text: string): { correctionCount: number } {
  const rules = getLearnedRules();
  const lowerText = text.toLowerCase().trim();
  const rule = rules.find(r => r.textSnippet === lowerText);
  return {
    correctionCount: rule ? rule.correctionCount : 0
  };
}
