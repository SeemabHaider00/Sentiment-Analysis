export interface LearnedRule {
  textSnippet: string;
  correctedSentiment: 'Positive' | 'Negative' | 'Neutral';
  correctionCount: number;
}

const STORAGE_KEY = 'sentiment_learned_rules';

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
  // Here we assume exact match for simplicity.
  // In a more robust system we would extract N-grams or keywords.
  const lowerText = text.toLowerCase().trim();
  const existing = rules.find(r => r.textSnippet === lowerText);

  if (existing) {
    if (existing.correctedSentiment === newSentiment) {
      existing.correctionCount += 1;
    } else {
      existing.correctedSentiment = newSentiment;
      existing.correctionCount = 1;
    }
  } else {
    rules.push({
      textSnippet: lowerText,
      correctedSentiment: newSentiment,
      correctionCount: 1,
    });
  }

  saveLearnedRules(rules);
}

export function applyLearnedOverrides(text: string, currentSentiment: string, confidence: number): { sentiment: string; confidence: number; overridden: boolean } {
  const rules = getLearnedRules();
  const lowerText = text.toLowerCase().trim();
  
  // Exact match override
  const exactMatch = rules.find(r => r.textSnippet === lowerText);
  if (exactMatch) {
    return {
      sentiment: exactMatch.correctedSentiment,
      confidence: 0.99, // High confidence because human overrode it
      overridden: true
    };
  }

  // Substring match override if it has been corrected multiple times
  // We can look for longer text snippets that appear inside the current text
  const robustRules = rules.filter(r => r.textSnippet.length > 5 && r.correctionCount > 0);
  for (const rule of robustRules) {
    if (lowerText.includes(rule.textSnippet)) {
      return {
        sentiment: rule.correctedSentiment,
        confidence: Math.min(confidence + 0.1, 0.95),
        overridden: true
      };
    }
  }

  return { sentiment: currentSentiment, confidence, overridden: false };
}
