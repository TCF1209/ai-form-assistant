import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';
import {
  AreaChart, Area,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Register Chart.js components (for PDF export only)
Chart.register(...registerables);

// Color palette for charts
const CHART_COLORS = [
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#64748b', // slate-500
];

// Icons
const ReportsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color = 'sky' }) => {
  const colorClasses = {
    sky: 'bg-sky-100 text-sky-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Simple Bar Chart Component (horizontal bars)
const BarChart = ({ data, title, xKey, yKey, color = 'sky' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <p className="text-slate-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0));
  const colorClass = color === 'sky' ? 'bg-sky-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => {
          const value = item[yKey] || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="w-28 text-sm text-slate-600 truncate" title={item[xKey]}>
                {item[xKey]}
              </div>
              <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colorClass} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: `${Math.max(percentage, 5)}%` }}
                >
                  {percentage > 20 && (
                    <span className="text-xs font-medium text-white">{value}</span>
                  )}
                </div>
              </div>
              {percentage <= 20 && (
                <div className="w-12 text-sm font-medium text-slate-700 text-right">
                  {value}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Donut Chart Component using Recharts
const PieChart = ({ data, title, labelKey, valueKey }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <p className="text-slate-500 text-center py-8">No data available</p>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((item, index) => ({
    name: item[labelKey] || `Item ${index + 1}`,
    value: item[valueKey] || 0,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Custom label for pie slices
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="flex flex-col md:flex-row items-center">
        <ResponsiveContainer width="100%" height={220}>
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 md:mt-0 md:ml-2">
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

// Line/Area Chart Component using Recharts
const LineChart = ({ data, title, xKey, yKey }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <p className="text-slate-500 text-center py-8">No data available</p>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.map(item => ({
    name: item[xKey],
    value: item[yKey] || 0,
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
            dot={{ fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff', r: 4 }}
            activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Reports Component
const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState('30'); // days
  const [reportData, setReportData] = useState({
    summary: {},
    submissionsByStatus: [],
    submissionsByDepartment: [],
    submissionsTrend: [],
    formsByType: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch ALL submissions (bypass pagination for reports)
      const submissionsRes = await api.get('/submissions/?page_size=1000');
      const submissions = submissionsRes.data.results || submissionsRes.data || [];

      // Fetch ALL forms (bypass pagination for reports)
      const formsRes = await api.get('/forms/?page_size=1000');
      const forms = formsRes.data.results || formsRes.data || [];

      // Filter by date range
      const now = new Date();
      const startDate = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

      const filteredSubmissions = submissions.filter(s => {
        const submittedDate = new Date(s.submitted_at || s.created_at);
        return submittedDate >= startDate;
      });


      // Calculate summary - handle both uppercase and potential variations
      const getStatusCount = (statusValues) => {
        return filteredSubmissions.filter(s => {
          const status = (s.status || '').toUpperCase();
          return statusValues.map(v => v.toUpperCase()).includes(status);
        }).length;
      };

      const summary = {
        totalSubmissions: filteredSubmissions.length,
        approvedSubmissions: getStatusCount(['APPROVED']),
        pendingSubmissions: getStatusCount(['SUBMITTED', 'IN_REVIEW', 'PENDING']),
        rejectedSubmissions: getStatusCount(['REJECTED']),
        totalForms: forms.length,
        activeForms: forms.filter(f => (f.status || '').toUpperCase() === 'ACTIVE').length,
      };

      // Calculate approval rate
      const completedSubmissions = summary.approvedSubmissions + summary.rejectedSubmissions;
      summary.approvalRate = completedSubmissions > 0
        ? Math.round((summary.approvedSubmissions / completedSubmissions) * 100)
        : 0;

      // Submissions by status
      const statusCounts = {};
      filteredSubmissions.forEach(s => {
        const status = s.status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const submissionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' '),
        count,
      }));

      // Submissions by department
      const deptCounts = {};
      filteredSubmissions.forEach(s => {
        const dept = s.form_detail?.department_name || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      const submissionsByDepartment = Object.entries(deptCounts)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Submissions trend - generate FULL date range for the selected period
      const days = parseInt(dateRange);
      const trendData = {};

      // Determine grouping: daily for <= 14 days, weekly for > 14 days
      const useWeekly = days > 14;

      // Generate all dates/weeks in the range (from startDate to now)
      const generateDateRange = () => {
        const dates = [];
        const current = new Date(startDate);

        if (useWeekly) {
          // For weekly: start from the Sunday of the start week
          current.setDate(current.getDate() - current.getDay());
        }

        while (current <= now) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          const sortKey = `${year}-${month}-${day}`;

          dates.push(sortKey);
          trendData[sortKey] = { count: 0 };

          if (useWeekly) {
            current.setDate(current.getDate() + 7); // Next week
          } else {
            current.setDate(current.getDate() + 1); // Next day
          }
        }
        return dates;
      };

      generateDateRange();

      // Count submissions for each period
      filteredSubmissions.forEach(s => {
        const date = new Date(s.submitted_at || s.created_at);
        let sortKey;

        if (useWeekly) {
          // Get week start (Sunday)
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const year = weekStart.getFullYear();
          const month = String(weekStart.getMonth() + 1).padStart(2, '0');
          const day = String(weekStart.getDate()).padStart(2, '0');
          sortKey = `${year}-${month}-${day}`;
        } else {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          sortKey = `${year}-${month}-${day}`;
        }

        if (trendData[sortKey]) {
          trendData[sortKey].count += 1;
        }
      });

      // Sort by date and limit to reasonable number of points
      const maxPoints = useWeekly ? 13 : 14; // ~3 months of weeks or 2 weeks of days
      const submissionsTrend = Object.entries(trendData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-maxPoints)
        .map(([sortKey, { count }]) => {
          const [year, month, day] = sortKey.split('-');
          const displayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const displayKey = displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return { date: displayKey, count };
        });

      // Forms by type/department
      const formTypeCounts = {};
      forms.forEach(f => {
        const dept = f.department_name || 'Unknown';
        formTypeCounts[dept] = (formTypeCounts[dept] || 0) + 1;
      });
      const formsByType = Object.entries(formTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      setReportData({
        summary,
        submissionsByStatus,
        submissionsByDepartment,
        submissionsTrend,
        formsByType,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Fetch ALL submissions data (bypass pagination)
      const submissionsRes = await api.get('/submissions/?page_size=1000');
      const submissions = submissionsRes.data.results || submissionsRes.data || [];

      // Filter by date range
      const now = new Date();
      const startDate = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      const filteredSubmissions = submissions.filter(s => {
        const submittedDate = new Date(s.submitted_at || s.created_at);
        return submittedDate >= startDate;
      });

      // Calculate statistics
      const statusCounts = {};
      const formCounts = {};
      const deptCounts = {};
      const userCounts = {};

      filteredSubmissions.forEach(s => {
        // Status counts
        const status = s.status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Form counts
        const formName = s.form_detail?.name || s.form_name || 'Unknown';
        formCounts[formName] = (formCounts[formName] || 0) + 1;

        // Department counts
        const dept = s.form_detail?.department_name || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;

        // User counts
        const user = s.submitted_by_detail?.username || s.submitted_by_name || 'Unknown';
        userCounts[user] = (userCounts[user] || 0) + 1;
      });

      // Calculate rates
      const approvedCount = (statusCounts['APPROVED'] || 0) + (statusCounts['COMPLETED'] || 0);
      const rejectedCount = statusCounts['REJECTED'] || 0;
      const pendingCount = (statusCounts['PENDING'] || 0) + (statusCounts['SUBMITTED'] || 0);
      const totalProcessed = approvedCount + rejectedCount;
      const approvalRate = totalProcessed > 0 ? ((approvedCount / totalProcessed) * 100).toFixed(1) : 'N/A';

      // Create workbook
      const wb = XLSX.utils.book_new();

      // ============ SHEET 1: Summary Dashboard ============
      const summaryData = [
        ['AI OFFICE ASSISTANT'],
        ['SUBMISSIONS REPORT - EXECUTIVE SUMMARY'],
        [],
        ['Report Information'],
        ['Report Period:', `${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}`],
        ['Days Covered:', dateRange],
        ['Generated:', now.toLocaleString()],
        [],
        ['Key Metrics'],
        ['Total Submissions:', filteredSubmissions.length],
        ['Approved/Completed:', approvedCount],
        ['Rejected:', rejectedCount],
        ['Pending/Submitted:', pendingCount],
        ['Approval Rate:', approvalRate !== 'N/A' ? `${approvalRate}%` : 'N/A'],
        [],
        ['Status Breakdown'],
        ['Status', 'Count', 'Percentage'],
      ];

      // Add status breakdown
      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          summaryData.push([status, count, `${percentage}%`]);
        });

      summaryData.push([]);
      summaryData.push(['Department Breakdown']);
      summaryData.push(['Department', 'Count', 'Percentage']);

      // Add department breakdown
      Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([dept, count]) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          summaryData.push([dept, count, `${percentage}%`]);
        });

      summaryData.push([]);
      summaryData.push(['Top Forms by Submissions']);
      summaryData.push(['Form Name', 'Count', 'Percentage']);

      // Add top forms (top 10)
      Object.entries(formCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([form, count]) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          summaryData.push([form, count, `${percentage}%`]);
        });

      summaryData.push([]);
      summaryData.push(['Top Submitters']);
      summaryData.push(['User', 'Submissions', 'Percentage']);

      // Add top users (top 10)
      Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([user, count]) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          summaryData.push([user, count, `${percentage}%`]);
        });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Set column widths for summary sheet
      summarySheet['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 }
      ];

      // Merge title cells
      summarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      ];

      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // ============ SHEET 2: Detailed Data ============
      const dataHeaders = ['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department'];

      const detailData = filteredSubmissions.map(sub => [
        String(sub.id).substring(0, 8),
        sub.form_detail?.name || sub.form_name || 'N/A',
        sub.submitted_by_detail?.username || sub.submitted_by_name || 'N/A',
        sub.status || 'N/A',
        sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A',
        sub.form_detail?.department_name || 'N/A'
      ]);

      const dataSheet = XLSX.utils.aoa_to_sheet([dataHeaders, ...detailData]);

      // Set column widths for data sheet
      dataSheet['!cols'] = [
        { wch: 12 },  // ID
        { wch: 35 },  // Form Name
        { wch: 18 },  // Submitted By
        { wch: 15 },  // Status
        { wch: 22 },  // Submitted At
        { wch: 20 }   // Department
      ];

      // Add auto-filter to header row
      dataSheet['!autofilter'] = { ref: `A1:F${detailData.length + 1}` };

      XLSX.utils.book_append_sheet(wb, dataSheet, 'Submissions Data');

      // ============ SHEET 3: Status Analysis ============
      const statusData = [
        ['STATUS ANALYSIS'],
        [],
        ['Status', 'Count', 'Percentage', 'Category'],
      ];

      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          let category = 'Other';
          if (status === 'APPROVED' || status === 'COMPLETED') category = 'Success';
          else if (status === 'REJECTED') category = 'Rejected';
          else if (status === 'PENDING' || status === 'SUBMITTED') category = 'In Progress';
          else if (status === 'DRAFT') category = 'Draft';
          statusData.push([status, count, `${percentage}%`, category]);
        });

      statusData.push([]);
      statusData.push(['Summary by Category']);
      statusData.push(['Category', 'Count', 'Percentage']);
      statusData.push(['Success (Approved/Completed)', approvedCount, totalProcessed > 0 ? `${((approvedCount / filteredSubmissions.length) * 100).toFixed(1)}%` : '0%']);
      statusData.push(['Rejected', rejectedCount, `${((rejectedCount / filteredSubmissions.length) * 100).toFixed(1)}%`]);
      statusData.push(['In Progress (Pending/Submitted)', pendingCount, `${((pendingCount / filteredSubmissions.length) * 100).toFixed(1)}%`]);
      statusData.push(['Draft', statusCounts['DRAFT'] || 0, `${(((statusCounts['DRAFT'] || 0) / filteredSubmissions.length) * 100).toFixed(1)}%`]);

      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      statusSheet['!cols'] = [
        { wch: 30 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 }
      ];
      statusSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      ];

      XLSX.utils.book_append_sheet(wb, statusSheet, 'Status Analysis');

      // ============ SHEET 4: Department Analysis ============
      const deptData = [
        ['DEPARTMENT ANALYSIS'],
        [],
        ['Department', 'Total Submissions', 'Percentage', 'Rank'],
      ];

      Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([dept, count], index) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          deptData.push([dept, count, `${percentage}%`, index + 1]);
        });

      const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
      deptSheet['!cols'] = [
        { wch: 25 },
        { wch: 18 },
        { wch: 15 },
        { wch: 8 }
      ];
      deptSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      ];

      XLSX.utils.book_append_sheet(wb, deptSheet, 'Department Analysis');

      // ============ SHEET 5: Form Analysis ============
      const formData = [
        ['FORM ANALYSIS'],
        [],
        ['Form Name', 'Submissions', 'Percentage', 'Rank'],
      ];

      Object.entries(formCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([form, count], index) => {
          const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
          formData.push([form, count, `${percentage}%`, index + 1]);
        });

      const formSheet = XLSX.utils.aoa_to_sheet(formData);
      formSheet['!cols'] = [
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 8 }
      ];
      formSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      ];

      XLSX.utils.book_append_sheet(wb, formSheet, 'Form Analysis');

      // Generate and download file
      const fileName = `submissions_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Log export to audit trail
      try {
        await api.post('/audit-logs/log_export/', {
          export_type: 'excel',
          report_name: 'Submissions Report'
        });
      } catch (logError) {
        console.error('Failed to log export:', logError);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Helper function to create chart image
  const createChartImage = (config, width, height) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const chart = new Chart(ctx, config);

      // Wait for chart to render
      setTimeout(() => {
        const imageData = canvas.toDataURL('image/png');
        chart.destroy();
        resolve(imageData);
      }, 100);
    });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Fetch ALL submissions data (bypass pagination)
      const submissionsRes = await api.get('/submissions/?page_size=1000');
      const submissions = submissionsRes.data.results || submissionsRes.data || [];

      // Filter by date range
      const now = new Date();
      const startDate = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      const filteredSubmissions = submissions.filter(s => {
        const submittedDate = new Date(s.submitted_at || s.created_at);
        return submittedDate >= startDate;
      });

      // Design System Colors
      const skyBlue = [14, 165, 233];      // #0EA5E9 - Primary
      const darkGray = [30, 41, 59];       // #1E293B - Text
      const mediumGray = [100, 116, 139];  // #64748B - Secondary text
      const lightGray = [248, 250, 252];   // #F8FAFC - Background
      const white = [255, 255, 255];
      const success = [16, 185, 129];      // #10B981 - Success
      const errorColor = [239, 68, 68];    // #EF4444 - Error

      // Chart colors matching design system
      const chartColors = {
        skyBlue: '#0EA5E9',
        skyBlueHover: '#0284C7',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        purple: '#8B5CF6',
        pink: '#EC4899',
        gray: '#64748B'
      };

      // Count by status for summary
      const statusCounts = {};
      filteredSubmissions.forEach(s => {
        const status = s.status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Count by form
      const formCounts = {};
      filteredSubmissions.forEach(s => {
        const formName = s.form_detail?.name || s.form_name || 'Unknown';
        formCounts[formName] = (formCounts[formName] || 0) + 1;
      });

      // Count by department
      const deptCounts = {};
      filteredSubmissions.forEach(s => {
        const dept = s.form_detail?.department_name || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      // Create PDF document (portrait for better chart display)
      const doc = new jsPDF('portrait');
      const pageWidth = doc.internal.pageSize.width;

      // ============ PAGE 1: Cover & Summary ============

      // Header background
      doc.setFillColor(...skyBlue);
      doc.rect(0, 0, pageWidth, 50, 'F');

      // Title
      doc.setTextColor(...white);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Office Assistant', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Submissions Report', pageWidth / 2, 32, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`, pageWidth / 2, 42, { align: 'center' });

      // Summary section title
      doc.setTextColor(...darkGray);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 14, 65);

      // Summary line
      doc.setDrawColor(...skyBlue);
      doc.setLineWidth(1);
      doc.line(14, 68, 80, 68);

      // Summary stats
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.text(`Total Submissions: ${filteredSubmissions.length}`, 14, 80);
      doc.text(`Report Period: ${dateRange} days`, 14, 88);
      doc.text(`Generated: ${now.toLocaleString()}`, 14, 96);

      // Status breakdown
      let yPos = 110;
      doc.setFont('helvetica', 'bold');
      doc.text('Status Breakdown:', 14, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      Object.entries(statusCounts).forEach(([status, count]) => {
        const percentage = ((count / filteredSubmissions.length) * 100).toFixed(1);
        doc.text(`• ${status}: ${count} (${percentage}%)`, 20, yPos);
        yPos += 7;
      });

      // Create Pie Chart for Status Distribution
      const statusLabels = Object.keys(statusCounts);
      const statusData = Object.values(statusCounts);
      const statusColors = statusLabels.map(status => {
        if (status === 'APPROVED' || status === 'COMPLETED') return chartColors.success;
        if (status === 'REJECTED') return chartColors.error;
        if (status === 'PENDING') return chartColors.warning;
        if (status === 'SUBMITTED') return chartColors.skyBlue;
        if (status === 'DRAFT') return chartColors.gray;
        return chartColors.purple;
      });

      const pieChartConfig = {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [{
            data: statusData,
            backgroundColor: statusColors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: { size: 11 },
                padding: 10
              }
            },
            title: {
              display: true,
              text: 'Submissions by Status',
              font: { size: 14, weight: 'bold' },
              color: '#1E293B'
            }
          }
        }
      };

      const pieChartImage = await createChartImage(pieChartConfig, 400, 250);
      doc.addImage(pieChartImage, 'PNG', 100, 60, 100, 62);

      // ============ PAGE 2: Charts ============
      doc.addPage();

      // Page header
      doc.setFillColor(...skyBlue);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Analytics & Charts', pageWidth / 2, 16, { align: 'center' });

      // Bar Chart - Submissions by Form
      const formLabels = Object.keys(formCounts).slice(0, 8).map(name =>
        name.length > 15 ? name.substring(0, 15) + '...' : name
      );
      const formData = Object.values(formCounts).slice(0, 8);

      const barChartConfig = {
        type: 'bar',
        data: {
          labels: formLabels,
          datasets: [{
            label: 'Submissions',
            data: formData,
            backgroundColor: chartColors.skyBlue,
            borderColor: chartColors.skyBlueHover,
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: false,
          animation: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Submissions by Form',
              font: { size: 14, weight: 'bold' },
              color: '#1E293B'
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: '#E2E8F0' }
            },
            y: {
              grid: { display: false }
            }
          }
        }
      };

      const barChartImage = await createChartImage(barChartConfig, 500, 300);
      doc.addImage(barChartImage, 'PNG', 14, 35, 180, 80);

      // Pie Chart - Submissions by Department
      const deptLabels = Object.keys(deptCounts);
      const deptData = Object.values(deptCounts);
      const deptColors = [
        chartColors.skyBlue, chartColors.success, chartColors.warning,
        chartColors.purple, chartColors.pink, chartColors.error, chartColors.gray
      ];

      const deptPieConfig = {
        type: 'pie',
        data: {
          labels: deptLabels,
          datasets: [{
            data: deptData,
            backgroundColor: deptColors.slice(0, deptLabels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { font: { size: 10 }, padding: 8 }
            },
            title: {
              display: true,
              text: 'Submissions by Department',
              font: { size: 14, weight: 'bold' },
              color: '#1E293B'
            }
          }
        }
      };

      const deptPieImage = await createChartImage(deptPieConfig, 400, 250);
      doc.addImage(deptPieImage, 'PNG', 14, 125, 90, 56);

      // Status distribution bar chart
      const statusBarConfig = {
        type: 'bar',
        data: {
          labels: statusLabels,
          datasets: [{
            label: 'Count',
            data: statusData,
            backgroundColor: statusColors,
            borderWidth: 0,
            borderRadius: 4
          }]
        },
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Status Distribution',
              font: { size: 14, weight: 'bold' },
              color: '#1E293B'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#E2E8F0' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      };

      const statusBarImage = await createChartImage(statusBarConfig, 400, 250);
      doc.addImage(statusBarImage, 'PNG', 110, 125, 90, 56);

      // ============ PAGE 3: Data Table ============
      // Add landscape page (format: 'a4', orientation: 'l' for landscape)
      doc.addPage('a4', 'l');

      // Get landscape page dimensions
      const landscapeWidth = doc.internal.pageSize.width;
      const landscapeHeight = doc.internal.pageSize.height;

      // Page header
      doc.setFillColor(...skyBlue);
      doc.rect(0, 0, landscapeWidth, 25, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Submissions Data', landscapeWidth / 2, 16, { align: 'center' });

      // Prepare table data
      const tableData = filteredSubmissions.map(sub => [
        String(sub.id).substring(0, 8),
        (sub.form_detail?.name || sub.form_name || 'N/A').substring(0, 30),
        sub.submitted_by_detail?.username || sub.submitted_by_name || 'N/A',
        sub.status || 'N/A',
        sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A',
        sub.form_detail?.department_name || 'N/A'
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 35,
        head: [['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']],
        body: tableData,
        headStyles: {
          fillColor: skyBlue,
          textColor: white,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10,
          cellPadding: 4
        },
        bodyStyles: {
          textColor: darkGray,
          halign: 'center',
          fontSize: 9,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: lightGray
        },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.5
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 65 },
          2: { halign: 'center', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 28 },
          4: { halign: 'center', cellWidth: 42 },
          5: { halign: 'center', cellWidth: 35 }
        },
        didParseCell: function(data) {
          if (data.column.index === 3 && data.section === 'body') {
            const status = data.cell.raw;
            if (status === 'APPROVED' || status === 'COMPLETED') {
              data.cell.styles.textColor = success;
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'REJECTED') {
              data.cell.styles.textColor = errorColor;
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'PENDING' || status === 'SUBMITTED') {
              data.cell.styles.textColor = skyBlue;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // Footer on last page
      doc.setDrawColor(...skyBlue);
      doc.setLineWidth(0.5);
      doc.line(14, landscapeHeight - 15, landscapeWidth - 14, landscapeHeight - 15);

      doc.setTextColor(...mediumGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${now.toLocaleString()}`, 14, landscapeHeight - 8);
      doc.text('AI Office Assistant - Powered by OpenAI', landscapeWidth - 14, landscapeHeight - 8, { align: 'right' });

      // Save the PDF
      const fileName = `submissions_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      // Log export to audit trail
      try {
        await api.post('/audit-logs/log_export/', {
          export_type: 'pdf',
          report_name: 'Submissions Report'
        });
      } catch (logError) {
        console.error('Failed to log export:', logError);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-sky-100 text-sky-600">
              <ReportsIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
              <p className="text-slate-500">
                View analytics and export data
                {user?.role === 'MANAGER' && user?.department_name && ` • ${user.department_name}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <CalendarIcon />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchReportData}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshIcon />
              Refresh
            </button>

            {/* Export Buttons */}
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              <DownloadIcon />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
              <DownloadIcon />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Submissions"
          value={reportData.summary.totalSubmissions || 0}
          subtitle={`Last ${dateRange} days`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="sky"
        />
        <StatCard
          title="Approved"
          value={reportData.summary.approvedSubmissions || 0}
          subtitle={`${reportData.summary.approvalRate || 0}% approval rate`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
        <StatCard
          title="Pending Review"
          value={reportData.summary.pendingSubmissions || 0}
          subtitle="Awaiting action"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="amber"
        />
        <StatCard
          title="Rejected"
          value={reportData.summary.rejectedSubmissions || 0}
          subtitle={`${reportData.summary.activeForms || 0} active forms`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="red"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
          data={reportData.submissionsTrend}
          title="Submission Trends"
          xKey="date"
          yKey="count"
        />
        <PieChart
          data={reportData.submissionsByStatus}
          title="Status Distribution"
          labelKey="status"
          valueKey="count"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          data={reportData.submissionsByDepartment}
          title="Submissions by Department"
          xKey="department"
          yKey="count"
          color="sky"
        />
        <BarChart
          data={reportData.formsByType}
          title="Forms by Department"
          xKey="type"
          yKey="count"
          color="emerald"
        />
      </div>
    </div>
  );
};

export default Reports;
