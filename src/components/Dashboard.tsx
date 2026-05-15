import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Download, ArrowLeft, Filter, TrendingUp, TrendingDown, Minus, 
  Search, ShieldCheck, Zap, BrainCircuit, Maximize2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SentimentResult, AnalysisSummary } from '../types';
import { cn } from '../lib/utils';
import { CORE_REASONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { ReviewModal } from './ReviewModal';
import { ReviewDetailModal } from './ReviewDetailModal';

interface DashboardProps {
  data: SentimentResult[];
  onReset: () => void;
  onCorrect: (id: string, updates: Partial<SentimentResult>) => void;
}

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#71717a'
};

const DEFAULT_COLUMN_WIDTHS = {
  review: 400,
  keywords: 250,
  reason: 180,
  sentiment: 140,
  confidence: 120
};

export function Dashboard({ data, onReset, onCorrect }: DashboardProps) {
  const [filter, setFilter] = useState<'All' | 'Positive' | 'Negative' | 'Neutral'>('All');
  const [reasonFilter, setReasonFilter] = useState<string | 'All'>('All');
  const [search, setSearch] = useState('');
  const [reviewCategory, setReviewCategory] = useState<'Positive' | 'Negative' | 'Neutral' | null>(null);
  const [activeChartSection, setActiveChartSection] = useState<string | null>(null);
  
  // Resizable Columns State
  const [colWidths, setColWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<string | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Detailed Modal State
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null);

  const summary = useMemo(() => {
    const total = data.length;
    const positive = data.filter(r => r.sentiment === 'Positive').length;
    const negative = data.filter(r => r.sentiment === 'Negative').length;
    const neutral = data.filter(r => r.sentiment === 'Neutral').length;
    const averageConfidence = data.reduce((acc, curr) => acc + curr.confidence, 0) / total;

    // Core Reason Distribution
    const reasonCounts: Record<string, number> = {};
    data.forEach(r => {
      reasonCounts[r.coreReason] = (reasonCounts[r.coreReason] || 0) + 1;
    });
    const reasonStats = Object.entries(reasonCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { total, positive, negative, neutral, averageConfidence, reasonStats };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const matchesSentiment = filter === 'All' || r.sentiment === filter;
      const matchesReason = reasonFilter === 'All' || r.coreReason === reasonFilter;
      const matchesSearch = r.text.toLowerCase().includes(search.toLowerCase()) || 
                            r.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()));
      return matchesSentiment && matchesReason && matchesSearch;
    });
  }, [data, filter, reasonFilter, search]);

  const chartData = [
    { name: 'Positive', value: summary.positive },
    { name: 'Negative', value: summary.negative },
    { name: 'Neutral', value: summary.neutral }
  ];

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      'Review': r.text,
      'Impact Keywords': r.keywords.join(', '),
      'Core Reason': r.coreReason,
      'Sentiment': r.sentiment,
      'Confidence Score': (r.confidence * 100).toFixed(0) + '%',
      'Intensity': r.intensity,
      'Analysis Timestamp': new Date().toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis Results");
    XLSX.writeFile(wb, `Sapphire_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleChartClick = (name: string, type: 'sentiment' | 'reason') => {
    if (type === 'sentiment') {
      setFilter(prev => prev === name ? 'All' : name as any);
      setActiveChartSection(prev => prev === name ? null : name);
    } else {
      setReasonFilter(prev => prev === name ? 'All' : name);
      setActiveChartSection(prev => prev === name ? null : name);
    }
  };

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

  const handleNextReview = () => {
    if (selectedReviewIndex === null) return;
    setSelectedReviewIndex((selectedReviewIndex + 1) % filteredData.length);
  };

  const handlePrevReview = () => {
    if (selectedReviewIndex === null) return;
    setSelectedReviewIndex((selectedReviewIndex - 1 + filteredData.length) % filteredData.length);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <button 
            onClick={onReset}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            New Analysis
          </button>
          <h2 className="text-3xl font-display font-bold tracking-tight">Sapphire Analysis Insight</h2>
          <p className="text-gray-500">Corporate Review Sentiment Analysis Engine</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Results
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reviews', value: summary.total, icon: Minus, color: 'text-white' },
          { label: 'Positive', value: summary.positive, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Negative', value: summary.negative, icon: TrendingDown, color: 'text-red-400' },
          { label: 'Accuracy Score', value: `${(summary.averageConfidence * 100).toFixed(0)}%`, icon: ShieldCheck, color: 'text-blue-400' }
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">Live Insight</span>
            </div>
            <div className="text-2xl font-display font-semibold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500 font-sans">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Human Review & AI Learning Interface */}
      <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 my-8">
        <div className="flex items-center gap-3 mb-6">
          <BrainCircuit className="w-6 h-6 text-indigo-400" />
          <div>
            <h3 className="text-lg font-medium text-white">Human Review & AI Learning</h3>
            <p className="text-sm text-indigo-200/60">Correct predictions to instantly train the local AI engine.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => setReviewCategory('Positive')}
            className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-emerald-400"
          >
            <span className="font-medium text-sm">Review Positive Data</span>
            <span className="text-xs font-mono bg-emerald-500/20 px-2 py-1 rounded">{summary.positive}</span>
          </button>
          
          <button 
            onClick={() => setReviewCategory('Negative')}
            className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400"
          >
            <span className="font-medium text-sm">Review Negative Data</span>
            <span className="text-xs font-mono bg-red-500/20 px-2 py-1 rounded">{summary.negative}</span>
          </button>

          <button 
            onClick={() => setReviewCategory('Neutral')}
            className="flex items-center justify-between p-4 rounded-xl border border-zinc-500/20 bg-zinc-500/10 hover:bg-zinc-500/20 transition-all text-zinc-400"
          >
            <span className="font-medium text-sm">Review Neutral Data</span>
            <span className="text-xs font-mono bg-zinc-500/20 px-2 py-1 rounded">{summary.neutral}</span>
          </button>
        </div>
      </div>

      {/* Filters Overlay */}
      <AnimatePresence>
        {(filter !== 'All' || reasonFilter !== 'All') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full w-fit mb-4"
          >
            <span className="text-xs text-indigo-300 font-medium">Active Filters:</span>
            {filter !== 'All' && (
              <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-400 border border-indigo-500/20">
                Sentiment: {filter}
              </span>
            )}
            {reasonFilter !== 'All' && (
              <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-400 border border-indigo-500/20">
                Reason: {reasonFilter}
              </span>
            )}
            <button 
              onClick={() => { setFilter('All'); setReasonFilter('All'); }}
              className="text-[10px] text-gray-500 hover:text-white underline underline-offset-2 ml-2"
            >
              Clear All
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 glass-card p-6 min-h-[350px] flex flex-col relative group">
          <h3 className="text-xs font-medium text-gray-400 mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Impact Distribution
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => handleChartClick(String(data.name), 'sentiment')}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={Object.values(COLORS)[index]} 
                      stroke="transparent"
                      opacity={activeChartSection && activeChartSection !== entry.name ? 0.3 : 1}
                      className="transition-opacity duration-300"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid #1a1a1a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 glass-card p-6 min-h-[350px] flex flex-col relative group">
          <h3 className="text-xs font-medium text-gray-400 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Core Reasons
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={summary.reasonStats.slice(0, 5)}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#525252" 
                  fontSize={10} 
                  width={80} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                   contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid #1a1a1a', borderRadius: '8px' }}
                   itemStyle={{ color: '#fff' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#6366f1" 
                  radius={[0, 4, 4, 0]} 
                  onClick={(data) => handleChartClick(String(data.name), 'reason')}
                  className="cursor-pointer"
                >
                   {summary.reasonStats.slice(0, 5).map((entry, index) => (
                    <Cell 
                      key={`cell-reason-${index}`}
                      opacity={reasonFilter !== 'All' && reasonFilter !== entry.name ? 0.3 : 1}
                      className="transition-opacity duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 glass-card p-6 min-h-[350px]">
          <h3 className="text-sm font-medium text-gray-400 mb-6">Sentiment Intensity Breakdown</h3>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                   contentStyle={{ backgroundColor: '#0c0c0c', border: '1px solid #1a1a1a', borderRadius: '8px' }}
                   itemStyle={{ color: '#fff' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => handleChartClick(String(data.name), 'sentiment')}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-bar-${index}`} 
                      fill={Object.values(COLORS)[index]} 
                      opacity={activeChartSection && activeChartSection !== entry.name ? 0.3 : 1}
                      className="transition-opacity duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-medium">Raw Analysis Data</h3>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search reviews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
            
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              {['All', 'Positive', 'Negative', 'Neutral'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t as any)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    filter === t ? "bg-white text-black" : "text-gray-500 hover:text-white"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar relative max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0c0c0c] border-b border-white/5 text-gray-400 font-medium text-[10px] uppercase tracking-wider backdrop-blur-md">
                <th className="px-6 py-4 relative group" style={{ width: colWidths.review }}>
                  Review Content
                  <div 
                    onMouseDown={(e) => startResizing(e, 'review')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                  />
                </th>
                <th className="px-6 py-4 relative group" style={{ width: colWidths.keywords }}>
                  Impact Keywords
                  <div 
                    onMouseDown={(e) => startResizing(e, 'keywords')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                  />
                </th>
                <th className="px-6 py-4 relative group" style={{ width: colWidths.reason }}>
                  Core Reason
                  <div 
                    onMouseDown={(e) => startResizing(e, 'reason')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                  />
                </th>
                <th className="px-6 py-4 relative group" style={{ width: colWidths.sentiment }}>
                  Sentiment
                  <div 
                    onMouseDown={(e) => startResizing(e, 'sentiment')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                  />
                </th>
                <th className="px-6 py-4 relative group" style={{ width: colWidths.confidence }}>
                  Confidence
                  <div 
                    onMouseDown={(e) => startResizing(e, 'confidence')}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row, i) => (
                <tr 
                  key={i} 
                  className="hover:bg-white/[0.02] transition-all group lg:h-16"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <p className="text-gray-300 line-clamp-1 leading-relaxed text-xs flex-1">
                        {row.text}
                      </p>
                      <button 
                        onClick={() => setSelectedReviewIndex(i)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all transform translate-x-2 group-hover:translate-x-0"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                      {row.keywords.map((k, ki) => (
                        <span key={ki} className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400 group-hover:border-indigo-500/40 transition-colors truncate max-w-[80px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-medium text-gray-400 bg-white/5 px-2 py-1 rounded inline-block truncate max-w-full">
                      {row.coreReason}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap",
                      row.sentiment === 'Positive' && "bg-emerald-500/10 text-emerald-400",
                      row.sentiment === 'Negative' && "bg-red-500/10 text-red-400",
                      row.sentiment === 'Neutral' && "bg-zinc-500/10 text-zinc-400"
                    )}>
                      {row.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs text-gray-500">
                        {(row.confidence * 100).toFixed(0)}%
                      </span>
                      <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500/50"
                          style={{ width: `${row.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-12 text-center text-gray-500 border-t border-white/5">
              No results found matching your criteria.
            </div>
          )}
        </div>
      </div>

      <ReviewModal 
        isOpen={reviewCategory !== null}
        onClose={() => setReviewCategory(null)}
        category={reviewCategory}
        data={data}
        onCorrect={(id, updates) => {
          onCorrect(id, updates);
        }}
      />

      <ReviewDetailModal 
        isOpen={selectedReviewIndex !== null}
        onClose={() => setSelectedReviewIndex(null)}
        review={selectedReviewIndex !== null ? filteredData[selectedReviewIndex] : null}
        onSave={(id, updates) => onCorrect(id, updates)}
        onNext={handleNextReview}
        onPrev={handlePrevReview}
      />
    </motion.div>
  );
}
