import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { LoadingScreen } from './components/LoadingScreen';
import { analyzeReviews } from './services/aiService';
import { SentimentResult } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BarChart3, Database, Globe } from 'lucide-react';

export default function App() {
  const [reviews, setReviews] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<SentimentResult[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleDataLoaded = async (loadedReviews: string[]) => {
    setReviews(loadedReviews);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Add micro-task break to allow LoadingScreen to mount before intense work
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const results = await analyzeReviews(loadedReviews, (progress) => {
        setAnalysisProgress(progress);
      });
      setAnalysisResults(results);
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Please check your network or try a smaller dataset.");
      handleReset();
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleReset = () => {
    setReviews([]);
    setAnalysisResults(null);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
  };

  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-24 lg:pt-32">
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <LoadingScreen realProgress={analysisProgress} />
            </motion.div>
          ) : !analysisResults ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="space-y-6 text-center mb-16">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono uppercase tracking-widest"
                >
                  <Sparkles className="w-3 h-3" />
                  AI-Powered Retail Intelligence
                </motion.div>
                
                <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight max-w-4xl mx-auto">
                  Decode the Voice of your <span className="gradient-text italic">Customers.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                  Enterprise sentiment analysis for Sapphire Retails Limited. 
                  Transform raw feedback into actionable business intelligence in seconds.
                </p>
              </div>

              <div className="w-full">
                <FileUpload onDataLoaded={handleDataLoaded} isLoading={isAnalyzing} />
              </div>

              {/* Feature Grid */}
              {!isAnalyzing && (
                <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl text-left border-t border-white/5 pt-16 mb-24">
                  <div className="space-y-4">
                    <BarChart3 className="w-6 h-6 text-gray-400" />
                    <h3 className="font-medium text-white">Sentiment Mapping</h3>
                    <p className="text-sm text-gray-500">Advanced NLP detection for Positive, Negative, and Neutral stances in retail feedback.</p>
                  </div>
                  <div className="space-y-4">
                    <Database className="w-6 h-6 text-gray-400" />
                    <h3 className="font-medium text-white">Excel Extraction</h3>
                    <p className="text-sm text-gray-500">Smart parsing of large datasets with support for legacy .xls and modern .xlsx formats.</p>
                  </div>
                  <div className="space-y-4">
                    <Globe className="w-6 h-6 text-gray-400" />
                    <h3 className="font-medium text-white">Global Context</h3>
                    <p className="text-sm text-gray-500">Multilingual support with cultural nuance detection powered by Google Gemini AI.</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <Dashboard data={analysisResults} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 w-full py-6 px-6 border-t border-white/5 bg-sapphire-black/80 backdrop-blur-md flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center font-bold text-black text-[10px]">S</div>
          <span className="text-sm font-display font-semibold tracking-tight">Sapphire Retails</span>
        </div>
        <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest hidden sm:block">
          Enterprise Solution v.1.0-RC1
        </div>
        <div className="text-[10px] font-mono text-gray-500">
          © 2026 SAPPHIRE RETAILS LIMITED. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
