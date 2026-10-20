import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import CreateFormModal from './CreateFormModal';
import FormSubmitModal from './FormSubmitModal';

// Icons
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const MoreIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Dropdown Menu Component
const ActionDropdown = ({ form, onDuplicate, onDelete, canEdit, canDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="More actions"
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
          {canEdit && (
            <button
              onClick={() => {
                setIsOpen(false);
                onDuplicate(form);
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <CopyIcon />
              Duplicate
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => {
                setIsOpen(false);
                onDelete(form);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <TrashIcon />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const Forms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
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
    if (isFormManager && String(form?.department) === String(user?.department)) return true; // Manager can edit own dept
    return false;
  };
  const canDeleteForm = (form) => {
    if (isAdmin) return true; // Admin can delete any form
    if (isFormManager && String(form?.department) === String(user?.department)) return true; // Manager can delete from own dept
    return false;
  };
  const canSubmitForm = isUser; // Only USER role can submit forms

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
    fetchForms();
  }, [filters]);

  // Filter forms based on search
  const filteredForms = forms.filter(form => {
    const matchesSearch =
      form.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      form.code.toLowerCase().includes(filters.search.toLowerCase()) ||
      form.description?.toLowerCase().includes(filters.search.toLowerCase());
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
      {/* Header - Different for User vs Manager/Admin */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          {isUser ? 'Available Forms' : 'Forms Management'}
        </h1>
        <p className="text-slate-600 mt-2">
          {isAdmin && 'View and manage forms from all departments'}
          {isFormManager && 'Create and manage forms in your department'}
          {isUser && 'Browse and submit forms to get started'}
        </p>
      </div>

      {/* Filters - Simplified for Users */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={isUser ? "Search forms..." : "Search by name, code, or description..."}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          {/* Status filter - only for Manager/Admin */}
          {!isUser && (
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          )}

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

          {canCreateForm && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
              >
                Create Form
              </button>
              <Link
                to="/ai/form-generation"
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                AI Generate
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Forms List - Different layout for User vs Manager/Admin */}
      {isUser ? (
        /* User View - Clean Card Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-slate-500">
              Loading forms...
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500">
              No forms available
            </div>
          ) : (
            filteredForms.map(form => (
              <div key={form.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {form.name}
                    </h3>
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
                      {form.department_name}
                    </span>
                  </div>
                </div>

                {form.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/forms/${form.id}`)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                  >
                    View Details
                  </button>
                  {form.status === 'ACTIVE' && (
                    <button
                      onClick={() => navigate(`/forms/${form.id}/submit`)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600 transition-colors"
                    >
                      Fill Form
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Manager/Admin View - Full Table */
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
                    <tr key={form.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {form.name}
                          </div>
                          {form.description && (
                            <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                              {form.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {form.department_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-medium rounded-full ${getStatusBadge(form.status)}`}>
                          {form.status === 'ACTIVE' ? 'Active' :
                           form.status === 'DRAFT' ? 'Draft' :
                           form.status === 'INACTIVE' ? 'Inactive' :
                           form.status === 'ARCHIVED' ? 'Archived' : form.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 font-medium">
                          {form.field_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 font-medium">
                          {form.submission_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* View button */}
                          <button
                            onClick={() => navigate(`/forms/${form.id}`)}
                            className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <EyeIcon />
                          </button>

                          {/* Edit button */}
                          {canEditForm(form) && (
                            <button
                              onClick={() => navigate(`/forms/${form.id}/builder`)}
                              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit form"
                            >
                              <EditIcon />
                            </button>
                          )}

                          {/* More actions dropdown */}
                          <ActionDropdown
                            form={form}
                            onDuplicate={handleDuplicateForm}
                            onDelete={handleDeleteForm}
                            canEdit={canEditForm(form)}
                            canDelete={canDeleteForm(form)}
                          />
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
            setShowSubmitModal(false);
            setSelectedForm(null);
          }}
        />
      )}
    </div>
  );
};

export default Forms;