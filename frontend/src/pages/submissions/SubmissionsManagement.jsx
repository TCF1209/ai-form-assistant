import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

// Icons
const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const WorkflowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    default: 'bg-slate-100 text-slate-600',
    blue: 'bg-sky-100 text-sky-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{title}</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-full ${colorClasses[color] || colorClasses.default}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Warning Icon for admin action
const ExclamationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    'DRAFT': { style: 'bg-slate-100 text-slate-700', label: 'Draft' },
    'SUBMITTED': { style: 'bg-sky-100 text-sky-700', label: 'Submitted' },
    'PENDING': { style: 'bg-amber-100 text-amber-700', label: 'Pending' },
    'IN_PROGRESS': { style: 'bg-amber-100 text-amber-700', label: 'In Progress' },
    'IN_REVIEW': { style: 'bg-sky-100 text-sky-700', label: 'In Review' },
    'COMPLETED': { style: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
    'APPROVED': { style: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
    'FAILED': { style: 'bg-red-100 text-red-700', label: 'Rejected' },
    'REJECTED': { style: 'bg-red-100 text-red-700', label: 'Rejected' },
    'CANCELLED': { style: 'bg-slate-100 text-slate-700', label: 'Cancelled' },
    'NEEDS_ADMIN_ACTION': { style: 'bg-orange-100 text-orange-700', label: 'Needs Admin Action' }
  };

  const config = statusConfig[status] || { style: 'bg-slate-100 text-slate-700', label: status };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${config.style}`}>
      {config.label}
    </span>
  );
};

// Progress Bar Component
const ProgressBar = ({ percent, status }) => {
  const getColor = () => {
    if (status === 'COMPLETED') return 'bg-emerald-500';
    if (status === 'FAILED') return 'bg-red-500';
    if (status === 'NEEDS_ADMIN_ACTION') return 'bg-orange-500';
    return 'bg-sky-500';
  };

  return (
    <div className="w-full bg-slate-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all duration-300 ${getColor()}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

// Select Component
const Select = ({ value, onChange, options, placeholder, className = '' }) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDownIcon />
      </div>
    </div>
  );
};

// Format date helper
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Get combined status from submission and workflow
const getCombinedStatus = (submission) => {
  // If there's a workflow, use workflow status
  if (submission.workflow_instance) {
    const workflowStatus = submission.workflow_instance.status;
    if (workflowStatus === 'COMPLETED') return 'APPROVED';
    if (workflowStatus === 'FAILED') return 'REJECTED';
    if (workflowStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (workflowStatus === 'NEEDS_ADMIN_ACTION') return 'NEEDS_ADMIN_ACTION';
    return workflowStatus;
  }
  // Otherwise use submission status
  return submission.status;
};

// Get full name from user detail
const getFullName = (userDetail) => {
  if (!userDetail) return 'Unknown';
  const fullName = userDetail.full_name?.trim();
  if (fullName) return fullName;
  // Fallback to username if no full name
  return userDetail.username || 'Unknown';
};

// Format field name to readable label (e.g., "employee_name" → "Employee Name")
const formatFieldLabel = (fieldName) => {
  if (!fieldName) return '';
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Format workflow type to user-friendly label
const formatWorkflowType = (type) => {
  const types = {
    'PARALLEL': 'Parallel',
    'SEQUENTIAL': 'Sequential',
    'CONDITIONAL': 'Conditional'
  };
  return types[type] || type;
};

// Format field value for display
const formatFieldValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const SubmissionsManagement = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    form: '',
    department: ''
  });
  const [forms, setForms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    draft: 0,
    withWorkflow: 0,
    inProgress: 0,
    completed: 0,
    needsAdminAction: 0
  });
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalCount: 0,
    pageSize: 20,
    totalPages: 1
  });
  // Admin action state
  const [adminActionModal, setAdminActionModal] = useState(false);
  const [adminActionType, setAdminActionType] = useState(null); // 'approve' or 'reject'
  const [adminComments, setAdminComments] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initial load and filter changes - reset to page 1
  useEffect(() => {
    fetchSubmissions(1);
    fetchForms();
    fetchDepartments();
    fetchStats();
  }, [filters]);

  const fetchSubmissions = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page };
      if (filters.status) params.status = filters.status;
      if (filters.form) params.form = filters.form;
      if (filters.department) params.department = filters.department;

      const response = await api.get('/submissions/', { params });
      const data = response.data.results || response.data;
      const totalCount = response.data.count || data.length;
      const pageSize = 20; // Matches backend PAGE_SIZE

      // Update pagination state
      setPagination({
        currentPage: page,
        totalCount: totalCount,
        pageSize: pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      });

      const submissionsWithWorkflow = await Promise.all(
        data.map(async (submission) => {
          try {
            const instanceResponse = await api.get('/workflow-instances/', {
              params: { submission: submission.id }
            });
            const instances = instanceResponse.data.results || instanceResponse.data;
            return {
              ...submission,
              workflow_instance: instances[0] || null
            };
          } catch (error) {
            return submission;
          }
        })
      );

      setSubmissions(submissionsWithWorkflow);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await api.get('/forms/', { params: { page_size: 1000 } });
      setForms(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/', { params: { page_size: 1000 } });
      setDepartments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Use dedicated stats endpoint that counts all submissions without pagination
      const response = await api.get('/submissions/stats/');
      setStats({
        total: response.data.total || 0,
        submitted: response.data.submitted || 0,
        draft: response.data.draft || 0,
        withWorkflow: response.data.withWorkflow || 0,
        inProgress: response.data.inProgress || 0,
        completed: response.data.completed || 0,
        needsAdminAction: response.data.needsAdminAction || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchWorkflowDetails = async (submission) => {
    try {
      if (submission.workflow_instance) {
        const response = await api.get(
          `/workflow-instances/${submission.workflow_instance.id}/`
        );
        setWorkflowInstance(response.data);
      }
    } catch (error) {
      console.error('Error fetching workflow details:', error);
    }
  };

  const handleViewDetails = async (submission) => {
    setSelectedSubmission(submission);
    await fetchWorkflowDetails(submission);
    setDetailModal(true);
  };

  const handleViewWorkflow = async (submission) => {
    setSelectedSubmission(submission);
    await fetchWorkflowDetails(submission);
    setWorkflowModal(true);
  };

  // Admin action handlers
  const handleOpenAdminAction = (actionType) => {
    setAdminActionType(actionType);
    setAdminComments('');
    setAdminActionModal(true);
  };

  const handleAdminAction = async () => {
    if (!workflowInstance || !adminActionType) return;

    setProcessingAction(true);
    try {
      const endpoint = adminActionType === 'approve'
        ? `/workflow-instances/${workflowInstance.id}/admin_approve/`
        : `/workflow-instances/${workflowInstance.id}/admin_reject/`;

      await api.post(endpoint, { comments: adminComments });

      // Close modals and refresh data
      setAdminActionModal(false);
      setDetailModal(false);
      setSelectedSubmission(null);
      setWorkflowInstance(null);
      setAdminComments('');
      setAdminActionType(null);

      // Refresh submissions and stats
      fetchSubmissions();
      fetchStats();
    } catch (error) {
      console.error('Error processing admin action:', error);
      alert(error.response?.data?.error || 'Failed to process action');
    } finally {
      setProcessingAction(false);
    }
  };

  const getProgressPercent = (instance) => {
    if (!instance || !instance.approvals) return 0;
    const total = instance.approvals.length;
    if (total === 0) return 0;
    const completed = instance.approvals.filter(
      a => a.status === 'APPROVED' || a.status === 'REJECTED'
    ).length;
    return Math.round((completed / total) * 100);
  };

  const resetFilters = () => {
    setFilters({ status: '', form: '', department: '' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Submissions Management</h1>
          <p className="text-slate-500 mt-1">Manage and monitor all form submissions</p>
        </div>
        <button
          onClick={() => fetchSubmissions(pagination.currentPage)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${user.role === 'ADMIN' ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-4`}>
        <StatCard title="Total" value={stats.total} icon={<FileIcon />} color="default" />
        <StatCard title="Submitted" value={stats.submitted} icon={<CheckCircleIcon />} color="green" />
        <StatCard title="Draft" value={stats.draft} icon={<ClockIcon />} color="yellow" />
        <StatCard title="With Workflow" value={stats.withWorkflow} icon={<WorkflowIcon />} color="blue" />
        <StatCard title="In Progress" value={stats.inProgress} icon={<RefreshIcon />} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={<CheckCircleIcon />} color="green" />
        {user.role === 'ADMIN' && (
          <StatCard title="Needs Action" value={stats.needsAdminAction} icon={<ExclamationIcon />} color="red" />
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            placeholder="Filter by Status"
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SUBMITTED', label: 'Submitted' }
            ]}
          />

          <Select
            value={filters.form}
            onChange={(value) => setFilters({ ...filters, form: value })}
            placeholder="Filter by Form"
            options={forms.map(form => ({ value: form.id, label: form.name }))}
          />

          {user.role === 'ADMIN' && (
            <Select
              value={filters.department}
              onChange={(value) => setFilters({ ...filters, department: value })}
              placeholder="Filter by Department"
              options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
            />
          )}

          <button
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshIcon />
            Reset
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileIcon className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-500 mt-4">No submissions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Form</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{submission.form_detail?.name || 'N/A'}</p>
                        <p className="text-sm text-slate-500">{submission.form_detail?.department_name || 'No Department'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserIcon />
                        <span className="text-slate-700">{getFullName(submission.submitted_by_detail)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(submission.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={getCombinedStatus(submission)} />
                          {submission.workflow_instance?.status === 'NEEDS_ADMIN_ACTION' && user.role === 'ADMIN' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600 border border-red-200">
                              <ExclamationIcon />
                              Action Required
                            </span>
                          )}
                        </div>
                        {submission.workflow_instance && ['IN_PROGRESS', 'NEEDS_ADMIN_ACTION'].includes(submission.workflow_instance.status) && (
                          <div className="w-24">
                            <ProgressBar
                              percent={getProgressPercent(submission.workflow_instance)}
                              status={submission.workflow_instance.status}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(submission)}
                          className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <EyeIcon />
                        </button>
                        {submission.workflow_instance && (
                          <button
                            onClick={() => handleViewWorkflow(submission)}
                            className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                            title="View Workflow"
                          >
                            <WorkflowIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {submissions.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} submissions
            </p>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchSubmissions(1)}
                  disabled={pagination.currentPage === 1 || loading}
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => fetchSubmissions(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchSubmissions(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages || loading}
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => fetchSubmissions(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages || loading}
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setDetailModal(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto z-10">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Submission Details</h3>
                <button
                  onClick={() => {
                    setDetailModal(false);
                    setSelectedSubmission(null);
                    setWorkflowInstance(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <XIcon />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Submission Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-800 mb-4">Submission Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Form</p>
                      <p className="font-medium text-slate-800">{selectedSubmission.form_detail?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Department</p>
                      <p className="font-medium text-slate-800">{selectedSubmission.form_detail?.department_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Submitted By</p>
                      <p className="font-medium text-slate-800">{getFullName(selectedSubmission.submitted_by_detail)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Submitted At</p>
                      <p className="font-medium text-slate-800">{formatDateTime(selectedSubmission.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Workflow Info */}
                {workflowInstance && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-800 mb-4">Workflow Status</h4>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <StatusBadge status={workflowInstance.status} />
                        <span className="text-sm text-slate-500">
                          {workflowInstance.workflow_detail?.name} ({formatWorkflowType(workflowInstance.workflow_detail?.type)})
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{getProgressPercent(workflowInstance)}%</span>
                      </div>
                      <ProgressBar
                        percent={getProgressPercent(workflowInstance)}
                        status={workflowInstance.status}
                      />
                    </div>
                  </div>
                )}

                {/* Submitted Data */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-800 mb-4">Form Responses</h4>
                  <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {selectedSubmission.data && Object.keys(selectedSubmission.data).length > 0 ? (
                      Object.entries(selectedSubmission.data).map(([key, value]) => (
                        <div key={key} className="flex px-4 py-3">
                          <div className="w-1/3 text-sm text-slate-500">
                            {formatFieldLabel(key)}
                          </div>
                          <div className="w-2/3 text-sm font-medium text-slate-800">
                            {formatFieldValue(value)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No data submitted</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                {/* Admin Action Buttons */}
                {user.role === 'ADMIN' && workflowInstance?.status === 'NEEDS_ADMIN_ACTION' && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-orange-600 text-sm">
                      <ExclamationIcon />
                      <span className="font-medium">Self-approval conflict - Admin action required</span>
                    </div>
                    <button
                      onClick={() => handleOpenAdminAction('approve')}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                    >
                      <CheckCircleIcon />
                      Approve
                    </button>
                    <button
                      onClick={() => handleOpenAdminAction('reject')}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <XCircleIcon />
                      Reject
                    </button>
                  </div>
                )}
                {!(user.role === 'ADMIN' && workflowInstance?.status === 'NEEDS_ADMIN_ACTION') && <div />}
                <button
                  onClick={() => {
                    setDetailModal(false);
                    setSelectedSubmission(null);
                    setWorkflowInstance(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {workflowModal && workflowInstance && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setWorkflowModal(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Workflow Progress</h3>
                <button
                  onClick={() => {
                    setWorkflowModal(false);
                    setSelectedSubmission(null);
                    setWorkflowInstance(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <XIcon />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Workflow Info */}
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-slate-800">{workflowInstance.workflow_detail?.name}</p>
                      <p className="text-sm text-slate-500">{workflowInstance.workflow_detail?.type}</p>
                    </div>
                    <StatusBadge status={workflowInstance.status} />
                  </div>
                  <ProgressBar
                    percent={getProgressPercent(workflowInstance)}
                    status={workflowInstance.status}
                  />
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  {workflowInstance.approvals?.map((approval, index) => (
                    <div key={approval.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          approval.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                          approval.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                          approval.status === 'PENDING' ? 'bg-sky-100 text-sky-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {approval.status === 'APPROVED' ? <CheckCircleIcon /> :
                           approval.status === 'REJECTED' ? <XCircleIcon /> :
                           <ClockIcon />}
                        </div>
                        {index < workflowInstance.approvals.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">{approval.step_detail?.name}</span>
                          <StatusBadge status={approval.status} />
                        </div>
                        {approval.assigned_to_detail && (
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <UserIcon /> Assigned to: {approval.assigned_to_detail.username}
                          </p>
                        )}
                        {approval.approved_by_detail && (
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <UserIcon /> {approval.status === 'APPROVED' ? 'Approved' : 'Rejected'} by: {approval.approved_by_detail.username}
                          </p>
                        )}
                        {approval.completed_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            Completed: {formatDateTime(approval.completed_at)}
                          </p>
                        )}
                        {approval.comments && (
                          <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                            <p className="text-sm text-slate-600">{approval.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setWorkflowModal(false);
                    setSelectedSubmission(null);
                    setWorkflowInstance(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Action Confirmation Modal */}
      {adminActionModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setAdminActionModal(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto z-10">
              {/* Modal Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 ${adminActionType === 'approve' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <h3 className={`text-lg font-semibold ${adminActionType === 'approve' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {adminActionType === 'approve' ? 'Approve Submission' : 'Reject Submission'}
                </h3>
                <button
                  onClick={() => setAdminActionModal(false)}
                  className="p-2 hover:bg-white rounded-lg"
                >
                  <XIcon />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-slate-600">
                    {adminActionType === 'approve'
                      ? 'You are about to approve this submission as an administrator. This action will bypass the self-approval conflict.'
                      : 'You are about to reject this submission as an administrator. This action cannot be undone.'}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Comments (optional)
                  </label>
                  <textarea
                    value={adminComments}
                    onChange={(e) => setAdminComments(e.target.value)}
                    placeholder={`Add a comment for this ${adminActionType === 'approve' ? 'approval' : 'rejection'}...`}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                  />
                </div>

                {selectedSubmission && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-slate-500">Submission</p>
                    <p className="font-medium text-slate-800">{selectedSubmission.form_detail?.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Submitted by: {getFullName(selectedSubmission.submitted_by_detail)}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setAdminActionModal(false)}
                  disabled={processingAction}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminAction}
                  disabled={processingAction}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    adminActionType === 'approve'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {processingAction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {adminActionType === 'approve' ? <CheckCircleIcon /> : <XCircleIcon />}
                      {adminActionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionsManagement;
