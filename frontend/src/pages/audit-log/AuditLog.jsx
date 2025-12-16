import { useState, useEffect } from 'react';
import api from '../../services/api';

// Security actions that are hidden by default
const SECURITY_ACTIONS = ['LOGIN', 'LOGOUT'];

// Business actions (always shown)
const BUSINESS_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'EXPORT'];

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Show security logs toggle
  const [showSecurityLogs, setShowSecurityLogs] = useState(false);

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
        // Deduplicate models to prevent React key warning
        setModels([...new Set(modelsRes.data)]);
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
        // Include security logs (LOGIN/LOGOUT) only if toggle is on
        if (showSecurityLogs) params.append('include_security', 'true');

        const response = await api.get(`/audit-logs/?${params.toString()}`);
        const fetchedLogs = response.data.results || response.data;

        setLogs(fetchedLogs);
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
  }, [page, filters, showSecurityLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent events
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionConfig = (action) => {
    const configs = {
      CREATE: { color: 'bg-emerald-100 text-emerald-700', icon: '➕', label: 'Created' },
      UPDATE: { color: 'bg-sky-100 text-sky-700', icon: '✏️', label: 'Updated' },
      DELETE: { color: 'bg-red-100 text-red-700', icon: '🗑️', label: 'Deleted' },
      LOGIN: { color: 'bg-indigo-100 text-indigo-700', icon: '🔓', label: 'Logged In' },
      LOGOUT: { color: 'bg-slate-100 text-slate-600', icon: '🔒', label: 'Logged Out' },
      APPROVE: { color: 'bg-emerald-100 text-emerald-700', icon: '✅', label: 'Approved' },
      REJECT: { color: 'bg-red-100 text-red-700', icon: '❌', label: 'Rejected' },
      SUBMIT: { color: 'bg-amber-100 text-amber-700', icon: '📤', label: 'Submitted' },
      EXPORT: { color: 'bg-purple-100 text-purple-700', icon: '📊', label: 'Exported' },
      VIEW: { color: 'bg-slate-100 text-slate-600', icon: '👁️', label: 'Viewed' },
    };
    return configs[action] || { color: 'bg-slate-100 text-slate-600', icon: '📋', label: action };
  };

  const getModelIcon = (model) => {
    const icons = {
      'Form': '📄',
      'FormSubmission': '📝',
      'User': '👤',
      'Workflow': '🔄',
      'WorkflowApproval': '✔️',
      'Department': '🏢',
    };
    return icons[model] || '📋';
  };

  const formatDescription = (log) => {
    const modelIcon = getModelIcon(log.model_name);
    const actionConfig = getActionConfig(log.action);

    if (log.action === 'LOGIN') {
      return `${log.user_name} logged into the system`;
    }
    if (log.action === 'LOGOUT') {
      return `${log.user_name} logged out of the system`;
    }
    if (log.object_repr) {
      return `${modelIcon} ${log.object_repr}`;
    }
    return `${modelIcon} ${log.model_name}`;
  };

  // Filter actions based on toggle
  const filteredActions = showSecurityLogs
    ? actions
    : actions.filter(a => !SECURITY_ACTIONS.includes(a.value));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
          <p className="text-slate-500 mt-1">Track important activities like form creation, submissions, and approvals</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <div className="text-sm text-slate-500">Total Activities</div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total_logs.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">➕</span>
              <div className="text-sm text-slate-500">Items Created</div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{(stats.action_breakdown?.CREATE || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <div className="text-sm text-slate-500">Approvals</div>
            </div>
            <div className="text-2xl font-bold text-sky-600 mt-1">{(stats.action_breakdown?.APPROVE || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📤</span>
              <div className="text-sm text-slate-500">Submissions</div>
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{(stats.action_breakdown?.SUBMIT || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by user, form name, or details..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">All Actions</option>
            {filteredActions.map(action => (
              <option key={action.value} value={action.value}>{action.label}</option>
            ))}
          </select>

          {/* Model Filter */}
          <select
            value={filters.model_name}
            onChange={(e) => handleFilterChange('model_name', e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">All Types</option>
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">From</span>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-500">To</span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Security Logs Toggle */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSecurityLogs}
              onChange={(e) => {
                setShowSecurityLogs(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-600">Show Security Logs</span>
            <span className="text-xs text-slate-400">(Login/Logout activities)</span>
          </label>
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
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-slate-500">No audit logs found</div>
            <div className="text-sm text-slate-400 mt-1">Activities will appear here when users perform actions</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">When</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Who</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">What</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const actionConfig = getActionConfig(log.action);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          <div className="font-medium">{formatDate(log.timestamp)}</div>
                          {new Date(log.timestamp).toLocaleDateString() !== new Date().toLocaleDateString() && (
                            <div className="text-xs text-slate-400">
                              {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                              {log.user_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{log.user_name}</div>
                              <div className="text-xs text-slate-500">{log.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${actionConfig.color}`}>
                            <span>{actionConfig.icon}</span>
                            <span>{actionConfig.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getModelIcon(log.model_name)}</span>
                            <span className="text-sm text-slate-600">{log.model_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                          <div className="truncate" title={log.object_repr || '-'}>
                            {log.object_repr || '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing {logs.length > 0 ? ((page - 1) * 20) + 1 : 0} to {Math.min(page * 20, totalCount)} of {totalCount} activities
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
                  Page {page} of {Math.max(1, totalPages)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center text-xs text-slate-400">
        This log tracks important business activities. Enable "Show Security Logs" to see login/logout history.
      </div>
    </div>
  );
};

export default AuditLog;
