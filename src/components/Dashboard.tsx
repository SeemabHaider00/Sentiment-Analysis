import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Download, ArrowLeft, Filter, TrendingUp, TrendingDown, Minus, 
  Search, ShieldCheck, Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SentimentResult, AnalysisSummary } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  data: SentimentResult[];
  onReset: () => void;
}

const COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Neutral: '#71717a'
};

export function Dashboard({ data, onReset }: DashboardProps) {
  const [filter, setFilter] = useState<'All' | 'Positive' | 'Negative' | 'Neutral'>('All');
  const [search, setSearch] = useState('');

  const summary = useMemo<AnalysisSummary>(() => {
    const total = data.length;
    const positive = data.filter(r => r.sentiment === 'Positive').length;
    const negative = data.filter(r => r.sentiment === 'Negative').length;
    const neutral = data.filter(r => r.sentiment === 'Neutral').length;
    const averageConfidence = data.reduce((acc, curr) => acc + curr.confidence, 0) / total;

    return { total, positive, negative, neutral, averageConfidence };
  }, [data]);

  const chartData = [
    { name: 'Positive', value: summary.positive },
    { name: 'Negative', value: summary.negative },
    { name: 'Neutral', value: summary.neutral }
  ];

  const filteredData = data.filter(r => {
    const matchesFilter = filter === 'All' || r.sentiment === filter;
    const matchesSearch = r.text.toLowerCase().includes(search.toLowerCase()) || 
                          r.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      'Original Review': r.text,
      'Sentiment': r.sentiment,
      'Confidence': (r.confidence * 100).toFixed(1) + '%',
      'Intensity': r.intensity,
      'Keywords': r.keywords.join(', '),
      'Timestamp': new Date().toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis Results");
    XLSX.writeFile(wb, `Sapphire_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          <div key={i} className="glass-card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-white/5">
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className="text-xs font-mono text-gray-500 uppercase tracking-tighter">Live Insight</span>
            </div>
            <div className="text-2xl font-display font-semibold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500 font-sans">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-card p-6 min-h-[350px] flex flex-col">
          <h3 className="text-sm font-medium text-gray-400 mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Distribution
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
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} stroke="transparent" />
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

        <div className="lg:col-span-2 glass-card p-6 min-h-[350px]">
          <h3 className="text-sm font-medium text-gray-400 mb-6">Sentiment Breakdown</h3>
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
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-gray-400 font-medium">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Review Content</th>
                <th className="px-6 py-4">Confidence</th>
                <th className="px-6 py-4">Intensity</th>
                <th className="px-6 py-4 whitespace-nowrap">Impact Keywords</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                      row.sentiment === 'Positive' && "bg-emerald-500/10 text-emerald-400",
                      row.sentiment === 'Negative' && "bg-red-500/10 text-red-400",
                      row.sentiment === 'Neutral' && "bg-zinc-500/10 text-zinc-400"
                    )}>
                      {row.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-gray-300 line-clamp-2 leading-relaxed">{row.text}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    {(row.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {row.intensity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {row.keywords.map((k, ki) => (
                        <span key={ki} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 group-hover:border-white/30 transition-colors">
                          {k}
                        </span>
                      ))}
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
    </motion.div>
  );
}
