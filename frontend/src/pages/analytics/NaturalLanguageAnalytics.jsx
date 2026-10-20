import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, TypingIndicator } from '../../components/chat/Chat';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';
import {
  AreaChart, Area,
  BarChart as RechartsBarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Icons
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Sparkles icon for AI avatar (matches Smart Assistant)
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
  </svg>
);

const FormIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);


// Metric Card component - Enhanced with better styling
const MetricCard = ({ label, value, unit, trend, icon, comparison, color }) => {
  const getIcon = () => {
    switch (icon) {
      case 'document':
        return <DocumentIcon />;
      case 'clock':
        return <ClockIcon />;
      case 'check':
        return <CheckIcon />;
      case 'form':
        return <FormIcon />;
      default:
        return <ChartBarIcon />;
    }
  };

  // Determine color scheme based on label or explicit color
  const getColorScheme = () => {
    if (color) return color;
    const labelLower = label?.toLowerCase() || '';
    if (labelLower.includes('approved') || labelLower.includes('approval rate')) {
      return 'emerald';
    } else if (labelLower.includes('rejected') || labelLower.includes('cancelled')) {
      return 'red';
    } else if (labelLower.includes('pending') || labelLower.includes('review')) {
      return 'amber';
    } else if (labelLower.includes('active') || labelLower.includes('form')) {
      return 'sky';
    }
    return 'sky';
  };

  const colorScheme = getColorScheme();
  const colorClasses = {
    sky: { bg: 'bg-sky-100', text: 'text-sky-500', accent: 'bg-sky-500' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-500', accent: 'bg-emerald-500' },
    red: { bg: 'bg-red-100', text: 'text-red-500', accent: 'bg-red-500' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-500', accent: 'bg-amber-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-500', accent: 'bg-purple-500' },
  };
  const colors = colorClasses[colorScheme] || colorClasses.sky;

  // Parse trend to determine if it's positive or negative
  const isTrendPositive = trend && (trend.includes('+') || trend.includes('up') || parseFloat(trend) > 0);
  const isTrendNegative = trend && (trend.includes('-') || trend.includes('down') || parseFloat(trend) < 0);

  // Format value display
  const formatValue = () => {
    if (typeof value === 'string') return value;
    if (unit === '$') return `$${value.toLocaleString()}`;
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text}`}>
          {getIcon()}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-800">
          {formatValue()}
        </span>
        {unit && unit !== '$' && <span className="text-slate-400 text-sm">{unit}</span>}
      </div>
      {(trend || comparison) && (
        <div className="flex items-center gap-2 mt-3">
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isTrendPositive ? 'bg-emerald-50 text-emerald-600' :
              isTrendNegative ? 'bg-red-50 text-red-600' :
              'bg-slate-50 text-slate-600'
            }`}>
              {isTrendPositive && <TrendUpIcon />}
              {isTrendNegative && <TrendDownIcon />}
              <span>{trend}</span>
            </div>
          )}
          {comparison && (
            <span className="text-slate-400 text-xs">{comparison}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Status/Pie data display - Enhanced with better colors and stats
const StatusBreakdown = ({ data }) => {
  const colorConfig = {
    'Submitted': { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
    'Approved': { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
    'Rejected': { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600' },
    'Cancelled': { bg: 'bg-slate-400', light: 'bg-slate-100', text: 'text-slate-600' },
    'Pending': { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
    'In Review': { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600' },
    'Draft': { bg: 'bg-slate-300', light: 'bg-slate-50', text: 'text-slate-500' },
  };

  const getColor = (status) => colorConfig[status] || { bg: 'bg-slate-400', light: 'bg-slate-100', text: 'text-slate-600' };

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
      {/* Visual progress bar */}
      <div className="flex h-4 rounded-full overflow-hidden mb-6 shadow-inner bg-slate-100">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          if (percentage === 0) return null;
          return (
            <div
              key={index}
              className={`${getColor(item.status).bg} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${percentage}%` }}
              title={`${item.status}: ${item.count} (${Math.round(percentage)}%)`}
            />
          );
        })}
      </div>

      {/* Status cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const colors = getColor(item.status);
          return (
            <div key={index} className={`rounded-lg p-3 ${colors.light} border border-opacity-50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                <span className={`text-sm font-medium ${colors.text}`}>{item.status}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-800">{item.count.toLocaleString()}</span>
                <span className="text-xs text-slate-500">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-bold text-slate-700">{total.toLocaleString()}</span>
      </div>
    </div>
  );
};

// Color palette for charts - consistent and professional
const CHART_COLORS = [
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

// Trend Line Chart component - for time series data
const TrendLineChart = ({ data, title }) => {
  // Helper to get the label (x-axis) from item
  const getLabel = (item) => {
    return item.date || item.month || item.period || item.day || item.week || item.label || 'Unknown';
  };

  // Helper to get the value (y-axis) from item
  const getValue = (item) => {
    return item.submissions || item.count || item.value || item.total || 0;
  };

  // Transform data for Recharts
  const chartData = data.map(item => ({
    name: getLabel(item),
    value: getValue(item),
    ...item
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-sm text-sky-600 font-bold">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
      {title && <h3 className="text-sm font-medium text-slate-600 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#0ea5e9"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Vertical Bar Chart component - for category comparisons
const VerticalBarChart = ({ data, title }) => {
  // Helper to get the label from item
  const getLabel = (item) => {
    return item.form_name || item.name || item.form || item.department ||
           item.label || item.status || item.user || item.category || item.type || 'Unknown';
  };

  // Helper to get the value from item
  const getValue = (item) => {
    return item.submissions || item.pending || item.value || item.count || 0;
  };

  // Transform and sort data for Recharts (top items)
  const chartData = data
    .map(item => ({
      name: getLabel(item).length > 15 ? getLabel(item).substring(0, 15) + '...' : getLabel(item),
      fullName: getLabel(item),
      value: getValue(item),
    }))
    .slice(0, 8); // Limit to top 8 for readability

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-700">{payload[0].payload.fullName}</p>
          <p className="text-sm text-sky-600 font-bold">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
      {title && <h3 className="text-sm font-medium text-slate-600 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={{ stroke: '#e2e8f0' }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }} />
          <Bar
            dataKey="value"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Donut Chart component - for distributions/proportions
const DonutChart = ({ data, title }) => {
  // Transform data for Recharts
  const chartData = data.map((item, index) => ({
    name: item.status || item.label || item.name || `Item ${index + 1}`,
    value: item.count || item.value || item.submissions || 0,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Custom label for pie slices
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percent = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-700">{payload[0].name}</p>
          <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
            {payload[0].value.toLocaleString()} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
      {title && <h3 className="text-sm font-medium text-slate-600 mb-4">{title}</h3>}
      <div className="flex flex-col md:flex-row items-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-4 md:mt-0 md:ml-4">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-xs text-slate-600">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-bold text-slate-700">{total.toLocaleString()}</span>
      </div>
    </div>
  );
};

// Horizontal Ranking Chart - improved version with consistent colors and pagination
const RankingChart = ({ data }) => {
  const ITEMS_PER_PAGE = 5;
  const [showAll, setShowAll] = useState(false);

  const maxValue = Math.max(...data.map(d => d.submissions || d.pending || d.value || d.count || 0));
  const total = data.reduce((sum, item) => sum + (item.submissions || item.pending || item.value || item.count || 0), 0);

  // Helper to get the label from item
  const getLabel = (item) => {
    return item.form_name || item.name || item.form || item.department ||
           item.label || item.month || item.status || item.user ||
           item.category || item.type || 'Unknown';
  };

  // Helper to get the value from item
  const getValue = (item) => {
    return item.submissions || item.pending || item.value || item.count || 0;
  };

  // Medal colors for top 3, then gradient for rest
  const getRankStyle = (index) => {
    if (index === 0) return { bg: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' }; // Gold
    if (index === 1) return { bg: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' }; // Silver
    if (index === 2) return { bg: 'bg-amber-600', badge: 'bg-amber-50 text-amber-600' }; // Bronze
    return { bg: 'bg-sky-400', badge: 'bg-slate-50 text-slate-500' }; // Rest
  };

  // Get displayed items based on pagination
  const displayedData = showAll ? data : data.slice(0, ITEMS_PER_PAGE);
  const hasMore = data.length > ITEMS_PER_PAGE;
  const hiddenCount = data.length - ITEMS_PER_PAGE;

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
      <div className="space-y-4">
        {displayedData.map((item, index) => {
          const value = getValue(item);
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const percentOfTotal = total > 0 ? Math.round((value / total) * 100) : 0;
          const label = getLabel(item);
          const rankStyle = getRankStyle(index);

          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${rankStyle.badge}`}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]" title={label}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{value.toLocaleString()}</span>
                  <span className="text-xs text-slate-400">({percentOfTotal}%)</span>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${rankStyle.bg} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Show less
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show {hiddenCount} more
              </>
            )}
          </button>
        </div>
      )}

      {total > 0 && (
        <div className={`${hasMore ? '' : 'mt-4'} pt-3 border-t border-slate-100 flex justify-between items-center text-sm`}>
          <span className="text-slate-500">Total ({data.length} items)</span>
          <span className="font-bold text-slate-700">{total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

// Query Transparency component - shows what AI understood
const QueryTransparency = ({ metadata }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) return null;

  // Format the query type for display
  const formatQueryType = (type) => {
    const typeLabels = {
      'trend': 'Time Series Trend',
      'comparison': 'Category Comparison',
      'breakdown': 'Status Breakdown',
      'count': 'Count Query',
      'average': 'Average Calculation',
      'overview': 'Dashboard Overview',
      'ranking': 'Ranking Analysis'
    };
    return typeLabels[type] || type || 'General Query';
  };

  // Format filters for display
  const formatFilters = (filters) => {
    if (!filters || Object.keys(filters).length === 0) return null;
    const formatted = [];
    if (filters.status) formatted.push(`Status: ${filters.status}`);
    if (filters.form_type) formatted.push(`Form: ${filters.form_type}`);
    if (filters.department) formatted.push(`Department: ${filters.department}`);
    if (filters.date_range) formatted.push(`Time: ${filters.date_range}`);
    if (filters.time_period) formatted.push(`Period: ${filters.time_period}`);
    if (filters.time_range) formatted.push(`Period: ${filters.time_range}`);
    return formatted.length > 0 ? formatted : null;
  };

  // Get confidence styling
  const getConfidenceStyle = (confidence) => {
    if (confidence >= 0.8) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'High' };
    if (confidence >= 0.6) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Medium' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Low' };
  };

  const filters = formatFilters(metadata.filters_applied);
  const confidence = metadata.confidence || 0.8;
  const confidenceStyle = getConfidenceStyle(confidence);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>What I understood</span>
        {/* Confidence indicator - always visible */}
        <span className={`ml-1 px-1.5 py-0.5 rounded ${confidenceStyle.bg} ${confidenceStyle.color} font-medium`}>
          {Math.round(confidence * 100)}%
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
          {/* Confidence bar */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="text-slate-500">Confidence:</span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${confidence >= 0.8 ? 'bg-emerald-500' : confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'} rounded-full transition-all`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className={`font-medium ${confidenceStyle.color}`}>
              {confidenceStyle.label} ({Math.round(confidence * 100)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Query Type:</span>
            <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {formatQueryType(metadata.query_type)}
            </span>
          </div>

          {metadata.entity && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Analyzing:</span>
              <span className="font-medium text-slate-700 capitalize">{metadata.entity}</span>
            </div>
          )}

          {metadata.group_by && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Grouped by:</span>
              <span className="font-medium text-slate-700 capitalize">{metadata.group_by}</span>
            </div>
          )}

          {filters && filters.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-slate-500">Filters:</span>
              <div className="flex flex-wrap gap-1">
                {filters.map((filter, idx) => (
                  <span key={idx} className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded">
                    {filter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Analytics Result Card component
const AnalyticsResultCard = ({ result }) => {
  const renderVisualization = () => {
    if (!result.data || result.data.length === 0) {
      return null;
    }

    switch (result.visualization) {
      case 'number':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.data.map((item, index) => (
              <MetricCard
                key={index}
                label={item.label}
                value={item.value}
                unit={item.unit}
                trend={item.trend}
                icon={item.icon}
                comparison={item.comparison}
                color={item.color}
              />
            ))}
          </div>
        );

      case 'bar':
        return (
          <div>
            <VerticalBarChart data={result.data} title={result.title} />
          </div>
        );

      case 'line':
      case 'trend':
      case 'area':
        return (
          <div>
            <TrendLineChart data={result.data} title={result.title} />
          </div>
        );

      case 'pie':
      case 'donut':
        return (
          <div>
            <DonutChart data={result.data} title={result.title} />
          </div>
        );

      case 'ranking':
        return (
          <div>
            <RankingChart data={result.data} />
          </div>
        );

      case 'status':
        return (
          <div>
            <StatusBreakdown data={result.data} />
          </div>
        );

      case 'cards':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {result.data.map((item, index) => (
              <MetricCard
                key={index}
                label={item.label}
                value={item.value}
                icon={item.icon}
                trend={item.trend}
                comparison={item.comparison}
                color={item.color}
              />
            ))}
          </div>
        );

      case 'table':
      default:
        // Table view - used for list queries (who submitted, etc.)
        return (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {Object.keys(result.data[0] || {}).map((key) => (
                    <th key={key} className="px-4 py-2 text-left text-slate-600 font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {Object.values(row).map((value, vIndex) => (
                      <td key={vIndex} className="px-4 py-2 text-slate-700">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  // Check if we have data to show visualization
  const hasVisualization = result.data && result.data.length > 0 && result.visualization !== 'text';

  return (
    <div className="mb-4">
      {/* AI Avatar Row - Now shows summary instead of interpretation */}
      <div className="flex justify-start mb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-md text-white">
          <SparklesIcon />
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md max-w-[70%]">
          <div className="text-sm text-slate-800 whitespace-pre-wrap">
            {result.summary || result.interpretation || "Here are your results."}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {/* Query Transparency - shows what AI understood */}
          <QueryTransparency metadata={result.query_metadata} />
        </div>
      </div>

      {/* Visualization - Only show if we have data */}
      {hasVisualization && (
        <div className="ml-11">
          {renderVisualization()}
        </div>
      )}
    </div>
  );
};

// Suggested Query Chips - Enhanced with icons
const SuggestedQueries = ({ queries, onSelect }) => {
  // Helper to get appropriate icon for query type
  const getQueryIcon = (query) => {
    const q = query.toLowerCase();
    if (q.includes('how many') || q.includes('count')) return '📊';
    if (q.includes('trend') || q.includes('over time')) return '📈';
    if (q.includes('average')) return '⏱️';
    if (q.includes('department') || q.includes('breakdown')) return '🏢';
    if (q.includes('status')) return '📋';
    return '💡';
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {queries.slice(0, 4).map((query, index) => (
        <button
          key={index}
          onClick={() => onSelect(query)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all hover:shadow-md group"
        >
          <span className="text-base group-hover:scale-110 transition-transform">{getQueryIcon(query)}</span>
          <span>{query}</span>
        </button>
      ))}
    </div>
  );
};

// Main Natural Language Analytics component
const NaturalLanguageAnalytics = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      const result = await analyticsService.loadChatHistory();

      if (result.success && result.messages && result.messages.length > 0) {
        // Convert backend messages to frontend format
        const loadedMessages = result.messages.map(msg => {
          const baseMessage = {
            content: msg.content,
            isUser: msg.message_type === 'USER',
            timestamp: msg.created_at
          };

          // Check if this is an analytics result (has visualization data in metadata)
          if (msg.metadata && msg.metadata.visualization) {
            return {
              ...baseMessage,
              isAnalyticsResult: true,
              visualization: msg.metadata.visualization,
              data: msg.metadata.data || [],
              summary: msg.metadata.summary,
              interpretation: msg.metadata.interpretation,
              query_metadata: msg.metadata.query_metadata
            };
          }

          return baseMessage;
        });
        setMessages(loadedMessages);
        setShowSuggestions(false); // Hide suggestions if there's history
      } else {
        // No history, show welcome message
        const welcomeMessage = analyticsService.getWelcomeMessage();
        setMessages([{ ...welcomeMessage, isUser: false }]);
        // Save welcome message to backend (fire and forget)
        analyticsService.saveMessage(welcomeMessage.content, 'ASSISTANT');
      }
      setIsLoadingHistory(false);
    };

    loadHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Add message to chat and save to backend
  const addMessage = (message, metadata = {}) => {
    setMessages(prev => [...prev, message]);

    // Save to backend (fire and forget - don't wait)
    analyticsService.saveMessage(
      message.content,
      message.isUser ? 'USER' : 'ASSISTANT',
      metadata
    );
  };

  // Clear chat history
  const handleClearChat = async () => {
    const result = await analyticsService.clearChatHistory();
    if (result.success) {
      // Reset to welcome message
      const welcomeMessage = analyticsService.getWelcomeMessage();
      setMessages([{ ...welcomeMessage, isUser: false }]);
      setShowSuggestions(true);
      // Save welcome message to new session
      analyticsService.saveMessage(welcomeMessage.content, 'ASSISTANT');
    }
  };

  // Handle send message
  const handleSendMessage = async (query = null) => {
    const messageText = query || inputValue.trim();
    if (!messageText) return;

    const userMessage = {
      content: messageText,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setInputValue('');
    setShowSuggestions(false);

    setIsTyping(true);

    try {
      // Pass conversation history for context (so AI understands follow-up questions)
      const response = await analyticsService.processQuery(messageText, {}, messages);

      setIsTyping(false);

      if (response.type === 'error' || response.type === 'text') {
        // Simple text message (errors, greetings, help, etc.)
        addMessage({
          content: response.content,
          isUser: false,
          timestamp: response.timestamp
        });
      } else {
        // Add analytics result as a special message type
        const analyticsResult = { ...response, isUser: false, isAnalyticsResult: true };
        setMessages(prev => [...prev, analyticsResult]);

        // Save analytics result to backend with visualization metadata
        analyticsService.saveMessage(
          response.summary || response.interpretation || response.content,
          'ASSISTANT',
          {
            visualization: response.visualization,
            data: response.data,
            summary: response.summary,
            interpretation: response.interpretation,
            filters: response.filters,
            aggregation: response.aggregation,
            query_metadata: response.query_metadata
          }
        );
      }
    } catch (error) {
      setIsTyping(false);
      addMessage({
        content: "I'm sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle suggested query click
  const handleSuggestedQuery = (query) => {
    handleSendMessage(query);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md text-white">
              <SparklesIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Analytics Query</h1>
              <p className="text-sm text-slate-500">
                Ask questions about your forms data in natural language
                {user?.role === 'ADMIN' && ' (All Departments)'}
                {user?.role === 'MANAGER' && user?.department_name && ` (${user.department_name})`}
              </p>
            </div>
          </div>
          {/* Clear Chat Button */}
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
            title="Start new chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            New Chat
          </button>
        </div>
      </div>

      {/* Chat Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {/* Loading history indicator */}
        {isLoadingHistory ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <span className="ml-3 text-slate-500">Loading chat history...</span>
          </div>
        ) : (
          messages.map((message, index) => (
            message.isAnalyticsResult ? (
              <AnalyticsResultCard key={index} result={message} />
            ) : (
              <ChatMessage key={index} message={message} isUser={message.isUser} user={user} accent="emerald" />
            )
          ))
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator accent="emerald" />}

        {/* Suggested queries */}
        {showSuggestions && messages.length === 1 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-2">Try one of these:</p>
            <SuggestedQueries
              queries={analyticsService.getSuggestedQueries()}
              onSelect={handleSuggestedQuery}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your data..."
              className="w-full px-4 py-3 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Press Enter to send your query
        </p>
      </div>
    </div>
  );
};

export default NaturalLanguageAnalytics;
