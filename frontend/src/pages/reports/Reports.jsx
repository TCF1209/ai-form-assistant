import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

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

// Simple Bar Chart Component
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

// Simple Pie Chart Component (using CSS)
const PieChart = ({ data, title, labelKey, valueKey }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <p className="text-slate-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  const colors = [
    { bg: 'bg-sky-500', text: 'text-sky-500' },
    { bg: 'bg-emerald-500', text: 'text-emerald-500' },
    { bg: 'bg-amber-500', text: 'text-amber-500' },
    { bg: 'bg-red-500', text: 'text-red-500' },
    { bg: 'bg-purple-500', text: 'text-purple-500' },
    { bg: 'bg-slate-500', text: 'text-slate-500' },
  ];

  // Calculate conic gradient
  let currentAngle = 0;
  const gradientParts = data.map((item, index) => {
    const value = item[valueKey] || 0;
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const startAngle = currentAngle;
    currentAngle += percentage * 3.6; // Convert to degrees
    const colorHex = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'][index % 6];
    return `${colorHex} ${startAngle}deg ${currentAngle}deg`;
  });

  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        {/* Pie Chart */}
        <div
          className="w-32 h-32 rounded-full flex-shrink-0"
          style={{ background: conicGradient }}
        />
        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item, index) => {
            const value = item[valueKey] || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors[index % colors.length].bg}`} />
                  <span className="text-sm text-slate-600">{item[labelKey]}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-slate-800">{value}</span>
                  <span className="text-slate-400 ml-1">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Line Chart Component (improved with proper scaling and continuous lines)
const LineChart = ({ data, title, xKey, yKey }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <p className="text-slate-500 text-center py-8">No data available</p>
      </div>
    );
  }

  // Chart dimensions with padding
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = 400;
  const chartHeight = 200;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d[yKey] || 0), 1);
  const minValue = 0;

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - ((item[yKey] || 0) / maxValue) * innerHeight;
    return { x, y, value: item[yKey] || 0, label: item[xKey] };
  });

  // Create SVG path - ensure continuous line
  const pathD = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    : '';

  // Area path for fill
  const areaPath = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x.toFixed(2)} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`
    : '';

  // Y-axis labels
  const yAxisLabels = [0, Math.round(maxValue / 2), maxValue];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-52" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + innerHeight * (1 - percent)}
              x2={chartWidth - padding.right}
              y2={padding.top + innerHeight * (1 - percent)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels */}
          {yAxisLabels.map((val, i) => (
            <text
              key={i}
              x={padding.left - 8}
              y={padding.top + innerHeight - (val / maxValue) * innerHeight + 4}
              textAnchor="end"
              className="text-xs fill-slate-400"
              fontSize="10"
            >
              {val}
            </text>
          ))}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#lineGradient)"
              opacity="0.3"
            />
          )}

          {/* Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#0ea5e9"
                stroke="white"
                strokeWidth="2"
              />
              {/* Value label on hover - show for all points */}
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="text-xs fill-slate-600 font-medium"
                fontSize="9"
              >
                {p.value}
              </text>
            </g>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between px-10 text-xs text-slate-500">
          {data.map((item, index) => (
            <span key={index} className="truncate max-w-[50px] text-center" title={item[xKey]}>
              {item[xKey]}
            </span>
          ))}
        </div>
      </div>
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
      // Fetch submissions
      const submissionsRes = await api.get('/submissions/');
      const submissions = submissionsRes.data.results || submissionsRes.data || [];

      // Fetch forms
      const formsRes = await api.get('/forms/');
      const forms = formsRes.data.results || formsRes.data || [];

      // Filter by date range
      const now = new Date();
      const startDate = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

      const filteredSubmissions = submissions.filter(s => {
        const submittedDate = new Date(s.submitted_at || s.created_at);
        return submittedDate >= startDate;
      });

      // Debug: log first submission to see actual status format
      if (filteredSubmissions.length > 0) {
        console.log('Sample submission:', filteredSubmissions[0]);
        console.log('All statuses:', filteredSubmissions.map(s => s.status));
      }

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

      // Submissions trend (by day/week) - sorted from oldest to newest
      const trendData = {};
      const trendFormat = parseInt(dateRange) <= 14 ? 'day' : 'week';

      filteredSubmissions.forEach(s => {
        const date = new Date(s.submitted_at || s.created_at);
        let sortKey; // Use ISO date string for proper sorting
        let displayKey;

        if (trendFormat === 'day') {
          sortKey = date.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
          displayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          // Get week start
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          sortKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
          displayKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        if (!trendData[sortKey]) {
          trendData[sortKey] = { count: 0, displayKey };
        }
        trendData[sortKey].count += 1;
      });

      // Sort by date (oldest to newest) and take last 10
      const submissionsTrend = Object.entries(trendData)
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by ISO date string (ascending)
        .slice(-10) // Last 10 periods
        .map(([, { count, displayKey }]) => ({ date: displayKey, count }));

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
      // Fetch submissions data
      const submissionsRes = await api.get('/submissions/');
      const submissions = submissionsRes.data.results || submissionsRes.data || [];

      // Filter by date range
      const now = new Date();
      const startDate = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      const filteredSubmissions = submissions.filter(s => {
        const submittedDate = new Date(s.submitted_at || s.created_at);
        return submittedDate >= startDate;
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create worksheet data with title and headers
      const wsData = [
        ['AI Office Assistant - Submissions Report'],
        [`Report Period: ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}`],
        [`Generated: ${now.toLocaleString()}`],
        [], // Empty row for spacing
        ['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department'],
      ];

      // Add data rows
      filteredSubmissions.forEach(sub => {
        wsData.push([
          String(sub.id).substring(0, 8),
          sub.form_detail?.name || sub.form_name || 'N/A',
          sub.submitted_by_detail?.username || sub.submitted_by_name || 'N/A',
          sub.status || 'N/A',
          sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A',
          sub.form_detail?.department_name || 'N/A'
        ]);
      });

      // Add summary section
      wsData.push([]);
      wsData.push(['Summary']);
      wsData.push([`Total Submissions: ${filteredSubmissions.length}`]);

      // Count by status
      const statusCounts = {};
      filteredSubmissions.forEach(s => {
        const status = s.status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        wsData.push([`${status}: ${count}`]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // ID
        { wch: 30 }, // Form Name
        { wch: 18 }, // Submitted By
        { wch: 15 }, // Status
        { wch: 22 }, // Submitted At
        { wch: 20 }  // Department
      ];

      // Merge title cell across all columns
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title row
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Date range row
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Generated row
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Submissions Report');

      // Generate and download file
      const fileName = `submissions_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

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
      // Fetch submissions data
      const submissionsRes = await api.get('/submissions/');
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
      const skyBlueHover = [2, 132, 199];  // #0284C7 - Primary dark
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
      const pageHeight = doc.internal.pageSize.height;

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
                {user?.role === 'MANAGER' && user?.department && ` • ${user.department.name} Department`}
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
