import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const FormSubmission = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draft, setDraft] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (draft && !submitting) {
        saveDraft(true); // Silent save
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [draft, formData, submitting]);

  useEffect(() => {
    fetchFormDetails();
    checkExistingDraft();
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

      // Initialize form data with default values
      const initialData = {};
      sortedFields.forEach(field => {
        if (field.field_type === 'CHECKBOX') {
          initialData[field.name] = field.default_value === 'true' || field.default_value === true;
        } else if (field.field_type === 'MULTISELECT') {
          initialData[field.name] = field.default_value ? field.default_value.split(',') : [];
        } else {
          initialData[field.name] = field.default_value || '';
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Failed to fetch form details:', error);
      setErrors({ general: 'Failed to load form. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingDraft = async () => {
    try {
      const response = await api.get(`/submissions/drafts/`, {
        params: { form: formId }
      });

      if (response.data && response.data.length > 0) {
        const existingDraft = response.data[0];
        setDraft(existingDraft);
        setFormData(existingDraft.data || {});
        setLastSaved(new Date(existingDraft.updated_at));
      }
    } catch (error) {
      console.error('Failed to check for existing drafts:', error);
    }
  };

  const validateField = (field, value) => {
    const errors = [];

    // Required field validation
    if (field.required && !value) {
      errors.push(`${field.label} is required`);
    }

    // Field type specific validation
    if (value && field.validation_rules) {
      const rules = typeof field.validation_rules === 'string'
        ? JSON.parse(field.validation_rules)
        : field.validation_rules;

      switch (field.field_type) {
        case 'EMAIL':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push('Please enter a valid email address');
          }
          break;

        case 'PHONE':
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(value)) {
            errors.push('Please enter a valid phone number');
          }
          break;

        case 'URL':
          try {
            new URL(value);
          } catch {
            errors.push('Please enter a valid URL');
          }
          break;

        case 'NUMBER':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push('Please enter a valid number');
          } else {
            if (rules.min !== undefined && numValue < rules.min) {
              errors.push(`Minimum value is ${rules.min}`);
            }
            if (rules.max !== undefined && numValue > rules.max) {
              errors.push(`Maximum value is ${rules.max}`);
            }
          }
          break;

        case 'TEXT':
        case 'TEXTAREA':
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`Minimum length is ${rules.minLength} characters`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Maximum length is ${rules.maxLength} characters`);
          }
          if (rules.pattern) {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
              errors.push(rules.patternMessage || 'Invalid format');
            }
          }
          break;

        case 'DATE':
          if (rules.minDate) {
            const minDate = new Date(rules.minDate);
            const dateValue = new Date(value);
            if (dateValue < minDate) {
              errors.push(`Date must be after ${minDate.toLocaleDateString()}`);
            }
          }
          if (rules.maxDate) {
            const maxDate = new Date(rules.maxDate);
            const dateValue = new Date(value);
            if (dateValue > maxDate) {
              errors.push(`Date must be before ${maxDate.toLocaleDateString()}`);
            }
          }
          break;

        case 'FILE':
          // File validation will be handled separately
          break;
      }
    }

    return errors;
  };

  const handleFieldChange = (fieldName, value, field) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Real-time validation
    const fieldErrors = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: fieldErrors.length > 0 ? fieldErrors[0] : null
    }));
  };

  const handleFileChange = async (fieldName, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const field = fields.find(f => f.name === fieldName);
    if (!field) return;

    // Validate file
    if (field.validation_rules) {
      const rules = typeof field.validation_rules === 'string'
        ? JSON.parse(field.validation_rules)
        : field.validation_rules;

      // Check file size (in MB)
      if (rules.maxSize) {
        const maxSizeBytes = rules.maxSize * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          setValidationErrors(prev => ({
            ...prev,
            [fieldName]: `File size must not exceed ${rules.maxSize}MB`
          }));
          event.target.value = '';
          return;
        }
      }

      // Check file type
      if (rules.allowedTypes) {
        const allowedTypes = rules.allowedTypes.split(',').map(t => t.trim());
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
          setValidationErrors(prev => ({
            ...prev,
            [fieldName]: `Allowed file types: ${allowedTypes.join(', ')}`
          }));
          event.target.value = '';
          return;
        }
      }
    }

    setFiles(prev => ({
      ...prev,
      [fieldName]: file
    }));

    // Clear any existing error
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };

  const saveDraft = async (silent = false) => {
    if (!silent) setSavingDraft(true);

    try {
      const draftData = {
        form: formId,
        status: 'DRAFT',
        data: formData,
        version: draft ? draft.version + 1 : 1
      };

      let response;
      if (draft) {
        // Update existing draft
        response = await api.put(`/submissions/${draft.id}/`, draftData);
      } else {
        // Create new draft
        response = await api.post('/submissions/', draftData);
      }

      setDraft(response.data);
      setLastSaved(new Date());

      if (!silent) {
        // Show success message
        alert('Draft saved successfully');
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      if (!silent) {
        alert('Failed to save draft. Please try again.');
      }
    } finally {
      if (!silent) setSavingDraft(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    let hasErrors = false;

    fields.forEach(field => {
      const value = formData[field.name];
      const fieldErrors = validateField(field, value);

      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors[0];
        hasErrors = true;
      }

      // Check for required files
      if (field.field_type === 'FILE' && field.required && !files[field.name]) {
        errors[field.name] = `${field.label} is required`;
        hasErrors = true;
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.text-red-600');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    try {
      // Create form data for file upload
      const submitData = new FormData();
      submitData.append('form', formId);
      submitData.append('status', 'SUBMITTED');
      submitData.append('data', JSON.stringify(formData));
      submitData.append('version', draft ? draft.version + 1 : 1);

      // Append files
      Object.keys(files).forEach(fieldName => {
        if (files[fieldName]) {
          submitData.append(fieldName, files[fieldName]);
        }
      });

      const response = await api.post('/submissions/', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Delete draft if it exists
      if (draft) {
        try {
          await api.delete(`/submissions/${draft.id}/`);
        } catch (error) {
          console.error('Failed to delete draft:', error);
        }
      }

      alert('Form submitted successfully!');
      navigate('/forms/submissions');
    } catch (error) {
      console.error('Failed to submit form:', error);
      setErrors({
        general: error.response?.data?.detail || 'Failed to submit form. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = validationErrors[field.name];

    const commonProps = {
      id: field.name,
      name: field.name,
      placeholder: field.placeholder,
      className: `w-full px-3 py-2 border ${
        error ? 'border-red-300' : 'border-slate-300'
      } rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500`,
      disabled: submitting
    };

    switch (field.field_type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        return (
          <input
            type={
              field.field_type === 'EMAIL' ? 'email' :
              field.field_type === 'URL' ? 'url' :
              field.field_type === 'PHONE' ? 'tel' : 'text'
            }
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            {...commonProps}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            rows={4}
            {...commonProps}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            min={field.validation_rules?.min}
            max={field.validation_rules?.max}
            step={field.validation_rules?.step || 'any'}
            {...commonProps}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            {...commonProps}
          />
        );

      case 'TIME':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            {...commonProps}
          />
        );

      case 'DATETIME':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            {...commonProps}
          />
        );

      case 'SELECT':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            {...commonProps}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );

      case 'MULTISELECT':
        return (
          <select
            multiple
            value={value || []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              handleFieldChange(field.name, values, field);
            }}
            {...commonProps}
            size={4}
          >
            {field.options?.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );

      case 'RADIO':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value || option}
                  checked={value === (option.value || option)}
                  onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
                  disabled={submitting}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <span className="ml-2 text-sm text-slate-700">
                  {option.label || option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOX':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleFieldChange(field.name, e.target.checked, field)}
              disabled={submitting}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <span className="ml-2 text-sm text-slate-700">
              {field.placeholder || 'Check to confirm'}
            </span>
          </label>
        );

      case 'FILE':
        return (
          <div>
            <input
              type="file"
              onChange={(e) => handleFileChange(field.name, e)}
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
            />
            {files[field.name] && (
              <p className="mt-1 text-sm text-slate-600">
                Selected: {files[field.name].name}
              </p>
            )}
          </div>
        );

      case 'RATING':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => handleFieldChange(field.name, rating, field)}
                disabled={submitting}
                className={`w-10 h-10 rounded-full border-2 transition-colors ${
                  value >= rating
                    ? 'bg-yellow-400 border-yellow-500'
                    : 'bg-white border-slate-300 hover:border-slate-400'
                } ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                ★
              </button>
            ))}
          </div>
        );

      case 'SIGNATURE':
        return (
          <div className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center">
            <p className="text-sm text-slate-500">
              Signature field - Implementation pending
            </p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
            {...commonProps}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading form...</p>
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{form.name}</h1>
              {form.description && (
                <p className="mt-2 text-slate-600">{form.description}</p>
              )}
              <div className="mt-4 flex gap-4 text-sm text-slate-500">
                <span>Department: {form.department_name}</span>
                <span>•</span>
                <span>Code: {form.code}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/forms')}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Draft status */}
        {lastSaved && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              Draft saved at {lastSaved.toLocaleTimeString()} • Auto-saves every 30 seconds
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          <div className="space-y-6">
            {fields.map(field => (
              <div
                key={field.id}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  field.width === 25 ? 'lg:w-1/4' :
                  field.width === 50 ? 'lg:w-1/2' :
                  field.width === 75 ? 'lg:w-3/4' : 'w-full'
                }`}
              >
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.help_text && (
                  <p className="text-xs text-slate-500 mb-2">{field.help_text}</p>
                )}

                {renderField(field)}

                {validationErrors[field.name] && (
                  <p className="mt-1 text-sm text-red-600">
                    {validationErrors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => saveDraft()}
                disabled={savingDraft || submitting}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/forms')}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Form'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormSubmission;