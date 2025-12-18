import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Icons
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const AddUserModal = ({ departments, onClose, onSave }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    employee_id: '',
    department: '',
    role: 'USER',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatingEmployeeId, setGeneratingEmployeeId] = useState(false);

  // Auto-generate username when email changes
  useEffect(() => {
    if (formData.email) {
      const username = formData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({ ...prev, username }));
    }
  }, [formData.email]);

  // Auto-generate employee ID when department changes
  useEffect(() => {
    if (formData.department && currentStep === 1) {
      generateEmployeeId();
    }
  }, [formData.department]);

  const generateEmployeeId = async () => {
    if (!formData.department) return;

    try {
      setGeneratingEmployeeId(true);
      const response = await api.get(`/users/generate_employee_id/?department_id=${formData.department}`);
      setFormData(prev => ({ ...prev, employee_id: response.data.employee_id }));
    } catch (error) {
      console.error('Failed to generate employee ID:', error);
    } finally {
      setGeneratingEmployeeId(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Real-time password validation
    if (name === 'confirmPassword' || name === 'password') {
      if (name === 'confirmPassword' && value !== formData.password) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      } else if (name === 'password' && formData.confirmPassword && value !== formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.role) newErrors.role = 'Role is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';

    // Password strength validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare data for API
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        phone_number: formData.phone_number || undefined,
        employee_id: formData.employee_id || undefined,
        department: formData.department || undefined,
        role: formData.role,
      };

      // Create new user
      await api.post('/users/', userData);

      // Show success message or handle success
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

        // If error is on step 1 fields, go back to step 1
        const step1Fields = ['first_name', 'last_name', 'email', 'username', 'department', 'role', 'employee_id'];
        const hasStep1Error = step1Fields.some(field => backendErrors[field]);
        if (hasStep1Error) {
          setCurrentStep(1);
        }
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId || d.id === parseInt(deptId));
    return dept ? dept.name : 'Not Selected';
  };

  const getRoleName = (role) => {
    const roles = {
      'USER': 'User',
      'MANAGER': 'Form Manager',
      'ADMIN': 'Admin'
    };
    return roles[role] || role;
  };

  // Step 1: Basic Information
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <UserIcon />
        <h3 className="text-lg font-medium text-slate-800">Personal Information</h3>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="e.g., John"
            className={`w-full px-4 py-2.5 border ${
              errors.first_name ? 'border-red-300 bg-red-50' : 'border-slate-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="e.g., Doe"
            className={`w-full px-4 py-2.5 border ${
              errors.last_name ? 'border-red-300 bg-red-50' : 'border-slate-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g., john.doe@company.com"
          className={`w-full px-4 py-2.5 border ${
            errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
        {formData.email && !errors.email && (
          <p className="mt-1 text-xs text-emerald-600">
            ✓ Username will be: <span className="font-medium">{formData.username}</span>
          </p>
        )}
      </div>

      {/* Phone Number (Optional) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Phone Number <span className="text-slate-400 text-xs">(Optional)</span>
        </label>
        <input
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="e.g., +60123456789"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mt-8">
        <BuildingIcon />
        <h3 className="text-lg font-medium text-slate-800">Department & Role</h3>
      </div>

      {/* Department and Role */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border ${
              errors.department ? 'border-red-300 bg-red-50' : 'border-slate-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
          {errors.department && (
            <p className="mt-1 text-sm text-red-600">{errors.department}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 border ${
              errors.role ? 'border-red-300 bg-red-50' : 'border-slate-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
          >
            <option value="USER">User</option>
            <option value="MANAGER">Form Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
        </div>
      </div>

      {/* Employee ID - Auto-generated */}
      {formData.department && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Employee ID</p>
              <p className="text-lg font-mono font-bold text-sky-600">
                {generatingEmployeeId ? (
                  <span className="text-slate-400">Generating...</span>
                ) : (
                  formData.employee_id || 'Not generated'
                )}
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
              Auto-generated
            </span>
          </div>
          {errors.employee_id && (
            <p className="mt-1 text-sm text-red-600">{errors.employee_id}</p>
          )}
        </div>
      )}
    </div>
  );

  // Step 2: Review & Create
  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-6 border border-sky-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <UserIcon />
          User Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Full Name</p>
            <p className="text-sm font-medium text-slate-800">
              {formData.first_name} {formData.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
            <p className="text-sm font-medium text-slate-800">{formData.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Username</p>
            <p className="text-sm font-medium text-sky-600 font-mono">{formData.username}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Employee ID</p>
            <p className="text-sm font-medium text-sky-600 font-mono">{formData.employee_id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Department</p>
            <p className="text-sm font-medium text-slate-800">{getDepartmentName(formData.department)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Role</p>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
              formData.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
              formData.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {getRoleName(formData.role)}
            </span>
          </div>
          {formData.phone_number && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-slate-800">{formData.phone_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <LockIcon />
        <h3 className="text-lg font-medium text-slate-800">Set Password</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className={`w-full px-4 py-2.5 pr-12 border ${
                errors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              className={`w-full px-4 py-2.5 pr-12 border ${
                errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
          {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
            <p className="mt-1 text-xs text-emerald-600">✓ Passwords match</p>
          )}
        </div>
      </div>

      {/* Password Requirements */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm font-medium text-amber-800 mb-2">Password Requirements:</p>
        <ul className="text-xs text-amber-700 space-y-1">
          <li className={formData.password.length >= 8 ? 'text-emerald-600' : ''}>
            {formData.password.length >= 8 ? '✓' : '•'} At least 8 characters
          </li>
          <li className="text-amber-700">• Share this password securely with the user</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Add New User</h2>
              <p className="text-sky-100 text-sm">Create a new user account</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {errors.general && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {/* Step 1 */}
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= 1 ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 text-slate-400'
                }`}>
                  {currentStep > 1 ? <CheckCircleIcon /> : '1'}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${currentStep >= 1 ? 'text-sky-600' : 'text-slate-400'}`}>
                    Basic Info
                  </p>
                  <p className="text-xs text-slate-500">Personal & Role</p>
                </div>
              </div>

              {/* Connector */}
              <div className={`w-24 h-1 mx-4 ${currentStep > 1 ? 'bg-sky-500' : 'bg-slate-200'}`} />

              {/* Step 2 */}
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= 2 ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 text-slate-400'
                }`}>
                  {currentStep > 2 ? <CheckCircleIcon /> : '2'}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${currentStep >= 2 ? 'text-sky-600' : 'text-slate-400'}`}>
                    Review & Create
                  </p>
                  <p className="text-xs text-slate-500">Password & Confirm</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : handleBack}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium"
            disabled={loading}
          >
            {currentStep === 1 ? 'Cancel' : '← Back'}
          </button>

          {currentStep === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium flex items-center gap-2"
            >
              Next Step
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircleIcon />
                  Create User
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
