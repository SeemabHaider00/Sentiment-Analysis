import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Cpu, Search, Fingerprint, Layers, BarChart, Zap } from 'lucide-react';

interface ProcessingLoaderProps {
  progress: number;
  total: number;
}

const STAGES = [
  { message: 'Uploading Excel File...', icon: Layers, color: 'text-blue-400' },
  { message: 'Reading Customer Reviews...', icon: Search, iconSize: 24, color: 'text-indigo-400' },
  { message: 'Extracting Impact Keywords...', icon: Fingerprint, color: 'text-emerald-400' },
  { message: 'Detecting Core Reasons...', icon: Cpu, color: 'text-purple-400' },
  { message: 'Running AI Sentiment Engine...', icon: BrainCircuit, color: 'text-pink-400' },
  { message: 'Generating Smart Insights...', icon: Zap, color: 'text-yellow-400' },
  { message: 'Building Dashboard...', icon: BarChart, color: 'text-orange-400' },
];

export function ProcessingLoader({ progress, total }: ProcessingLoaderProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = STAGES[stageIndex].icon;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b_0%,#050505_70%)] opacity-30" />
      
      {/* Animated Glowing Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]"
      />

      <div className="relative w-full max-w-lg">
        {/* Stage Message */}
        <div className="h-20 mb-8 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              className="flex flex-col items-center gap-4"
            >
              <div className={STAGES[stageIndex].color}>
                <CurrentIcon className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-display font-medium text-white tracking-tight uppercase">
                {STAGES[stageIndex].message}
              </h3>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Display */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">
                Analysis Pipeline
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display font-medium text-white">
                  {progress}%
                </span>
                <span className="text-xs text-gray-600 font-mono">
                  / {total} REVIEWS
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-indigo-400 font-mono animate-pulse uppercase">
                AI Engine Active
              </span>
            </div>
          </div>

          <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
            />
            
            {/* Scanning Effect */}
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[30deg]"
            />
          </div>
        </div>

        {/* Dynamic Log Feed */}
        <div className="mt-12 space-y-2 font-mono text-[9px] text-gray-500 uppercase tracking-wider h-32 overflow-hidden border-l border-white/5 pl-4">
          <div className="animate-pulse">Initializing NLP Workspace...</div>
          {progress > 10 && <div>Mounting Transformer Shards...</div>}
          {progress > 30 && <div>Analyzing Semantic Vector Space...</div>}
          {progress > 50 && <div>Optimizing Reasoning Clusters...</div>}
          {progress > 70 && <div>Validating Sentiment Invariants...</div>}
          {progress > 90 && <div>Finalizing Insight Aggregation...</div>}
          <div className="text-indigo-500/50">Processing sequence: {Math.floor(progress * total / 100)} / {total}</div>
        </div>
      </div>
    </div>
  );
}
