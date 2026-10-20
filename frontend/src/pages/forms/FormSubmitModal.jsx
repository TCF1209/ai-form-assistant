import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { EMAIL_PATTERN, PHONE_PATTERN } from '../../utils/patterns';

const FormSubmitModal = ({ form, onClose, onSubmit }) => {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchFormFields();
  }, [form]);

  const fetchFormFields = async () => {
    try {
      setLoadingFields(true);
      const response = await api.get(`/forms/${form.id}/fields/`);
      setFields(response.data || []);

      // Initialize form data with default values
      const initialData = {};
      response.data.forEach(field => {
        initialData[field.name] = field.default_value || '';
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Failed to fetch form fields:', error);
      setFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }

      // Add more validation based on field type and validation rules
      if (field.validation_rules && formData[field.name]) {
        const rules = field.validation_rules;

        if (field.field_type === 'EMAIL') {
          if (!EMAIL_PATTERN.test(formData[field.name])) {
            newErrors[field.name] = 'Invalid email address';
          }
        }

        if (field.field_type === 'PHONE') {
          if (!PHONE_PATTERN.test(formData[field.name])) {
            newErrors[field.name] = 'Invalid phone number';
          }
        }

        if (field.field_type === 'NUMBER' && rules.min !== undefined) {
          if (parseFloat(formData[field.name]) < rules.min) {
            newErrors[field.name] = `Minimum value is ${rules.min}`;
          }
        }

        if (field.field_type === 'NUMBER' && rules.max !== undefined) {
          if (parseFloat(formData[field.name]) > rules.max) {
            newErrors[field.name] = `Maximum value is ${rules.max}`;
          }
        }
      }
    });

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      // Create submission
      const submissionData = {
        form: form.id,
        status: 'SUBMITTED',
        data: formData
      };

      await api.post('/submissions/', submissionData);
      onSubmit();
    } catch (error) {
      if (error.response?.data) {
        setErrors({ general: error.response.data.detail || 'Failed to submit form' });
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleFieldChange(field.name, e.target.value),
      placeholder: field.placeholder,
      className: `w-full px-3 py-2 border ${
        errors[field.name] ? 'border-red-300' : 'border-slate-300'
      } rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500`,
      required: field.required
    };

    switch (field.field_type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        return (
          <input
            type={field.field_type === 'EMAIL' ? 'email' :
                  field.field_type === 'URL' ? 'url' :
                  field.field_type === 'PHONE' ? 'tel' : 'text'}
            {...commonProps}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            {...commonProps}
            rows={4}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            {...commonProps}
            min={field.validation_rules?.min}
            max={field.validation_rules?.max}
            step={field.validation_rules?.step || 'any'}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            {...commonProps}
          />
        );

      case 'TIME':
        return (
          <input
            type="time"
            {...commonProps}
          />
        );

      case 'DATETIME':
        return (
          <input
            type="datetime-local"
            {...commonProps}
          />
        );

      case 'SELECT':
        return (
          <select {...commonProps}>
            <option value="">Select an option</option>
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
                  checked={formData[field.name] === (option.value || option)}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
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
              name={field.name}
              checked={formData[field.name] === true || formData[field.name] === 'true'}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <span className="ml-2 text-sm text-slate-700">
              {field.placeholder || 'Check to confirm'}
            </span>
          </label>
        );

      case 'MULTISELECT':
        return (
          <select
            {...commonProps}
            multiple
            value={formData[field.name] || []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              handleFieldChange(field.name, values);
            }}
          >
            {field.options?.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );

      case 'RATING':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => handleFieldChange(field.name, rating)}
                className={`w-10 h-10 rounded-full border-2 ${
                  formData[field.name] >= rating
                    ? 'bg-yellow-400 border-yellow-500'
                    : 'bg-white border-slate-300 hover:border-slate-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        );

      default:
        return (
          <input
            type="text"
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{form.name}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {form.description || 'Please fill out this form'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loadingFields ? (
            <div className="py-8 text-center text-slate-500">
              Loading form fields...
            </div>
          ) : fields.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500 mb-4">
                This form doesn't have any fields yet.
              </p>
              <p className="text-sm text-slate-400">
                Form managers need to add fields before submissions can be made.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              )}

              {fields.map(field => (
                <div
                  key={field.id}
                  className={`${field.width === 50 ? 'w-1/2' : field.width === 75 ? 'w-3/4' : 'w-full'}`}
                >
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.help_text && (
                    <p className="text-xs text-slate-500 mb-1">{field.help_text}</p>
                  )}

                  {renderField(field)}

                  {errors[field.name] && (
                    <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  {loading ? 'Submitting...' : 'Submit Form'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormSubmitModal;