import React, { useState } from 'react';

/**
 * FormPreview Component
 * Renders a live preview of the form as users will see it
 */
const FormPreview = ({ formData, viewMode = 'desktop' }) => {
  const [formValues, setFormValues] = useState({});

  // Handle field value changes (for demo purposes)
  const handleFieldChange = (fieldName, value) => {
    setFormValues(prev => ({ ...prev, [fieldName]: value }));
  };

  // Check if a field should be visible based on conditions
  const isFieldVisible = (field) => {
    if (!field.conditions || field.conditions.length === 0) {
      return true;
    }

    // Evaluate conditions
    return field.conditions.every(condition => {
      const dependentValue = formValues[condition.field];
      switch (condition.operator) {
        case 'equals':
          return dependentValue === condition.value;
        case 'not_equals':
          return dependentValue !== condition.value;
        case 'contains':
          return dependentValue?.includes?.(condition.value);
        case 'is_empty':
          return !dependentValue || dependentValue === '';
        case 'is_not_empty':
          return dependentValue && dependentValue !== '';
        default:
          return true;
      }
    });
  };

  // Render field based on type
  const renderField = (field, index) => {
    if (!isFieldVisible(field)) {
      return null;
    }

    const fieldId = `preview-${field.name}-${index}`;
    const value = formValues[field.name] || '';

    const baseInputClass = `w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors ${
      viewMode === 'mobile' ? 'text-base' : 'text-sm'
    }`;

    const renderInput = () => {
      const fieldType = field.type?.toUpperCase() || field.field_type?.toUpperCase() || 'TEXT';

      switch (fieldType) {
        case 'TEXT':
        case 'SHORT_TEXT':
          return (
            <input
              type="text"
              id={fieldId}
              placeholder={field.placeholder || `Enter ${(field.label || 'value').toLowerCase()}`}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'TEXTAREA':
        case 'LONG_TEXT':
          return (
            <textarea
              id={fieldId}
              placeholder={field.placeholder || `Enter ${(field.label || 'value').toLowerCase()}`}
              className={`${baseInputClass} min-h-[100px] resize-y`}
              rows={4}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'NUMBER':
          return (
            <input
              type="number"
              id={fieldId}
              placeholder={field.placeholder || '0'}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'EMAIL':
          return (
            <input
              type="email"
              id={fieldId}
              placeholder={field.placeholder || 'email@example.com'}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'DATE':
          return (
            <input
              type="date"
              id={fieldId}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'TIME':
          return (
            <input
              type="time"
              id={fieldId}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'DATETIME':
          return (
            <input
              type="datetime-local"
              id={fieldId}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'PHONE':
          return (
            <input
              type="tel"
              id={fieldId}
              placeholder={field.placeholder || '+60 12-345 6789'}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'URL':
          return (
            <input
              type="url"
              id={fieldId}
              placeholder={field.placeholder || 'https://example.com'}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );

        case 'SELECT':
        case 'DROPDOWN':
          return (
            <select
              id={fieldId}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            >
              <option value="">Select an option...</option>
              {(field.options || []).map((option, optIndex) => (
                <option key={optIndex} value={typeof option === 'string' ? option : option.value}>
                  {typeof option === 'string' ? option : option.label}
                </option>
              ))}
            </select>
          );

        case 'MULTISELECT':
          return (
            <select
              id={fieldId}
              multiple
              className={`${baseInputClass} min-h-[100px]`}
              value={Array.isArray(value) ? value : []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                handleFieldChange(field.name, selected);
              }}
            >
              {(field.options || []).map((option, optIndex) => (
                <option key={optIndex} value={typeof option === 'string' ? option : option.value}>
                  {typeof option === 'string' ? option : option.label}
                </option>
              ))}
            </select>
          );

        case 'RADIO':
          return (
            <div className="space-y-2">
              {(field.options || []).map((option, optIndex) => {
                const optionValue = typeof option === 'string' ? option : option.value;
                const optionLabel = typeof option === 'string' ? option : option.label;
                return (
                  <label key={optIndex} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={fieldId}
                      value={optionValue}
                      checked={value === optionValue}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-slate-700">{optionLabel}</span>
                  </label>
                );
              })}
            </div>
          );

        case 'CHECKBOX':
          if (field.options && field.options.length > 0) {
            // Multiple checkboxes
            return (
              <div className="space-y-2">
                {field.options.map((option, optIndex) => {
                  const optionValue = typeof option === 'string' ? option : option.value;
                  const optionLabel = typeof option === 'string' ? option : option.label;
                  const checkedValues = Array.isArray(value) ? value : [];
                  return (
                    <label key={optIndex} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={optionValue}
                        checked={checkedValues.includes(optionValue)}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...checkedValues, optionValue]
                            : checkedValues.filter(v => v !== optionValue);
                          handleFieldChange(field.name, newValues);
                        }}
                        className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
                      />
                      <span className="text-slate-700">{optionLabel}</span>
                    </label>
                  );
                })}
              </div>
            );
          } else {
            // Single checkbox (yes/no)
            return (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value === true || value === 'true'}
                  onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                  className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
                />
                <span className="text-slate-700">{field.label}</span>
              </label>
            );
          }

        case 'FILE':
        case 'FILE_UPLOAD':
          return (
            <div className="relative">
              <input
                type="file"
                id={fieldId}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFieldChange(field.name, e.target.files?.[0]?.name || '')}
              />
              <div className={`${baseInputClass} flex items-center justify-between bg-slate-50`}>
                <span className="text-slate-500 truncate">
                  {value || 'Choose file...'}
                </span>
                <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-sm">
                  Browse
                </span>
              </div>
            </div>
          );

        case 'RATING':
          return (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleFieldChange(field.name, star)}
                  className={`text-2xl transition-colors ${
                    star <= (value || 0) ? 'text-yellow-400' : 'text-slate-300'
                  } hover:text-yellow-400`}
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
              id={fieldId}
              placeholder={field.placeholder || `Enter ${(field.label || 'value').toLowerCase()}`}
              className={baseInputClass}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          );
      }
    };

    return (
      <div
        key={`${field.name}-${index}`}
        className={`${viewMode === 'mobile' ? 'mb-4' : 'mb-5'} transition-all duration-200`}
      >
        <label
          htmlFor={fieldId}
          className={`block font-medium text-slate-700 mb-1.5 ${
            viewMode === 'mobile' ? 'text-base' : 'text-sm'
          }`}
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {renderInput()}
        {field.help_text && (
          <p className="mt-1 text-xs text-slate-500">{field.help_text}</p>
        )}
      </div>
    );
  };

  const containerClass = viewMode === 'mobile'
    ? 'max-w-[375px] mx-auto'
    : 'max-w-2xl mx-auto';

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${containerClass}`}>
      {/* Form Header */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-5 text-white">
        <h2 className={`font-bold ${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>
          {formData.name || 'Untitled Form'}
        </h2>
        {formData.description && (
          <p className={`mt-1 text-sky-100 ${viewMode === 'mobile' ? 'text-sm' : 'text-base'}`}>
            {formData.description}
          </p>
        )}
      </div>

      {/* Form Fields */}
      <div className={`${viewMode === 'mobile' ? 'p-4' : 'p-6'}`}>
        {formData.fields && formData.fields.length > 0 ? (
          <>
            {formData.fields.map((field, index) => renderField(field, index))}

            {/* Submit Button Preview */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                type="button"
                className={`w-full bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md transition-colors ${
                  viewMode === 'mobile' ? 'py-3 text-base' : 'py-2.5 text-sm'
                }`}
              >
                Submit Form
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No fields to preview</p>
          </div>
        )}
      </div>

      {/* Form Footer */}
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
        <p className="text-xs text-slate-400 text-center">
          This is a preview. Form responses are not saved.
        </p>
      </div>
    </div>
  );
};

export default FormPreview;
