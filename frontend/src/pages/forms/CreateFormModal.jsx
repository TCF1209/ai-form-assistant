import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const CreateFormModal = ({ departments, onClose, onSave }) => {
  const { user } = useAuth();
  const isFormManager = user?.role === 'MANAGER';

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    status: 'DRAFT',
    requires_approval: true,
    is_template: false
  });

  // Pre-fill department for Form Managers (they can only create in their department)
  useEffect(() => {
    if (isFormManager && user?.department?.id) {
      setFormData(prev => ({
        ...prev,
        department: user.department.id
      }));
    }
  }, [isFormManager, user]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Generate form code based on name and department
  const generateFormCode = () => {
    if (!formData.name) return '';

    let code = '';

    // Get department code if selected
    if (formData.department) {
      const dept = departments.find(d => d.id === formData.department);
      if (dept && dept.code) {
        code = dept.code + '_';
      }
    }

    // Add name abbreviation
    const words = formData.name.trim().split(' ');
    if (words.length === 1) {
      code += words[0].substring(0, 3).toUpperCase();
    } else {
      code += words.map(word => word.charAt(0)).join('').toUpperCase().substring(0, 4);
    }

    // Add random number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    code += randomNum;

    return code;
  };

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
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.code) newErrors.code = 'Code is required';
    if (!formData.department) newErrors.department = 'Department is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await api.post('/forms/', formData);
      onSave();
    } catch (error) {
      if (error.response?.data) {
        // Handle validation errors from backend
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Create New Form</h2>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Form Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Employee Leave Request"
                className={`w-full px-3 py-2 border ${
                  errors.name ? 'border-red-300' : 'border-slate-300'
                } rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Form Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g., HR_LEAVE_001"
                  className={`flex-1 px-3 py-2 border ${
                    errors.code ? 'border-red-300' : 'border-slate-300'
                  } rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const generatedCode = generateFormCode();
                    setFormData({ ...formData, code: generatedCode });
                  }}
                  disabled={!formData.name}
                  className="px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  title={!formData.name ? 'Enter form name first' : 'Generate code from name'}
                >
                  Generate
                </button>
              </div>
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
            </div>

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
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={isFormManager} // Form Managers can't change department
                  className={`w-full px-3 py-2 border ${
                    errors.department ? 'border-red-300' : 'border-slate-300'
                  } rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 ${
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
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

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_template"
                  checked={formData.is_template}
                  onChange={handleChange}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                />
                <span className="ml-2 text-sm text-slate-700">
                  Save as template for reuse
                </span>
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> After creating the form, you'll be able to add fields and configure the form structure. Forms must be set to "Active" status before users can submit them.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:opacity-50"
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