import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const CreateFormModal = ({ departments, onClose, onSave }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFormManager = user?.role === 'MANAGER';

  // Initialize with Form Manager's department if applicable
  const getDepartmentId = () => {
    if (isFormManager && user?.department) {
      return typeof user.department === 'object' ? user.department.id : user.department;
    }
    return '';
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: getDepartmentId(),
    status: 'DRAFT',
    requires_approval: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill department for Form Managers
  useEffect(() => {
    if (isFormManager && user?.department) {
      const deptId = typeof user.department === 'object' ? user.department.id : user.department;
      if (deptId) {
        setFormData(prev => ({
          ...prev,
          department: deptId
        }));
      }
    }
  }, [isFormManager, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Form name is required';
    if (!formData.department) newErrors.department = 'Department is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      // Backend will auto-generate the form code
      const response = await api.post('/forms/', formData);
      const newFormId = response.data.id;

      // Close modal and navigate directly to form builder
      onClose();
      navigate(`/forms/${newFormId}/builder`);
    } catch (error) {
      if (error.response?.data) {
        const backendErrors = {};
        Object.keys(error.response.data).forEach(key => {
          if (Array.isArray(error.response.data[key])) {
            backendErrors[key] = error.response.data[key][0];
          } else {
            backendErrors[key] = error.response.data[key];
          }
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Create New Form</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            {/* Form Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Form Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Employee Leave Request"
                className={`w-full px-3 py-2 border ${
                  errors.name ? 'border-red-300' : 'border-slate-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe the purpose of this form..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Department and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={isFormManager}
                  className={`w-full px-3 py-2 border ${
                    errors.department ? 'border-red-300' : 'border-slate-300'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                    isFormManager ? 'bg-slate-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            {/* Requires Approval */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requires_approval"
                  checked={formData.requires_approval}
                  onChange={handleChange}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                />
                <span className="ml-2 text-sm text-slate-700">
                  Requires approval after submission
                </span>
              </label>
            </div>

            {/* Info Note */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <p className="text-sm text-sky-800">
                After creating the form, you can add fields and configure its structure.
                Set status to "Active" when ready for users to submit.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateFormModal;
