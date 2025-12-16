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

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Arrow Right Icon for step indicator
const ArrowRightIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Hourglass/Waiting Icon
const HourglassIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Step Indicator Component - Makes current step visually attractive
const StepIndicator = ({ stepInfo, workflowStatus }) => {
  // No workflow
  if (!stepInfo || stepInfo.text === '-') {
    return <span className="text-slate-400 text-sm">-</span>;
  }

  // Determine style based on workflow status
  const getStepStyle = () => {
    if (workflowStatus === 'COMPLETED') {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-500',
        text: 'text-emerald-700',
        icon: <CheckCircleIcon />
      };
    }
    if (workflowStatus === 'FAILED' || workflowStatus === 'REJECTED') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-500',
        text: 'text-red-700',
        icon: <XCircleIcon />
      };
    }
    if (workflowStatus === 'IN_PROGRESS') {
      return {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        iconBg: 'bg-sky-500',
        text: 'text-sky-700',
        icon: <ArrowRightIcon />
      };
    }
    // Pending/Default
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-500',
      text: 'text-amber-700',
      icon: <HourglassIcon />
    };
  };

  const style = getStepStyle();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${style.bg} border ${style.border}`}>
      <div className={`w-5 h-5 rounded-full ${style.iconBg} text-white flex items-center justify-center`}>
        {stepInfo.stepNumber ? (
          <span className="text-xs font-bold">{stepInfo.stepNumber}</span>
        ) : (
          <span className="w-3 h-3">{style.icon}</span>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${style.text}`}>{stepInfo.text}</p>
        {stepInfo.subtext && (
          <p className="text-xs text-slate-500">{stepInfo.subtext}</p>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    default: 'bg-slate-100 text-slate-600',
    blue: 'bg-sky-100 text-sky-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.default}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Status Badge Component with user-friendly labels
const StatusBadge = ({ status }) => {
  const statusStyles = {
    'DRAFT': 'bg-slate-100 text-slate-700',
    'SUBMITTED': 'bg-sky-100 text-sky-700',
    'PENDING': 'bg-amber-100 text-amber-700',
    'IN_PROGRESS': 'bg-sky-100 text-sky-700',
    'IN_REVIEW': 'bg-sky-100 text-sky-700',
    'COMPLETED': 'bg-emerald-100 text-emerald-700',
    'APPROVED': 'bg-emerald-100 text-emerald-700',
    'FAILED': 'bg-red-100 text-red-700',
    'REJECTED': 'bg-red-100 text-red-700',
    'CANCELLED': 'bg-slate-100 text-slate-700'
  };

  // User-friendly status labels
  const statusLabels = {
    'DRAFT': 'Draft',
    'SUBMITTED': 'Submitted',
    'PENDING': 'Pending',
    'IN_PROGRESS': 'In Progress',
    'IN_REVIEW': 'In Review',
    'COMPLETED': 'Completed',
    'APPROVED': 'Approved',
    'FAILED': 'Failed',
    'REJECTED': 'Rejected',
    'CANCELLED': 'Cancelled'
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusStyles[status] || statusStyles.DRAFT}`}>
      {statusLabels[status] || status}
    </span>
  );
};

// Progress Bar Component
const ProgressBar = ({ percent, status }) => {
  const getColor = () => {
    if (status === 'COMPLETED') return 'bg-emerald-500';
    if (status === 'FAILED') return 'bg-red-500';
    return 'bg-sky-500';
  };

  return (
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${getColor()}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

// Format date helper
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const MySubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/submissions/');
      const data = response.data.results || response.data;

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

  const fetchStats = async () => {
    try {
      const response = await api.get('/submissions/');
      const data = response.data.results || response.data;

      const instancesResponse = await api.get('/workflow-instances/');
      const instances = instancesResponse.data.results || instancesResponse.data;

      const userInstances = instances.filter(i =>
        data.some(s => s.id === i.submission)
      );

      setStats({
        total: data.length,
        inProgress: userInstances.filter(i => i.status === 'IN_PROGRESS').length,
        completed: userInstances.filter(i => i.status === 'COMPLETED').length,
        rejected: userInstances.filter(i => i.status === 'FAILED').length
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

  const getProgressPercent = (instance) => {
    if (!instance || !instance.approvals) return 0;
    const total = instance.approvals.length;
    if (total === 0) return 0;
    const completed = instance.approvals.filter(
      a => a.status === 'APPROVED' || a.status === 'REJECTED'
    ).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Submissions</h1>
          <p className="text-slate-500 mt-1">Track your form submissions and their approval status</p>
        </div>
        <button
          onClick={fetchSubmissions}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Submissions"
          value={stats.total}
          icon={<FileIcon />}
          color="default"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<ClockIcon />}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircleIcon />}
          color="green"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<XCircleIcon />}
          color="red"
        />
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Submissions History</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileIcon className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-500 mt-4">No submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Form</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Step</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {submissions.map((submission) => {
                  // Helper to get current step info
                  const getCurrentStepInfo = () => {
                    const instance = submission.workflow_instance;
                    if (!instance) return null;

                    // If workflow has current step, show it
                    if (instance.current_step_detail) {
                      return {
                        text: instance.current_step_detail.name,
                        stepNumber: instance.current_step_detail.order + 1,
                        subtext: null
                      };
                    }

                    // If completed, show "All steps completed"
                    if (instance.status === 'COMPLETED') {
                      return { text: 'Completed', stepNumber: null, subtext: null };
                    }

                    // If failed/rejected, show last step from approvals
                    if (instance.status === 'FAILED' && instance.approvals?.length > 0) {
                      const lastApproval = instance.approvals[instance.approvals.length - 1];
                      return {
                        text: lastApproval.step_detail?.name || 'Rejected',
                        stepNumber: null,
                        subtext: null
                      };
                    }

                    // Pending - waiting to start
                    return { text: 'Awaiting Review', stepNumber: null, subtext: null };
                  };

                  const stepInfo = getCurrentStepInfo();
                  const workflowStatus = submission.workflow_instance?.status;

                  return (
                    <tr key={submission.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{submission.form_detail?.name || 'N/A'}</p>
                          <p className="text-sm text-slate-500">{submission.form_detail?.department_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-slate-800">{formatDate(submission.created_at)}</p>
                          <p className="text-sm text-slate-500">{formatTime(submission.created_at)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {submission.workflow_instance ? (
                          <div className="space-y-2">
                            <StatusBadge status={submission.workflow_instance.status} />
                            <ProgressBar
                              percent={getProgressPercent(submission.workflow_instance)}
                              status={submission.workflow_instance.status}
                            />
                          </div>
                        ) : (
                          <StatusBadge status={submission.status} />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StepIndicator stepInfo={stepInfo} workflowStatus={workflowStatus} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(submission)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors text-sm font-medium"
                          title="View Details"
                        >
                          <EyeIcon />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {submissions.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">Total {submissions.length} submissions</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setDetailModal(false)} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-auto z-10">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg">
                    <FileIcon className="text-sky-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Submission Details</h3>
                </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Submission Number</p>
                      <p className="font-medium text-slate-800">{selectedSubmission.submission_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Form</p>
                      <p className="font-medium text-slate-800">{selectedSubmission.form_detail?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <StatusBadge status={selectedSubmission.status} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Submitted At</p>
                      <p className="font-medium text-slate-800">
                        {formatDate(selectedSubmission.created_at)} {formatTime(selectedSubmission.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submitted Data */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-800 mb-4">Submitted Data</h4>
                  <pre className="bg-white p-4 rounded-lg text-sm overflow-auto max-h-48 border border-slate-200">
                    {JSON.stringify(selectedSubmission.data, null, 2)}
                  </pre>
                </div>

                {/* Workflow Progress */}
                {workflowInstance && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-800 mb-4">Workflow Progress</h4>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">{workflowInstance.workflow_detail?.name}</span>
                        <StatusBadge status={workflowInstance.status} />
                      </div>
                      <ProgressBar
                        percent={getProgressPercent(workflowInstance)}
                        status={workflowInstance.status}
                      />
                    </div>

                    {/* Approval Timeline */}
                    <div className="space-y-4 mt-6">
                      {workflowInstance.approvals?.map((approval, index) => (
                        <div key={approval.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
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
                              <div className="w-0.5 h-full bg-slate-200 my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{approval.step_detail?.name}</span>
                              <StatusBadge status={approval.status} />
                            </div>
                            {approval.assigned_to_detail && (
                              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                <UserIcon /> {approval.assigned_to_detail.username}
                              </p>
                            )}
                            {approval.completed_at && (
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDate(approval.completed_at)} {formatTime(approval.completed_at)}
                              </p>
                            )}
                            {approval.comments && (
                              <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-slate-200">
                                {approval.comments}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
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
    </div>
  );
};

export default MySubmissions;
