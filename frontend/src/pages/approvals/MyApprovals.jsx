import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

// Icons
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

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const SwapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CommentIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// Format time ago helper
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-sky-100 text-sky-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color] || 'bg-slate-100 text-slate-600'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    'PENDING': 'bg-amber-100 text-amber-700',
    'APPROVED': 'bg-emerald-100 text-emerald-700',
    'REJECTED': 'bg-red-100 text-red-700',
    'DELEGATED': 'bg-sky-100 text-sky-700',
    'SKIPPED': 'bg-slate-100 text-slate-700'
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusStyles[status] || statusStyles.PENDING}`}>
      {status}
    </span>
  );
};

const MyApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionModal, setActionModal] = useState({ visible: false, type: null });
  const [viewModal, setViewModal] = useState({ visible: false, data: null });
  const [comments, setComments] = useState('');
  const [delegateTo, setDelegateTo] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchApprovals();
    fetchStats();
    fetchUsers();
  }, [activeTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      let endpoint = '/workflow-approvals/';
      if (activeTab === 'pending') {
        endpoint = '/workflow-approvals/my_pending/';
      } else {
        const params = { status: activeTab.toUpperCase() };
        const response = await api.get('/workflow-approvals/', { params });
        setApprovals(response.data.results || response.data);
        return;
      }

      const response = await api.get(endpoint);
      setApprovals(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      if (error.response?.status === 403) {
        setApprovals([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/workflow-approvals/');
      const data = response.data.results || response.data;

      setStats({
        pending: data.filter(a => a.status === 'PENDING').length,
        approved: data.filter(a => a.status === 'APPROVED').length,
        rejected: data.filter(a => a.status === 'REJECTED').length,
        total: data.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      const data = response.data.results || response.data;
      setUsers(data.filter(u => u.role === 'USER' && u.id !== user.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAction = async () => {
    try {
      const approval = selectedApproval;
      const payload = {
        action: actionModal.type,
        comments: comments || ''
      };

      if (actionModal.type === 'delegate') {
        payload.delegate_to = delegateTo;
      }

      await api.post(`/workflow-approvals/${approval.id}/process/`, payload);

      const actionText = {
        approve: 'approved',
        reject: 'rejected',
        delegate: 'delegated'
      }[actionModal.type];

      setActionModal({ visible: false, type: null });
      setComments('');
      setDelegateTo('');
      setSelectedApproval(null);
      fetchApprovals();
      fetchStats();
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  const handleViewSubmission = async (approval) => {
    try {
      let instance = null;
      if (approval.workflow_instance) {
        try {
          const instanceResponse = await api.get(`/workflow-instances/${approval.workflow_instance}/`);
          instance = instanceResponse.data;
        } catch (err) {
          console.log('Could not fetch workflow instance, continuing...');
        }
      }

      let submission = null;
      if (approval.submission_detail?.id) {
        try {
          const submissionResponse = await api.get(`/submissions/${approval.submission_detail.id}/`);
          submission = submissionResponse.data;
        } catch (err) {
          submission = approval.submission_detail;
        }
      } else if (instance?.submission) {
        try {
          const submissionResponse = await api.get(`/submissions/${instance.submission}/`);
          submission = submissionResponse.data;
        } catch (err) {
          console.error('Error fetching submission from instance:', err);
        }
      }

      if (!submission) {
        return;
      }

      setViewModal({
        visible: true,
        data: {
          instance,
          submission,
          approval
        }
      });
    } catch (error) {
      console.error('Error in handleViewSubmission:', error);
    }
  };

  // Check if user is admin or form manager
  if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <ExclamationIcon className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Approval Access Restricted</h2>
            <p className="text-slate-600 mb-4">
              As an {user.role === 'ADMIN' ? 'Administrator' : 'Form Manager'},
              you manage workflows but cannot approve submissions.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Only regular users can approve workflow items.
            </p>
            <button
              onClick={() => navigate('/workflows')}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
            >
              Go to Workflow Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">My Approvals</h1>
          <p className="text-slate-600">Review and process pending approval requests</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Pending Approvals"
          value={stats.pending}
          icon={<ClockIcon />}
          color="amber"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<CheckCircleIcon />}
          color="green"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<XCircleIcon />}
          color="red"
        />
        <StatCard
          title="Total Processed"
          value={stats.total}
          icon={<FileIcon />}
          color="blue"
        />
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'text-sky-600 border-b-2 border-sky-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClockIcon />
              Pending
              {stats.pending > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'approved'
                  ? 'text-sky-600 border-b-2 border-sky-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckCircleIcon />
              Approved
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500 text-white rounded-full">
                {stats.approved}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'rejected'
                  ? 'text-sky-600 border-b-2 border-sky-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <XCircleIcon />
              Rejected
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {stats.rejected}
              </span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FileIcon className="text-slate-400" />
              </div>
              <p className="text-slate-500">No {activeTab} approvals found</p>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === 'pending' ? 'All caught up!' : `No ${activeTab} requests yet`}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Step
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {approvals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-slate-800">{approval.step_detail?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-500">
                          Step {(approval.step_detail?.order || 0) + 1} • {approval.step_detail?.type}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-slate-700">{approval.workflow_instance}</p>
                        <p className="text-xs text-slate-500">
                          Assigned: {formatTimeAgo(approval.assigned_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={approval.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {approval.due_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarIcon />
                          <span className={new Date(approval.due_date) < new Date() ? 'text-red-600' : 'text-slate-600'}>
                            {new Date(approval.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewSubmission(approval)}
                          className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                          title="View Submission"
                        >
                          <EyeIcon />
                        </button>
                        {approval.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApproval(approval);
                                setActionModal({ visible: true, type: 'approve' });
                              }}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircleIcon />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApproval(approval);
                                setActionModal({ visible: true, type: 'reject' });
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircleIcon />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApproval(approval);
                                setActionModal({ visible: true, type: 'delegate' });
                              }}
                              className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Delegate"
                            >
                              <SwapIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {approvals.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500 text-center">
              Showing {approvals.length} {activeTab} approval{approvals.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                {actionModal.type === 'approve' && <CheckCircleIcon className="text-emerald-500" />}
                {actionModal.type === 'reject' && <XCircleIcon className="text-red-500" />}
                {actionModal.type === 'delegate' && <SwapIcon className="text-sky-500" />}
                <h3 className="text-lg font-semibold text-slate-800">
                  {actionModal.type === 'approve' && 'Approve Request'}
                  {actionModal.type === 'reject' && 'Reject Request'}
                  {actionModal.type === 'delegate' && 'Delegate Request'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActionModal({ visible: false, type: null });
                  setComments('');
                  setDelegateTo('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {actionModal.type === 'delegate' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Delegate To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={delegateTo}
                    onChange={(e) => setDelegateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">Select a user to delegate to</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Comments {actionModal.type === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                  placeholder={
                    actionModal.type === 'approve'
                      ? 'Optional: Add approval comments...'
                      : actionModal.type === 'reject'
                      ? 'Required: Provide reason for rejection...'
                      : 'Optional: Add delegation notes...'
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setActionModal({ visible: false, type: null });
                  setComments('');
                  setDelegateTo('');
                }}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={
                  (actionModal.type === 'reject' && !comments) ||
                  (actionModal.type === 'delegate' && !delegateTo)
                }
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionModal.type === 'reject'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-sky-500 hover:bg-sky-600'
                }`}
              >
                {actionModal.type === 'approve' && 'Approve'}
                {actionModal.type === 'reject' && 'Reject'}
                {actionModal.type === 'delegate' && 'Delegate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Submission Modal */}
      {viewModal.visible && viewModal.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">Submission Details</h3>
              <button
                onClick={() => setViewModal({ visible: false, data: null })}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XIcon />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Submission Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-3">Submission Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Submission Number</p>
                    <p className="font-medium text-slate-800">{viewModal.data.submission?.submission_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Submitted By</p>
                    <p className="font-medium text-slate-800">{viewModal.data.submission?.submitted_by_detail?.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Form</p>
                    <p className="font-medium text-slate-800">{viewModal.data.submission?.form_detail?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Submitted At</p>
                    <p className="font-medium text-slate-800">
                      {viewModal.data.submission?.created_at && new Date(viewModal.data.submission.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Data */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-3">Form Data</h4>
                <pre className="bg-white p-3 rounded-lg text-sm overflow-auto max-h-64 border border-slate-200">
                  {JSON.stringify(viewModal.data.submission?.data, null, 2)}
                </pre>
              </div>

              {/* Workflow Progress */}
              {viewModal.data.instance?.approvals && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-800 mb-3">Workflow Progress</h4>
                  <div className="space-y-4">
                    {viewModal.data.instance.approvals.map((approval, index) => (
                      <div key={approval.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          approval.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                          approval.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                          approval.status === 'PENDING' ? 'bg-sky-100 text-sky-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {approval.status === 'APPROVED' ? <CheckCircleIcon /> :
                           approval.status === 'REJECTED' ? <XCircleIcon /> :
                           approval.status === 'PENDING' ? <ClockIcon /> :
                           <span className="text-xs">{index + 1}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{approval.step_detail?.name}</p>
                            <StatusBadge status={approval.status} />
                          </div>
                          {approval.assigned_to_detail && (
                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                              <UserIcon /> {approval.assigned_to_detail.username}
                            </p>
                          )}
                          {approval.completed_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(approval.completed_at).toLocaleString()}
                            </p>
                          )}
                          {approval.comments && (
                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                              <CommentIcon /> {approval.comments}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-slate-200">
              <button
                onClick={() => setViewModal({ visible: false, data: null })}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyApprovals;
