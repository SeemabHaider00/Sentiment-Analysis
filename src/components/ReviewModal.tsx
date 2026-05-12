import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, AlertTriangle, CheckCircle, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SentimentResult } from '../types';
import { addCorrection } from '../services/learningService';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'Positive' | 'Negative' | 'Neutral' | null;
  data: SentimentResult[];
  onCorrect: (id: string, newSentiment: 'Positive' | 'Negative' | 'Neutral') => void;
}

export function ReviewModal({ isOpen, onClose, category, data, onCorrect }: ReviewModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<'Positive' | 'Negative' | 'Neutral' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearchTerm('');
    setEditingId(null);
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  const filteredData = data.filter(item => {
    if (item.sentiment !== category) return false;
    if (searchTerm && !item.text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSave = (item: SentimentResult) => {
    if (editValue && editValue !== item.sentiment && item.id) {
      // 1. Save to Learning DB
      addCorrection(item.text, editValue);
      // 2. Update local state via callback
      onCorrect(item.id, editValue);
      
      // Toast message
      setToastMessage("AI Learned Successfully");
      setTimeout(() => setToastMessage(null), 3000);
    }
    setEditingId(null);
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
          className="bg-black border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Review {category} Responses
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono">
                  {filteredData.length}
                </span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Make corrections to teach the AI model. Corrections are saved locally.
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search reviews..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20"
              >
                <CheckCircle className="w-4 h-4" />
                {toastMessage}
              </motion.div>
            )}
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-white/5 border-y border-white/10 text-gray-500 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-4 w-1/2">Review Text</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Keywords</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No reviews found matching your criteria.
                    </td>
                  </tr>
                ) : filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 text-gray-100 pr-8">
                      {item.text}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.confidence > 0.8 ? 'bg-green-500' : item.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${item.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(item.confidence * 100)}%
                        </span>
                        {item.confidence < 0.6 && (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 ml-1" title="Low Confidence" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.map((kw, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select 
                            value={editValue || item.sentiment}
                            onChange={(e) => setEditValue(e.target.value as any)}
                            className="bg-black border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none"
                          >
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                            <option value="Neutral">Neutral</option>
                          </select>
                          <button 
                            onClick={() => handleSave(item)}
                            className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 hover:bg-white/10 text-gray-400 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingId(item.id || null); setEditValue(item.sentiment); }}
                          className="px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                        >
                          Correct AI
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
    </AnimatePresence>
  );
}
