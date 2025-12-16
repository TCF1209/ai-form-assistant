import { useState, useEffect } from 'react';
import api from '../../services/api';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    model_name: '',
    search: '',
    start_date: '',
    end_date: '',
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Available options
  const [actions, setActions] = useState([]);
  const [models, setModels] = useState([]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [actionsRes, modelsRes] = await Promise.all([
          api.get('/audit-logs/actions/'),
          api.get('/audit-logs/models/')
        ]);
        setActions(actionsRes.data);
        setModels(modelsRes.data);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/audit-logs/stats/');
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page);
        if (filters.action) params.append('action', filters.action);
        if (filters.model_name) params.append('model_name', filters.model_name);
        if (filters.search) params.append('search', filters.search);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);

        const response = await api.get(`/audit-logs/?${params.toString()}`);
        setLogs(response.data.results || response.data);
        setTotalCount(response.data.count || response.data.length);
        setTotalPages(Math.ceil((response.data.count || response.data.length) / 20));
        setError(null);
      } catch (err) {
        setError('Failed to fetch audit logs');
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      model_name: '',
      search: '',
      start_date: '',
      end_date: '',
    });
    setPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'bg-emerald-100 text-emerald-700',
      UPDATE: 'bg-sky-100 text-sky-700',
      DELETE: 'bg-red-100 text-red-700',
      LOGIN: 'bg-indigo-100 text-indigo-700',
      LOGOUT: 'bg-slate-100 text-slate-700',
      APPROVE: 'bg-emerald-100 text-emerald-700',
      REJECT: 'bg-red-100 text-red-700',
      SUBMIT: 'bg-amber-100 text-amber-700',
      EXPORT: 'bg-purple-100 text-purple-700',
      VIEW: 'bg-slate-100 text-slate-700',
    };
    return colors[action] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
          <p className="text-slate-500 mt-1">Track all system activities and user actions</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Total Logs</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total_logs.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Create Actions</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{(stats.action_breakdown?.CREATE || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Update Actions</div>
            <div className="text-2xl font-bold text-sky-600 mt-1">{(stats.action_breakdown?.UPDATE || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Login Actions</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{(stats.action_breakdown?.LOGIN || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Actions</option>
            {actions.map(action => (
              <option key={action.value} value={action.value}>{action.label}</option>
            ))}
          </select>

          {/* Model Filter */}
          <select
            value={filters.model_name}
            onChange={(e) => handleFilterChange('model_name', e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Models</option>
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800">{log.user_name}</div>
                        <div className="text-xs text-slate-500">{log.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {log.action_display}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {log.model_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={log.object_repr}>
                        {log.object_repr || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
