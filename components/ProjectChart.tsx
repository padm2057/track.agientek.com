import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Task } from '../types';

interface ProjectChartProps {
  tasks: Task[];
  isDarkMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const ProjectChart: React.FC<ProjectChartProps> = ({ tasks, isDarkMode = false, onMoveUp, onMoveDown }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Delay rendering of the chart until mounted to ensure container has dimensions
    setIsMounted(true);
  }, []);

  // Map data to show "ID. FirstWord" on the axis
  const data = tasks.map(t => {
    // Get the first word, remove potential trailing punctuation like colon/comma
    const firstWord = t.task_name.split(' ')[0].replace(/[:,\.]/g, '');
    return {
        ...t,
        shortName: `${t.id}. ${firstWord}`
    };
  });

  const getPhaseColor = (phase: string) => {
    const p = phase.toLowerCase();
    if (p.includes('design')) return '#8b5cf6'; // Violet 500
    if (p.includes('frontend') || p.includes('ui')) return '#3b82f6'; // Blue 500
    if (p.includes('backend') || p.includes('api') || p.includes('logic')) return '#6366f1'; // Indigo 500
    if (p.includes('qa') || p.includes('test') || p.includes('verify')) return '#f43f5e'; // Rose 500
    if (p.includes('deploy') || p.includes('release')) return '#10b981'; // Emerald 500
    if (p.includes('marketing') || p.includes('user') || p.includes('growth')) return '#f59e0b'; // Amber 500
    if (p.includes('data') || p.includes('analytics')) return '#06b6d4'; // Cyan 500
    
    // Fallback rotation for unknown phases - Vibrant colors instead of gray
    const fallbacks = ['#ec4899', '#84cc16', '#d946ef', '#0ea5e9', '#f97316'];
    let hash = 0;
    for (let i = 0; i < phase.length; i++) hash = phase.charCodeAt(i) + ((hash << 5) - hash);
    return fallbacks[Math.abs(hash) % fallbacks.length];
  };

  // Improved text contrast: Darker in light mode, lighter in dark mode
  const axisColor = isDarkMode ? '#cbd5e1' : '#334155'; // slate-300 : slate-700
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-200 h-auto flex flex-col w-full break-inside-avoid">
      {/* Accordion Header */}
      <div 
        className={`px-6 py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOpen ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}
      >
        <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex-grow cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Resource Allocation (Hours)</h3>
          {!isOpen && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Breakdown by task duration.</p>}
        </div>

        <div className="flex items-center gap-4">
            {/* Reorder Controls */}
            {(onMoveUp || onMoveDown) && (
                <div className="flex flex-col gap-0.5 opacity-50 hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} 
                        disabled={!onMoveUp}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-500">
                            <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                        disabled={!onMoveDown}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-500">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-6 h-80 flex flex-col animate-fade-in">
            <div className="flex-1 min-h-0 min-w-0 relative">
                <div className="absolute inset-0">
                {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart
                        layout="vertical"
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 10,
                            bottom: 5,
                        }}
                        >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke={gridColor} opacity={0.6} />
                        <XAxis type="number" stroke={axisColor} fontSize={12} tick={{ fill: axisColor }} />
                        <YAxis 
                            dataKey="shortName" 
                            type="category" 
                            width={100} 
                            stroke={axisColor} 
                            fontSize={11}
                            tick={{fontSize: 11, fill: axisColor, fontWeight: 600}}
                            interval={0}
                        />
                        <Tooltip 
                            cursor={{fill: isDarkMode ? '#1e293b' : '#f8fafc', opacity: 0.6}}
                            contentStyle={{ 
                                borderRadius: '8px', 
                                border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                color: isDarkMode ? '#f1f5f9' : '#1e293b'
                            }}
                            itemStyle={{ color: isDarkMode ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}
                            formatter={(value: number, name: string, props: any) => {
                                // Display the full task name in the tooltip for context
                                return [`${value}h`, props.payload.task_name];
                            }}
                        />
                        <Bar dataKey="duration_hours" radius={[0, 4, 4, 0]} name="Duration">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getPhaseColor(entry.phase)} />
                            ))}
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};