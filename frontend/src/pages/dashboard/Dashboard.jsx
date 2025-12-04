import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

// Icons
const DashboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const FormsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SubmissionIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ApprovalIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const WorkflowIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Stat Card Component
const StatCard = ({ title, value, icon, color, subtext, link }) => {
  const colorClasses = {
    sky: 'bg-sky-100 text-sky-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  const content = (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow h-full">
      <div className="flex items-center justify-between h-full">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-400 min-h-[16px]">{subtext || '\u00A0'}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.sky}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
};

// Activity Item Component
const ActivityItem = ({ icon, title, description, time, status }) => {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="p-2 bg-slate-100 rounded-full text-slate-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate">{description}</p>
      </div>
      <div className="text-right">
        {status && (
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[status.toLowerCase()] || statusColors.pending}`}>
            {status}
          </span>
        )}
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>
    </div>
  );
};

// Format time ago helper
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentForms, setRecentForms] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch common data for all roles
      const [notificationsRes, formsRes] = await Promise.all([
        api.get('/workflow-notifications/unread_count/').catch(() => ({ data: { unread_count: 0 } })),
        api.get('/forms/').catch(() => ({ data: { results: [] } })),
      ]);

      const forms = formsRes.data.results || formsRes.data || [];
      setRecentForms(forms.slice(0, 5));

      let dashboardStats = {
        unreadNotifications: notificationsRes.data.unread_count || 0,
        totalForms: forms.length,
        activeForms: forms.filter(f => f.status === 'ACTIVE').length,
      };

      if (user?.role === 'USER') {
        // User-specific data
        const [submissionsRes, approvalsRes, draftsRes] = await Promise.all([
          api.get('/submissions/', { params: { submitted_by: user.id } }).catch(() => ({ data: { results: [] } })),
          api.get('/workflow-approvals/my_pending/').catch(() => ({ data: [] })),
          api.get('/submissions/drafts/').catch(() => ({ data: [] })),
        ]);

        const submissions = submissionsRes.data.results || submissionsRes.data || [];
        const approvals = approvalsRes.data || [];
        const drafts = draftsRes.data || [];

        dashboardStats = {
          ...dashboardStats,
          mySubmissions: submissions.length,
          pendingApprovals: approvals.length,
          draftForms: drafts.length,
        };

        setRecentSubmissions(submissions.slice(0, 5));
        setPendingApprovals(approvals.slice(0, 5));

      } else if (user?.role === 'MANAGER') {
        // Form Manager-specific data
        const [submissionsRes, workflowsRes] = await Promise.all([
          api.get('/submissions/').catch(() => ({ data: { results: [] } })),
          api.get('/workflows/').catch(() => ({ data: { results: [] } })),
        ]);

        const submissions = submissionsRes.data.results || submissionsRes.data || [];
        const workflows = workflowsRes.data.results || workflowsRes.data || [];

        dashboardStats = {
          ...dashboardStats,
          totalSubmissions: submissions.length,
          pendingReview: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW').length,
          activeWorkflows: workflows.filter(w => w.status === 'ACTIVE').length,
          totalWorkflows: workflows.length,
        };

        setRecentSubmissions(submissions.slice(0, 5));

      } else if (user?.role === 'ADMIN') {
        // Admin-specific data
        const [usersRes, departmentsRes, submissionsRes, workflowsRes] = await Promise.all([
          api.get('/users/stats/').catch(() => ({ data: {} })),
          api.get('/departments/stats/').catch(() => ({ data: {} })),
          api.get('/submissions/').catch(() => ({ data: { results: [] } })),
          api.get('/workflows/').catch(() => ({ data: { results: [] } })),
        ]);

        const submissions = submissionsRes.data.results || submissionsRes.data || [];
        const workflows = workflowsRes.data.results || workflowsRes.data || [];

        dashboardStats = {
          ...dashboardStats,
          totalUsers: usersRes.data.total_users || 0,
          activeUsers: usersRes.data.active_users || 0,
          totalDepartments: departmentsRes.data.total_departments || 0,
          totalSubmissions: submissions.length,
          pendingReview: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW').length,
          activeWorkflows: workflows.filter(w => w.status === 'ACTIVE').length,
        };

        setRecentSubmissions(submissions.slice(0, 5));
      }

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'ADMIN': return 'Administrator';
      case 'MANAGER': return 'Form Manager';
      default: return 'User';
    }
  };

  // Render User Dashboard
  const renderUserDashboard = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="My Submissions"
          value={stats.mySubmissions || 0}
          icon={<SubmissionIcon />}
          color="sky"
          link="/submissions"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals || 0}
          icon={<ApprovalIcon />}
          color="amber"
          subtext="Awaiting your action"
          link="/approvals"
        />
        <StatCard
          title="Draft Forms"
          value={stats.draftForms || 0}
          icon={<ClockIcon />}
          color="slate"
          subtext="Continue where you left off"
        />
        <StatCard
          title="Notifications"
          value={stats.unreadNotifications || 0}
          icon={<BellIcon />}
          color="purple"
          link="/notifications"
        />
      </div>

      {/* Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Submissions</h2>
            <Link to="/submissions" className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1">
              View all <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => (
                <ActivityItem
                  key={submission.id}
                  icon={<FileTextIcon />}
                  title={submission.form_detail?.name || 'Form Submission'}
                  description={`Submitted to ${submission.form_detail?.department_name || 'Department'}`}
                  time={formatTimeAgo(submission.submitted_at || submission.created_at)}
                  status={submission.status}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No submissions yet</p>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Pending Approvals</h2>
            <Link to="/approvals" className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1">
              View all <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval) => (
                <ActivityItem
                  key={approval.id}
                  icon={<ApprovalIcon />}
                  title={approval.submission_detail?.form_name || approval.step_detail?.name || 'Approval Request'}
                  description={`From ${approval.submission_detail?.submitted_by || 'User'}`}
                  time={formatTimeAgo(approval.assigned_at || approval.created_at)}
                  status="Pending"
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No pending approvals</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/forms"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            <PlusIcon />
            Submit New Form
          </Link>
          <Link
            to="/approvals"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <ApprovalIcon />
            View Approvals
          </Link>
          <Link
            to="/assistant"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Smart Assistant
          </Link>
        </div>
      </div>
    </>
  );

  // Render Form Manager Dashboard
  const renderManagerDashboard = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Department Forms"
          value={stats.totalForms || 0}
          icon={<FormsIcon />}
          color="sky"
          subtext={`${stats.activeForms || 0} active`}
          link="/forms"
        />
        <StatCard
          title="All Submissions"
          value={stats.totalSubmissions || 0}
          icon={<SubmissionIcon />}
          color="emerald"
          link="/submissions/management"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview || 0}
          icon={<ClockIcon />}
          color="amber"
          subtext="Needs attention"
          link="/submissions/management"
        />
        <StatCard
          title="Active Workflows"
          value={stats.activeWorkflows || 0}
          icon={<WorkflowIcon />}
          color="purple"
          subtext={`${stats.totalWorkflows || 0} total`}
          link="/workflows"
        />
      </div>

      {/* Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Submissions</h2>
            <Link to="/submissions/management" className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1">
              View all <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => (
                <ActivityItem
                  key={submission.id}
                  icon={<FileTextIcon />}
                  title={submission.form_detail?.name || 'Form Submission'}
                  description={`By ${submission.submitted_by_detail?.full_name || 'User'}`}
                  time={formatTimeAgo(submission.submitted_at || submission.created_at)}
                  status={submission.status}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No submissions yet</p>
            )}
          </div>
        </div>

        {/* Department Forms */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Your Forms</h2>
            <Link to="/forms" className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1">
              Manage <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-2">
            {recentForms.length > 0 ? (
              recentForms.map((form) => (
                <ActivityItem
                  key={form.id}
                  icon={<FormsIcon />}
                  title={form.name}
                  description={`${form.submission_count || 0} submissions`}
                  time={formatTimeAgo(form.updated_at || form.created_at)}
                  status={form.status}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No forms created yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/forms"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            <PlusIcon />
            Create New Form
          </Link>
          <Link
            to="/submissions/management"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <SubmissionIcon />
            Review Submissions
          </Link>
          <Link
            to="/workflows"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <WorkflowIcon />
            Manage Workflows
          </Link>
        </div>
      </div>
    </>
  );

  // Render Admin Dashboard
  const renderAdminDashboard = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={<UsersIcon />}
          color="sky"
          subtext={`${stats.activeUsers || 0} active`}
          link="/users"
        />
        <StatCard
          title="Departments"
          value={stats.totalDepartments || 0}
          icon={<BuildingIcon />}
          color="purple"
          link="/users"
        />
        <StatCard
          title="All Forms"
          value={stats.totalForms || 0}
          icon={<FormsIcon />}
          color="emerald"
          subtext={`${stats.activeForms || 0} active`}
          link="/forms"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview || 0}
          icon={<ClockIcon />}
          color="amber"
          subtext={`${stats.totalSubmissions || 0} total submissions`}
          link="/submissions/management"
        />
      </div>

      {/* Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Submissions</h2>
            <Link to="/submissions/management" className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1">
              View all <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => (
                <ActivityItem
                  key={submission.id}
                  icon={<FileTextIcon />}
                  title={submission.form_detail?.name || 'Form Submission'}
                  description={`By ${submission.submitted_by_detail?.full_name || 'User'} • ${submission.form_detail?.department_name || 'Department'}`}
                  time={formatTimeAgo(submission.submitted_at || submission.created_at)}
                  status={submission.status}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No submissions yet</p>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">System Overview</h2>
            <Link to="/analytics" className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1">
              Analytics <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 rounded-full text-sky-600">
                  <UsersIcon />
                </div>
                <span className="text-sm font-medium text-slate-700">Active Users</span>
              </div>
              <span className="text-lg font-bold text-slate-800">{stats.activeUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                  <FormsIcon />
                </div>
                <span className="text-sm font-medium text-slate-700">Active Forms</span>
              </div>
              <span className="text-lg font-bold text-slate-800">{stats.activeForms || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                  <WorkflowIcon />
                </div>
                <span className="text-sm font-medium text-slate-700">Active Workflows</span>
              </div>
              <span className="text-lg font-bold text-slate-800">{stats.activeWorkflows || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                  <BellIcon />
                </div>
                <span className="text-sm font-medium text-slate-700">Unread Notifications</span>
              </div>
              <span className="text-lg font-bold text-slate-800">{stats.unreadNotifications || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/users"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            <UsersIcon />
            Manage Users
          </Link>
          <Link
            to="/forms"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <FormsIcon />
            View Forms
          </Link>
          <Link
            to="/submissions/management"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <SubmissionIcon />
            All Submissions
          </Link>
          <Link
            to="/analytics"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <ChartIcon />
            Analytics
          </Link>
        </div>
        
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <DashboardIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.first_name || user?.username || 'User'}!
            </h1>
            <p className="mt-1 text-sky-100">
              {getRoleTitle()} Dashboard • Here's your overview for today
            </p>
          </div>
        </div>
      </div>

      {/* Role-specific content */}
      {user?.role === 'ADMIN' && renderAdminDashboard()}
      {user?.role === 'MANAGER' && renderManagerDashboard()}
      {user?.role === 'USER' && renderUserDashboard()}
      {!user?.role && renderUserDashboard()}
    </div>
  );
};

export default Dashboard;
