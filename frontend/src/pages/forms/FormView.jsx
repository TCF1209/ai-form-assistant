import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import SubmissionViewModal from './SubmissionViewModal';

const FormView = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0
  });

  const isAdmin = user?.role === 'ADMIN';
  const isFormManager = user?.role === 'MANAGER';
  const isUser = user?.role === 'USER';

  // Permissions
  const canEditForm = isAdmin || (isFormManager && form?.department === user?.department);
  const canViewSubmissions = isAdmin || isFormManager;
  const canSubmitForm = isUser && form?.status === 'ACTIVE';
  const canApproveSubmissions = (isAdmin || isFormManager) && form?.requires_approval;

  useEffect(() => {
    fetchFormDetails();
    if (canViewSubmissions) {
      fetchSubmissions();
    }
  }, [formId]);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);

      // Fetch form details
      const formResponse = await api.get(`/forms/${formId}/`);
      setForm(formResponse.data);

      // Fetch form fields
      const fieldsResponse = await api.get(`/forms/${formId}/fields/`);
      const sortedFields = (fieldsResponse.data || []).sort((a, b) => a.order - b.order);
      setFields(sortedFields);
    } catch (error) {
      console.error('Failed to fetch form details:', error);
      if (error.response?.status === 404) {
        alert('Form not found');
        navigate('/forms');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to view this form');
        navigate('/forms');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/submissions/', {
        params: { form: formId }
      });

      // Handle different response formats
      let submissionsData = [];
      if (Array.isArray(response.data)) {
        submissionsData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        submissionsData = response.data.results;
      } else if (response.data?.submissions && Array.isArray(response.data.submissions)) {
        submissionsData = response.data.submissions;
      } else {
        console.warn('Unexpected submissions response format:', response.data);
        // If no submissions or unexpected format, use empty array
        submissionsData = [];
      }

      setSubmissions(submissionsData);

      // Calculate statistics
      const stats = {
        total: submissionsData.length,
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0
      };

      submissionsData.forEach(submission => {
        switch (submission.status) {
          case 'DRAFT':
            stats.draft++;
            break;
          case 'SUBMITTED':
            stats.submitted++;
            break;
          case 'APPROVED':
            stats.approved++;
            break;
          case 'REJECTED':
            stats.rejected++;
            break;
        }
      });

      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      // Set empty data on error
      setSubmissions([]);
      setStats({
        total: 0,
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0
      });
    }
  };

  const handleApprove = async (submissionId) => {
    try {
      await api.post(`/submissions/${submissionId}/approve/`);
      fetchSubmissions(); // Refresh submissions
      alert('Submission approved successfully');
    } catch (error) {
      alert('Failed to approve submission');
    }
  };

  const handleReject = async (submissionId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await api.post(`/submissions/${submissionId}/reject/`, {
        rejection_reason: reason
      });
      fetchSubmissions(); // Refresh submissions
      alert('Submission rejected');
    } catch (error) {
      alert('Failed to reject submission');
    }
  };

  const handleDeleteForm = async () => {
    if (!window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/forms/${formId}/`);
      alert('Form deleted successfully');
      navigate('/forms');
    } catch (error) {
      alert('Failed to delete form');
    }
  };

  const getFieldTypeDisplay = (type) => {
    const typeMap = {
      'TEXT': 'Short Text',
      'TEXTAREA': 'Long Text',
      'NUMBER': 'Number',
      'EMAIL': 'Email',
      'PHONE': 'Phone',
      'DATE': 'Date',
      'TIME': 'Time',
      'DATETIME': 'Date & Time',
      'SELECT': 'Dropdown',
      'MULTISELECT': 'Multi-Select',
      'RADIO': 'Radio Buttons',
      'CHECKBOX': 'Checkbox',
      'FILE': 'File Upload',
      'URL': 'URL',
      'RATING': 'Rating',
      'SIGNATURE': 'Signature'
    };
    return typeMap[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading form details...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Form not found</p>
          <button
            onClick={() => navigate('/forms')}
            className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/forms')}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Back to Forms
              </button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{form.name}</h1>
            <p className="text-slate-600 mt-1">{form.description}</p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className={`px-2 py-1 rounded-full ${getStatusColor(form.status)}`}>
                {form.status}
              </span>
              <span className="text-slate-500">Code: {form.code}</span>
              <span className="text-slate-500">Department: {form.department_name}</span>
              {form.requires_approval && (
                <span className="text-amber-600">✓ Requires Approval</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {canSubmitForm && (
              <button
                onClick={() => navigate(`/forms/${formId}/submit`)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Submit Form
              </button>
            )}

            {canEditForm && (
              <button
                onClick={() => navigate(`/forms/${formId}/builder`)}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"
              >
                Edit Form
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleDeleteForm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Form
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics (for managers/admins) */}
      {canViewSubmissions && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Submissions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-slate-600">{stats.draft}</div>
            <div className="text-sm text-slate-600">Drafts</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
            <div className="text-sm text-slate-600">Pending Review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-slate-600">Approved</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-slate-600">Rejected</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'details'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Details
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'fields'
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fields ({fields.length})
            </button>
            {canViewSubmissions && (
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'submissions'
                    ? 'text-sky-600 border-b-2 border-sky-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Submissions ({submissions.length})
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Form Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Form Name</label>
                <p className="mt-1 text-slate-900">{form.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <p className="mt-1 text-slate-900">{form.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Form Code</label>
                  <p className="mt-1 text-slate-900">{form.code}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Department</label>
                  <p className="mt-1 text-slate-900">{form.department_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(form.status)}`}>
                      {form.status}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Requires Approval</label>
                  <p className="mt-1 text-slate-900">
                    {form.requires_approval ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Created By</label>
                <p className="mt-1 text-slate-900">
                  {form.created_by_name} on {new Date(form.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Fields Tab */}
          {activeTab === 'fields' && (
            <div>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No fields have been added to this form yet.
                  {canEditForm && (
                    <button
                      onClick={() => navigate(`/forms/${formId}/builder`)}
                      className="block mx-auto mt-4 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"
                    >
                      Add Fields
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">#{index + 1}</span>
                            <h4 className="font-medium text-slate-900">{field.label}</h4>
                            {field.required && (
                              <span className="text-red-500 text-sm">*Required</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            <span>Type: {getFieldTypeDisplay(field.field_type)}</span>
                            {field.help_text && (
                              <span className="ml-4">Help: {field.help_text}</span>
                            )}
                          </div>
                          {field.placeholder && (
                            <div className="mt-1 text-sm text-slate-500">
                              Placeholder: {field.placeholder}
                            </div>
                          )}
                          {field.options && field.options.length > 0 && (
                            <div className="mt-1 text-sm text-slate-500">
                              Options: {field.options.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          Width: {field.width || 100}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === 'submissions' && canViewSubmissions && (
            <div>
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No submissions yet for this form.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Submitted By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {submissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {submission.submitted_by_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                              {submission.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            v{submission.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedSubmission(submission.id)}
                                className="text-sky-600 hover:text-sky-900"
                              >
                                View
                              </button>
                              {canApproveSubmissions && submission.status === 'SUBMITTED' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(submission.id)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(submission.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submission View Modal */}
      {selectedSubmission && (
        <SubmissionViewModal
          submissionId={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
};

export default FormView;