export interface SentimentResult {
  id?: string;
  text: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  confidence: number;
  keywords: string[];
  intensity: 'High' | 'Medium' | 'Low';
}

export interface AnalysisSummary {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  averageConfidence: number;
}
