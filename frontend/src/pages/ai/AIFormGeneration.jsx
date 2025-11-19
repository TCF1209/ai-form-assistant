import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AIFormGeneration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedForm, setGeneratedForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    fields: []
  });
  const [generationHistory, setGenerationHistory] = useState([]);

  // Role-based access control
  const isAdmin = user?.role === 'ADMIN';
  const isFormManager = user?.role === 'FORM_MANAGER';

  // Check if user has access
  useEffect(() => {
    if (!isAdmin && !isFormManager) {
      navigate('/forms');
    }
  }, [isAdmin, isFormManager, navigate]);

  // Fetch departments
  useEffect(() => {
    fetchDepartments();
    loadGenerationHistory();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/');
      // Handle different response formats
      let departmentData = [];
      if (Array.isArray(response.data)) {
        departmentData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        departmentData = response.data.results;
      } else if (response.data?.departments && Array.isArray(response.data.departments)) {
        departmentData = response.data.departments;
      }

      // If we have valid department data
      if (departmentData.length > 0) {
        if (isFormManager && user?.department) {
          // Form Manager can only see their department
          const userDeptId = typeof user.department === 'object' ? user.department.id : user.department;
          const userDept = departmentData.find(d => d.id === userDeptId);
          setDepartments(userDept ? [userDept] : []);
          setSelectedDepartment(userDeptId);
        } else if (isAdmin) {
          // Admin can see all departments
          setDepartments(departmentData);
        }
      } else {
        throw new Error('No departments found');
      }
    } catch (error) {
      console.error('Failed to fetch departments, using mock data:', error);
      // Use mock data if API fails
      const mockDepartments = [
        { id: 1, name: 'Human Resources', code: 'HR' },
        { id: 2, name: 'Finance', code: 'FIN' },
        { id: 3, name: 'IT Department', code: 'IT' },
        { id: 4, name: 'Operations', code: 'OPS' }
      ];

      if (isFormManager) {
        setDepartments([mockDepartments[0]]);
        setSelectedDepartment(1);
      } else {
        setDepartments(mockDepartments);
      }
    }
  };

  const loadGenerationHistory = () => {
    // Load from localStorage for now (mock data)
    const history = localStorage.getItem('ai_form_generation_history');
    if (history) {
      setGenerationHistory(JSON.parse(history));
    } else {
      // Set mock history
      const mockHistory = [
        {
          id: 1,
          prompt: 'Create a leave application form',
          department: 'HR',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed'
        },
        {
          id: 2,
          prompt: 'Generate expense reimbursement form with approval workflow',
          department: 'Finance',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          status: 'completed'
        }
      ];
      setGenerationHistory(mockHistory);
    }
  };

  const saveToHistory = (prompt, department, status = 'completed') => {
    const newEntry = {
      id: Date.now(),
      prompt,
      department: departments.find(d => d.id === department)?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      status
    };

    const updatedHistory = [newEntry, ...generationHistory].slice(0, 10); // Keep last 10
    setGenerationHistory(updatedHistory);
    localStorage.setItem('ai_form_generation_history', JSON.stringify(updatedHistory));
  };

  // Mock AI form generation
  const generateFormWithAI = async () => {
    setLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock generated form based on prompt
      const mockForm = generateMockForm(prompt, selectedDepartment);

      setGeneratedForm(mockForm);
      setFormData(mockForm);
      saveToHistory(prompt, selectedDepartment);
      setCurrentStep(2);
    } catch (error) {
      saveToHistory(prompt, selectedDepartment, 'failed');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock form based on prompt
  const generateMockForm = (userPrompt, deptId) => {
    const dept = departments.find(d => d.id === deptId);
    const promptLower = userPrompt.toLowerCase();

    // Different form templates based on keywords in prompt
    if (promptLower.includes('leave') || promptLower.includes('vacation')) {
      return {
        name: 'Leave Application Form',
        code: `${dept?.code || 'FORM'}_LEAVE_${Date.now()}`,
        description: 'AI-generated form for leave/vacation requests',
        department_id: deptId,
        fields: [
          { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
          { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
          { name: 'leave_type', label: 'Leave Type', type: 'select', required: true,
            options: ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Emergency Leave'] },
          { name: 'start_date', label: 'Start Date', type: 'date', required: true },
          { name: 'end_date', label: 'End Date', type: 'date', required: true },
          { name: 'reason', label: 'Reason for Leave', type: 'textarea', required: true },
          { name: 'contact_during_leave', label: 'Contact Number During Leave', type: 'text', required: false },
          { name: 'covering_person', label: 'Person Covering Duties', type: 'text', required: true }
        ]
      };
    } else if (promptLower.includes('expense') || promptLower.includes('reimbursement')) {
      return {
        name: 'Expense Reimbursement Form',
        code: `${dept?.code || 'FORM'}_EXPENSE_${Date.now()}`,
        description: 'AI-generated form for expense reimbursement requests',
        department_id: deptId,
        fields: [
          { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
          { name: 'department', label: 'Department', type: 'text', required: true },
          { name: 'expense_date', label: 'Expense Date', type: 'date', required: true },
          { name: 'expense_category', label: 'Expense Category', type: 'select', required: true,
            options: ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Training', 'Other'] },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'currency', label: 'Currency', type: 'select', required: true,
            options: ['USD', 'EUR', 'GBP', 'SGD', 'MYR'] },
          { name: 'description', label: 'Expense Description', type: 'textarea', required: true },
          { name: 'receipt_attached', label: 'Receipt Attached', type: 'checkbox', required: false },
          { name: 'payment_method', label: 'Payment Method', type: 'select', required: true,
            options: ['Company Card', 'Personal Card', 'Cash'] }
        ]
      };
    } else {
      // Generic form based on prompt
      return {
        name: `Custom Form - ${userPrompt.substring(0, 30)}`,
        code: `${dept?.code || 'FORM'}_CUSTOM_${Date.now()}`,
        description: `AI-generated form based on: "${userPrompt}"`,
        department_id: deptId,
        fields: [
          { name: 'requestor_name', label: 'Requestor Name', type: 'text', required: true },
          { name: 'department', label: 'Department', type: 'text', required: true },
          { name: 'request_date', label: 'Request Date', type: 'date', required: true },
          { name: 'request_type', label: 'Request Type', type: 'text', required: true },
          { name: 'details', label: 'Details', type: 'textarea', required: true },
          { name: 'urgency', label: 'Urgency Level', type: 'select', required: true,
            options: ['Low', 'Medium', 'High', 'Urgent'] },
          { name: 'attachments', label: 'Attachments', type: 'file', required: false },
          { name: 'additional_notes', label: 'Additional Notes', type: 'textarea', required: false }
        ]
      };
    }
  };

  const handleDeleteField = (index) => {
    const updatedFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleAddField = () => {
    const newField = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false
    };
    setFormData({ ...formData, fields: [...formData.fields, newField] });
  };

  const handleSaveForm = async () => {
    setLoading(true);
    try {
      // Mock save - in real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Navigate to form builder or forms list
      navigate('/forms');
    } catch (error) {
      console.error('Failed to save form:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPromptStep = () => (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">AI Form Generator</h1>
          <p className="text-slate-600">Describe the form you want to create, and AI will generate it for you</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* AI Icon Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-50 rounded-full mb-4">
              <svg className="w-10 h-10 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Let's Create Your Form</h2>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Department Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Department <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                value={selectedDepartment || ''}
                onChange={(e) => setSelectedDepartment(Number(e.target.value))}
                disabled={isFormManager}
              >
                <option value="">Choose a department</option>
                {(departments || []).map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Form Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Describe Your Form <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
                rows={6}
                placeholder="Example: Create a leave application form with fields for employee name, leave dates, reason, and approval workflow..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
              />
              <p className="text-sm text-slate-500 mt-1">{prompt.length}/500 characters</p>
            </div>

            {/* Tips Section */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-sky-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-sky-900 mb-1">Tips for better results:</h4>
                  <ul className="text-sm text-sky-800 space-y-1">
                    <li>• Be specific about the fields you need</li>
                    <li>• Mention if you need approval workflows</li>
                    <li>• Specify any validation requirements</li>
                    <li>• Include any special conditions or rules</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={() => {
                if (!selectedDepartment) {
                  alert('Please select a department');
                  return;
                }
                if (!prompt.trim()) {
                  alert('Please describe the form you want to create');
                  return;
                }
                setCurrentStep(1);
                generateFormWithAI();
              }}
              disabled={!selectedDepartment || !prompt.trim()}
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                selectedDepartment && prompt.trim()
                  ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Form with AI
              </span>
            </button>
          </div>
        </div>

        {/* Recent Generations */}
        {generationHistory.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Generations</h3>
            <div className="space-y-3">
              {generationHistory.slice(0, 5).map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-sky-100 text-sky-700 rounded">
                        {item.department}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {item.status === 'completed' ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Loading Animation */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-50 rounded-full mb-6 animate-pulse">
              <svg className="w-10 h-10 text-sky-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Generating Your Form...</h2>
            <p className="text-slate-600 mb-6">AI is analyzing your requirements and creating the perfect form structure</p>

            {/* Processing Info */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-slate-700 mb-2">Processing:</h4>
              <p className="text-sm text-slate-600 italic">"{prompt}"</p>
            </div>

            {/* Progress Steps */}
            <div className="space-y-3 text-left max-w-xs mx-auto">
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 mr-3">
                  ✓
                </span>
                <span className="text-sm text-slate-600">Analyzing requirements...</span>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 mr-3">
                  <span className="w-3 h-3 bg-sky-500 rounded-full animate-pulse"></span>
                </span>
                <span className="text-sm text-slate-600">Generating form fields...</span>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 mr-3">
                  ○
                </span>
                <span className="text-sm text-slate-400">Setting up validations...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Review Generated Form</h1>
            <p className="text-slate-600">AI has generated your form. Review and customize as needed.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentStep(0);
                setGeneratedForm(null);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-md transition-colors ${
                isEditing
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditing ? 'Done Editing' : 'Edit Fields'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Form Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Form Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Form Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-3 py-2 pr-24 border border-slate-300 rounded-md bg-slate-50 text-slate-500"
                  />
                  <span className="absolute right-2 top-2 inline-block px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                    Auto-generated
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Generated Fields */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Generated Fields ({formData.fields?.length || 0})</h3>
              {isEditing && (
                <button
                  onClick={handleAddField}
                  className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-md transition-colors"
                >
                  + Add Field
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {formData.fields?.map((field, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg transition-colors ${
                    isEditing ? 'border-slate-300 hover:border-sky-400' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-700">{field.label}</span>
                        {field.required && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Required
                          </span>
                        )}
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded">
                          {field.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Field name: {field.name}</p>
                      {field.options && (
                        <p className="text-xs text-slate-500 mt-1">
                          Options: {Array.isArray(field.options) ? field.options.join(', ') : 'Custom options'}
                        </p>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteField(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => navigate('/forms')}
            className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveForm}
            disabled={loading}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Form
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Steps indicator
  const renderSteps = () => (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {['Describe Form', 'AI Generation', 'Review & Save'].map((step, index) => (
          <div key={index} className="flex-1 flex items-center">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep > index
                  ? 'bg-emerald-500 text-white'
                  : currentStep === index
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > index ? '✓' : index + 1}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= index ? 'text-slate-800' : 'text-slate-500'
                }`}>
                  {step}
                </p>
                <p className="text-xs text-slate-500">
                  {index === 0 && 'Tell AI what you need'}
                  {index === 1 && 'Creating your form'}
                  {index === 2 && 'Customize and save'}
                </p>
              </div>
            </div>
            {index < 2 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                currentStep > index ? 'bg-emerald-500' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Show steps only for step 0 */}
      {currentStep === 0 && (
        <div className="bg-white border-b border-slate-200 py-6">
          {renderSteps()}
        </div>
      )}

      {/* Render current step content */}
      {currentStep === 0 && renderPromptStep()}
      {currentStep === 1 && renderGeneratingStep()}
      {currentStep === 2 && renderReviewStep()}
    </div>
  );
};

export default AIFormGeneration;