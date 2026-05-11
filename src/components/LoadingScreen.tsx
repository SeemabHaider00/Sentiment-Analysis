import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Database, Search, CheckCircle2, Loader2, Cpu } from 'lucide-react';

const PHASES = [
  { id: 'read', label: 'Reading Excel File...', icon: Database, progress: 25 },
  { id: 'extract', label: 'Extracting Reviews...', icon: Search, progress: 50 },
  { id: 'analyze', label: 'Processing Sentiments...', icon: Cpu, progress: 85 },
  { id: 'results', label: 'Generating Results...', icon: CheckCircle2, progress: 100 },
];

interface LoadingScreenProps {
  realProgress?: number;
}

export function LoadingScreen({ realProgress }: LoadingScreenProps) {
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Phase calculation based on progress
    if (realProgress !== undefined) {
      if (realProgress < 5) setCurrentPhaseIdx(0);
      else if (realProgress < 20) setCurrentPhaseIdx(1);
      else if (realProgress < 95) setCurrentPhaseIdx(2);
      else setCurrentPhaseIdx(3);
      
      // Smoothly animate display progress to real progress
      const timer = setTimeout(() => {
        setDisplayProgress(prev => {
          if (prev < realProgress) return prev + 1;
          return realProgress;
        });
      }, 20);
      return () => clearTimeout(timer);
    } else {
      // Fallback timer if no real progress is provided
      const timer = setInterval(() => {
        setCurrentPhaseIdx(prev => (prev < PHASES.length - 1 ? prev + 1 : prev));
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [realProgress, displayProgress]);

  const currentPhase = PHASES[currentPhaseIdx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-center select-none"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md space-y-12">
        {/* Animated Loader Icon */}
        <div className="relative flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full border-t-2 border-r-2 border-white/20 border-b-2 border-l-2 border-t-white"
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <motion.div
              key={currentPhase.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 bg-white/5 rounded-2xl border border-white/10"
             >
                <currentPhase.icon className="w-6 h-6 text-white" />
             </motion.div>
          </div>
          
          {/* Scanning Effect Overlay */}
          <motion.div 
            animate={{ 
              top: ['0%', '100%', '0%'],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.5)]"
          />
        </div>

        {/* Text and Status */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentPhase.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="text-2xl font-display font-medium tracking-tight text-white"
            >
              {currentPhase.label}
            </motion.h2>
          </AnimatePresence>
          <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">
            {realProgress !== undefined ? (
              displayProgress === realProgress && realProgress > 0 && realProgress < 100 
              ? "Balancing API load... Please wait" 
              : `Analysis in progress... ${realProgress}%`
            ) : `Sapphire AI Engine is active`}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-3">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              initial={{ width: '0%' }}
              animate={{ width: `${realProgress ?? displayProgress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center font-mono text-[10px] text-gray-600">
            <span>MODULE_LOAD: OK</span>
            <span className="text-gray-400">{realProgress ?? displayProgress}%</span>
          </div>
        </div>

        {/* Detail Log (Optional visual flair) */}
        <div className="pt-8 border-t border-white/5 flex flex-col gap-2">
           <div className="flex items-center gap-3 text-left">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-mono text-gray-500">SECURE_CHANNEL_ESTABLISHED</span>
           </div>
           <div className="flex items-center gap-3 text-left">
              <motion.div 
                animate={{ opacity: [0, 1] }} 
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="w-1.5 h-1.5 rounded-full bg-blue-500" 
              />
              <span className="text-[10px] font-mono text-gray-400">ANALYSING_CONTEXTUAL_NUANCE...</span>
           </div>
        </div>
      </div>

      {/* Decorative Brand Tag */}
      <div className="absolute bottom-12 flex items-center gap-2 opacity-20">
        <Sparkles className="w-3 h-3" />
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase">Enterprise Intelligence</span>
      </div>
    </motion.div>
  );
}
