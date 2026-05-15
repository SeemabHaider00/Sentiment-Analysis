import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, MessageSquare, Tag, Brain, 
  AlertCircle, Quote, Save, Plus, Copy, Check, Info, ShieldAlert 
} from 'lucide-react';
import { SentimentResult } from '../types';
import { cn } from '../lib/utils';
import { getSnippetStats } from '../services/learningService';
import { CORE_REASONS } from '../constants';

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: SentimentResult | null;
  onNext?: () => void;
  onPrev?: () => void;
  onSave?: (id: string, updates: Partial<SentimentResult>) => void;
  editable?: boolean;
}

export function ReviewDetailModal({ isOpen, onClose, review, onNext, onPrev, onSave, editable = true }: ReviewDetailModalProps) {
  const [editSentiment, setEditSentiment] = useState<SentimentResult['sentiment'] | null>(null);
  const [editReason, setEditReason] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isManualReason, setIsManualReason] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (review) {
      setEditSentiment(review.sentiment);
      setEditReason(review.coreReason);
      setEditKeywords([...review.keywords]);
      setIsManualReason(!CORE_REASONS.includes(review.coreReason));
      setShowUnsavedWarning(false);
    }
  }, [review, isOpen]);

  const isDirty = review ? (
    editSentiment !== review.sentiment ||
    editReason !== review.coreReason ||
    JSON.stringify(editKeywords) !== JSON.stringify(review.keywords)
  ) : false;

  if (!review) return null;

  const handleSave = async () => {
    if (onSave && review.id) {
      setIsSaving(true);
      // Simulate network latency for premium feel
      await new Promise(resolve => setTimeout(resolve, 800));
      onSave(review.id, {
        sentiment: editSentiment || review.sentiment,
        coreReason: editReason || review.coreReason,
        keywords: editKeywords
      });
      setIsSaving(false);
      setShowUnsavedWarning(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(review.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addKeyword = () => {
    if (newKeyword && !editKeywords.includes(newKeyword)) {
      setEditKeywords([...editKeywords, newKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    setEditKeywords(editKeywords.filter(k => k !== kw));
  };

  const stats = getSnippetStats(review.text);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-[#050505] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Brain className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white tracking-tight">
                    Intelligence Workspace
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Audit Mode</span>
                    {isDirty && (
                      <span className="text-[10px] text-amber-500 animate-pulse font-bold uppercase tracking-widest flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {editable && (
                  <button 
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all transform active:scale-95",
                      isDirty 
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]" 
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'LEARNING...' : 'SAVE & TRAIN AI'}
                  </button>
                )}
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left Column - Review Text */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 lg:border-r border-white/5 custom-scrollbar bg-black/40">
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                      <MessageSquare className="w-4 h-4" />
                      Raw Intelligence Input
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-gray-400 hover:text-white transition-all border border-white/5"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'COPIED' : 'COPY RAW TEXT'}
                    </button>
                  </div>
                  <div className="relative p-10 rounded-3xl bg-white/[0.01] border border-white/5 italic text-gray-200 text-xl md:text-2xl leading-relaxed font-light font-display">
                    <Quote className="absolute -top-4 -left-4 w-12 h-12 text-white/[0.03]" />
                    {review.text}
                  </div>

                  {/* AI Learning Status Section */}
                  <div className="mt-12 p-6 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                      <Info className="w-3 h-3" />
                      AI Learning State
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Confidence</div>
                        <div className="text-xl font-display text-white">{(review.confidence * 100).toFixed(0)}%</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Historical Corrections</div>
                        <div className="text-xl font-display text-white">{stats.correctionCount}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Current Schema</div>
                        <div className="text-xl font-display text-white">v1.2.4</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Learning Velocity</div>
                        <div className="text-xl font-display text-emerald-400">OPTIMAL</div>
                      </div>
                    </div>
                    <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2 italic">Model weights are recalibrated after each validated human correction.</p>
                  </div>
                </section>
              </div>

              {/* Right Column - Controls */}
              <div className="w-full lg:w-[400px] bg-[#0c0c0c] p-6 lg:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                {/* Sentiment Switcher */}
                <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Determine Sentiment
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Positive', 'Neutral', 'Negative'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditSentiment(s as any)}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-bold uppercase border transition-all duration-300 transform active:scale-95",
                          editSentiment === s 
                            ? s === 'Positive' ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                              : s === 'Negative' ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                              : "bg-zinc-500/20 border-zinc-500/50 text-zinc-400 shadow-[0_0_20px_rgba(113,113,122,0.15)]"
                            : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/[0.05] hover:border-white/10"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Core Reason Editor */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Brain className="w-3 h-3" />
                      Core Reason
                    </label>
                    <button 
                      onClick={() => setIsManualReason(!isManualReason)}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 uppercase tracking-widest font-bold"
                    >
                      {isManualReason ? 'Switch to List' : 'Enter Custom'}
                    </button>
                  </div>
                  {isManualReason ? (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                        placeholder="Type custom core reason..."
                        value={editReason || ''}
                        onChange={e => setEditReason(e.target.value)}
                      />
                    </motion.div>
                  ) : (
                    <select 
                      value={editReason || ''}
                      onChange={e => setEditReason(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white appearance-none focus:outline-none focus:border-indigo-500/50 h-12"
                    >
                      {CORE_REASONS.map(r => <option key={r} value={r} className="bg-[#0c0c0c]">{r}</option>)}
                    </select>
                  )}
                </div>

                {/* Keywords Manager */}
                <div className="space-y-3">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    Impact Keywords
                  </label>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {editKeywords.map((kw, i) => (
                        <span 
                          key={i} 
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold group"
                        >
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Add new meta-tag..."
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addKeyword()}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-indigo-500/50"
                      />
                      <button 
                        onClick={addKeyword}
                        className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Navigation Stats */}
                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                   <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Intensity</div>
                      <div className={cn(
                        "text-xs font-bold",
                        review.intensity === 'High' ? "text-orange-500" : "text-gray-400"
                      )}>{review.intensity}</div>
                   </div>
                   <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-right">
                      <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Impact Seg.</div>
                      <div className="text-xs text-gray-400 font-bold uppercase">{review.coreReason.split(' ')[0]}</div>
                   </div>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-white/5 flex items-center justify-between bg-[#050505] z-10">
              <div className="flex gap-3">
                <button 
                  onClick={onPrev}
                  className="px-4 py-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all flex items-center gap-2 border border-white/5 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs font-bold">PREVIOUS</span>
                </button>
                <button 
                  onClick={onNext}
                  className="px-4 py-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all flex items-center gap-2 border border-white/5 active:scale-95"
                >
                  <span className="text-xs font-bold">NEXT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-gray-700 font-mono flex items-center gap-2 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                RECORD ID: {review.id}
              </div>
            </div>

            {/* Unsaved Warning Overlay */}
            <AnimatePresence>
              {showUnsavedWarning && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
                  >
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShieldAlert className="w-8 h-8 text-amber-500" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Unsaved Intelligence</h4>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                      You have manual corrections that haven't been pushed to the AI model. Do you want to save them now?
                    </p>
                    <div className="space-y-3">
                      <button 
                        onClick={handleSave}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)]"
                      >
                        SAVE & TRAIN MODEL
                      </button>
                      <button 
                        onClick={onClose}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold rounded-xl transition-all"
                      >
                        DISCARD CHANGES
                      </button>
                      <button 
                        onClick={() => setShowUnsavedWarning(false)}
                        className="w-full py-2 text-[10px] text-gray-600 hover:text-gray-400 font-bold uppercase tracking-widest transition-all"
                      >
                        CANCEL
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Re-using Lucide icons I forgot to import or adding some extra logic
const TrendingUp = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
const ShieldCheck = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
