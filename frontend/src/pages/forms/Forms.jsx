import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CreateFormModal from './CreateFormModal';
import FormSubmitModal from './FormSubmitModal';

const Forms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('forms'); // forms or submissions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    search: ''
  });

  // Permission checks based on roles
  const isAdmin = user?.role === 'ADMIN';
  const isFormManager = user?.role === 'MANAGER';
  const isUser = user?.role === 'USER';

  // Different permissions for different roles
  const canCreateForm = isAdmin || isFormManager; // Admin and Form Manager can create
  const canEditForm = (form) => {
    if (isAdmin) return true; // Admin can edit any form
    if (isFormManager && form?.department_id === user?.department?.id) return true; // Manager can edit own dept
    return false;
  };
  const canDeleteForm = (form) => {
    if (isAdmin) return true; // Admin can delete any form
    if (isFormManager && form?.department_id === user?.department?.id) return true; // Manager can delete from own dept
    return false;
  };
  const canSubmitForm = isUser; // Only USER role can submit forms
  const canManageSubmissions = isAdmin || isFormManager; // Admin and Manager can manage submissions

  // Fetch forms
  const fetchForms = async () => {
    try {
      setLoading(true);
      let url = '/forms/?page_size=1000';

      if (filters.status) url += `&status=${filters.status}`;
      if (filters.department) url += `&department=${filters.department}`;

      const response = await api.get(url);

      // Handle paginated response
      if (response.data.results !== undefined) {
        setForms(response.data.results);
      } else if (Array.isArray(response.data)) {
        setForms(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setForms([]);
      }
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      let url = '/submissions/?page_size=1000';

      if (filters.status) url += `&status=${filters.status}`;

      const response = await api.get(url);

      // Handle paginated response
      if (response.data.results !== undefined) {
        setSubmissions(response.data.results);
      } else if (Array.isArray(response.data)) {
        setSubmissions(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/?page_size=1000');

      if (response.data.results !== undefined) {
        setDepartments(response.data.results);
      } else if (Array.isArray(response.data)) {
        setDepartments(response.data);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchDepartments();
    if (activeTab === 'forms') {
      fetchForms();
    } else {
      fetchSubmissions();
    }
  }, [activeTab, filters]);

  // Filter forms based on search
  const filteredForms = forms.filter(form => {
    const matchesSearch =
      form.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      form.code.toLowerCase().includes(filters.search.toLowerCase()) ||
      form.description?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  // Filter submissions based on search
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch =
      submission.submission_number.toLowerCase().includes(filters.search.toLowerCase()) ||
      submission.form_name?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  // Handle form actions

  const handleDuplicateForm = async (form) => {
    const newCode = prompt('Enter a new code for the duplicated form:');
    if (!newCode) return;

    const newName = prompt('Enter a name for the duplicated form:', `${form.name} (Copy)`);
    if (!newName) return;

    try {
      await api.post(`/forms/${form.id}/duplicate/`, {
        code: newCode,
        name: newName
      });
      fetchForms();
    } catch (error) {
      console.error('Failed to duplicate form:', error);
      alert('Failed to duplicate form. The code might already exist.');
    }
  };

  const handleDeleteForm = async (form) => {
    if (!window.confirm(`Are you sure you want to delete "${form.name}"?`)) return;

    try {
      await api.delete(`/forms/${form.id}/`);
      fetchForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
      alert('Failed to delete form.');
    }
  };

  const handleSubmitForm = (form) => {
    setSelectedForm(form);
    setShowSubmitModal(true);
  };

  const handleViewSubmission = (submission) => {
    // TODO: Implement submission viewer
    console.log('View submission:', submission);
  };

  const handleApproveSubmission = async (submission) => {
    try {
      await api.post(`/submissions/${submission.id}/approve/`);
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to approve submission:', error);
      alert('Failed to approve submission.');
    }
  };

  const handleRejectSubmission = async (submission) => {
    try {
      await api.post(`/submissions/${submission.id}/reject/`);
      fetchSubmissions();
    } catch (error) {
      console.error('Failed to reject submission:', error);
      alert('Failed to reject submission.');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-slate-100 text-slate-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      IN_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Forms Management</h1>
        <p className="text-slate-600 mt-2">
          {isAdmin && 'View and delete forms from all departments'}
          {isFormManager && 'Create and manage forms in your department'}
          {isUser && 'Submit forms and track your submissions'}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('forms')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'forms'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Available Forms
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submissions'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Submissions
            {submissions.length > 0 && (
              <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                {submissions.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={activeTab === 'forms' ? 'Search forms...' : 'Search submissions...'}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="">All Status</option>
            {activeTab === 'forms' ? (
              <>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </>
            ) : (
              <>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </>
            )}
          </select>

          {activeTab === 'forms' && (
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}

          {canCreateForm && activeTab === 'forms' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
            >
              Create Form
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'forms' ? (
        // Forms List
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Fields
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredForms.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-slate-500">
                      No forms found
                    </td>
                  </tr>
                ) : (
                  filteredForms.map(form => (
                    <tr key={form.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {form.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            Code: {form.code} | Version: {form.version}
                          </div>
                          {form.description && (
                            <div className="text-xs text-slate-400 mt-1">
                              {form.description.substring(0, 100)}
                              {form.description.length > 100 && '...'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{form.department_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(form.status)}`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {form.field_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {form.submission_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {/* View button - available for all users */}
                          <button
                            onClick={() => navigate(`/forms/${form.id}`)}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            View
                          </button>

                          {/* Submit button - available for all users on ACTIVE forms */}
                          {form.status === 'ACTIVE' && canSubmitForm && (
                            <button
                              onClick={() => navigate(`/forms/${form.id}/submit`)}
                              className="text-sky-600 hover:text-sky-900"
                            >
                              Submit
                            </button>
                          )}

                          {/* Edit/Build button - only for Form Manager on their department's forms */}
                          {canEditForm(form) && (
                            <button
                              onClick={() => navigate(`/forms/${form.id}/builder`)}
                              className="text-slate-600 hover:text-slate-900"
                              title="Build/Edit form fields"
                            >
                              Build
                            </button>
                          )}

                          {/* Duplicate button - only for Form Manager on their department's forms */}
                          {canEditForm(form) && (
                            <button
                              onClick={() => handleDuplicateForm(form)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Duplicate
                            </button>
                          )}

                          {/* Delete button - Admin can delete any, Manager can delete from own dept */}
                          {canDeleteForm(form) && (
                            <button
                              onClick={() => handleDeleteForm(form)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Submissions List
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Submission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map(submission => (
                    <tr key={submission.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {submission.submission_number}
                          </div>
                          <div className="text-sm text-slate-500">
                            By: {submission.submitted_by_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{submission.form_name}</div>
                        <div className="text-xs text-slate-500">{submission.form_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(submission.status)}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString()
                          : 'Not submitted'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewSubmission(submission)}
                            className="text-sky-600 hover:text-sky-900"
                          >
                            View
                          </button>
                          {canManageSubmissions && submission.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleApproveSubmission(submission)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectSubmission(submission)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateModal && (
        <CreateFormModal
          departments={departments}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            fetchForms();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Submit Form Modal */}
      {showSubmitModal && selectedForm && (
        <FormSubmitModal
          form={selectedForm}
          onClose={() => {
            setShowSubmitModal(false);
            setSelectedForm(null);
          }}
          onSubmit={() => {
            fetchSubmissions();
            setShowSubmitModal(false);
            setSelectedForm(null);
            setActiveTab('submissions');
          }}
        />
      )}
    </div>
  );
};

export default Forms;