import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RotateCcw, AlertTriangle, CheckCircle, Search, Filter, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SentimentResult } from '../types';
import { addCorrection } from '../services/learningService';
import { cn } from '../lib/utils';
import { CORE_REASONS } from '../constants';
import { ReviewDetailModal } from './ReviewDetailModal';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'Positive' | 'Negative' | 'Neutral' | null;
  data: SentimentResult[];
  onCorrect: (id: string, updates: Partial<SentimentResult>) => void;
}

const DEFAULT_COLUMN_WIDTHS = {
  review: 500,
  keywords: 250,
  reason: 180,
  sentiment: 140,
  action: 140
};

export function ReviewModal({ isOpen, onClose, category, data, onCorrect }: ReviewModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSentiment, setEditSentiment] = useState<'Positive' | 'Negative' | 'Neutral' | null>(null);
  const [editReason, setEditReason] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Resizable Columns State
  const [colWidths, setColWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<string | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Detail view state
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null);

  useEffect(() => {
    setSearchTerm('');
    setEditingId(null);
    setSelectedReviewIndex(null);
  }, [category, isOpen]);

  const startResizing = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing(column);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: colWidths[column as keyof typeof colWidths]
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing || !resizeRef.current) return;
      const deltaX = e.clientX - resizeRef.current.startX;
      const newWidth = Math.max(100, resizeRef.current.startWidth + deltaX);
      setColWidths(prev => ({ ...prev, [resizing]: newWidth }));
    };

    const onMouseUp = () => {
      setResizing(null);
      resizeRef.current = null;
    };

    if (resizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing]);

  if (!isOpen || !category) return null;

  const filteredData = data.filter(item => {
    if (item.sentiment !== category) return false;
    if (searchTerm && !item.text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSave = (id: string, updates: Partial<SentimentResult>, text: string) => {
    if (updates.sentiment && updates.sentiment !== category) {
      addCorrection(text, updates.sentiment);
    }
    
    onCorrect(id, updates);
    setToastMessage("AI Learned Successfully");
    setTimeout(() => setToastMessage(null), 3000);
    setEditingId(null);
  };

  const handleRowSave = (item: SentimentResult) => {
    const updates: Partial<SentimentResult> = {};
    if (editSentiment && editSentiment !== item.sentiment) updates.sentiment = editSentiment;
    if (editReason && editReason !== item.coreReason) updates.coreReason = editReason;
    
    if (Object.keys(updates).length > 0) {
      handleSave(item.id!, updates, item.text);
    } else {
      setEditingId(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-black border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                Human Review & AI Training
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                  {category} • {filteredData.length}
                </span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Audit and correct AI predictions to improve semantic understanding.
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search specifically in these reviews..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/30 transition-colors"
              />
            </div>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-indigo-400 text-sm bg-indigo-400/10 px-3 py-1.5 rounded-full border border-indigo-400/20 font-bold"
              >
                <CheckCircle className="w-4 h-4" />
                {toastMessage}
              </motion.div>
            )}
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto p-0 relative custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-300 border-collapse table-fixed">
              <thead className="text-[10px] uppercase bg-[#0c0c0c] border-b border-white/10 text-gray-500 sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  <th className="py-4 px-6 relative group" style={{ width: colWidths.review }}>
                    Review Perspective
                    <div 
                      onMouseDown={(e) => startResizing(e, 'review')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                    />
                  </th>
                  <th className="py-4 px-6 relative group" style={{ width: colWidths.keywords }}>
                    Impact Keywords
                    <div 
                      onMouseDown={(e) => startResizing(e, 'keywords')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                    />
                  </th>
                  <th className="py-4 px-6 relative group" style={{ width: colWidths.reason }}>
                    Core Reason
                    <div 
                      onMouseDown={(e) => startResizing(e, 'reason')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                    />
                  </th>
                  <th className="py-4 px-6 relative group" style={{ width: colWidths.sentiment }}>
                    Sentiment
                    <div 
                      onMouseDown={(e) => startResizing(e, 'sentiment')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                    />
                  </th>
                  <th className="py-4 px-6 relative group text-right" style={{ width: colWidths.action }}>
                    Intelligence Audit
                    <div 
                      onMouseDown={(e) => startResizing(e, 'action')}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-gray-600">
                        <Filter className="w-12 h-12 opacity-20" />
                        <p className="text-lg font-medium">No reviews found in this segment</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-5 px-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="line-clamp-2 text-xs leading-relaxed text-gray-200" title={item.text}>{item.text}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.confidence * 100}%` }}
                                className={cn(
                                  "h-full",
                                  item.confidence > 0.8 ? 'bg-indigo-500' : 'bg-zinc-600'
                                )} 
                              />
                            </div>
                            <span className="text-[10px] font-mono text-gray-600">
                              {Math.round(item.confidence * 100)}% Confidence
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedReviewIndex(index)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all text-indigo-400"
                          title="View Full Review"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {item.keywords.map((kw, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/5 border border-indigo-500/10 text-indigo-400/80 group-hover:border-indigo-500/30 transition-colors">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      {editingId === item.id ? (
                        <select 
                          value={editReason || item.coreReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          className="bg-zinc-900 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none w-full"
                        >
                          {CORE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap overflow-hidden text-overflow-ellipsis block">
                          {item.coreReason}
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6">
                      {editingId === item.id ? (
                        <select 
                          value={editSentiment || item.sentiment}
                          onChange={(e) => setEditSentiment(e.target.value as any)}
                          className="bg-zinc-900 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none w-full"
                        >
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                          <option value="Neutral">Neutral</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          item.sentiment === 'Positive' && "bg-emerald-500/10 text-emerald-400",
                          item.sentiment === 'Negative' && "bg-red-500/10 text-red-400",
                          item.sentiment === 'Neutral' && "bg-zinc-500/10 text-zinc-400"
                        )}>
                          {item.sentiment}
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6 text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleRowSave(item)}
                            className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                            title="Save Correction"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-2 hover:bg-white/10 text-gray-500 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { 
                            setEditingId(item.id || null); 
                            setEditSentiment(item.sentiment);
                            setEditReason(item.coreReason);
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all border border-indigo-500/30 uppercase tracking-wider"
                        >
                          Correct
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      {/* Deep Dive & Edit Modal */}
      <ReviewDetailModal 
        isOpen={selectedReviewIndex !== null}
        onClose={() => setSelectedReviewIndex(null)}
        review={selectedReviewIndex !== null ? filteredData[selectedReviewIndex] : null}
        editable={true}
        onSave={(id, updates) => {
          const item = filteredData[selectedReviewIndex!];
          handleSave(id, updates, item.text);
          setSelectedReviewIndex(null);
        }}
        onNext={() => {
          if (selectedReviewIndex !== null) {
            setSelectedReviewIndex((selectedReviewIndex + 1) % filteredData.length);
          }
        }}
        onPrev={() => {
          if (selectedReviewIndex !== null) {
            setSelectedReviewIndex((selectedReviewIndex - 1 + filteredData.length) % filteredData.length);
          }
        }}
      />
    </AnimatePresence>
  );
}
