import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';

// Field type definitions
const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short Text', icon: '📝' },
  { value: 'TEXTAREA', label: 'Long Text', icon: '📄' },
  { value: 'NUMBER', label: 'Number', icon: '🔢' },
  { value: 'EMAIL', label: 'Email', icon: '✉️' },
  { value: 'PHONE', label: 'Phone', icon: '📞' },
  { value: 'DATE', label: 'Date', icon: '📅' },
  { value: 'TIME', label: 'Time', icon: '⏰' },
  { value: 'DATETIME', label: 'Date & Time', icon: '📆' },
  { value: 'SELECT', label: 'Dropdown', icon: '▼' },
  { value: 'MULTISELECT', label: 'Multiple Choice', icon: '☐' },
  { value: 'RADIO', label: 'Radio Buttons', icon: '⭕' },
  { value: 'CHECKBOX', label: 'Checkbox', icon: '☑️' },
  { value: 'FILE', label: 'File Upload', icon: '📎' },
  { value: 'URL', label: 'URL', icon: '🔗' },
  { value: 'RATING', label: 'Rating', icon: '⭐' },
  { value: 'SIGNATURE', label: 'Signature', icon: '✍️' },
];

// Sortable field component
const SortableField = ({ field, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldType = FIELD_TYPES.find(t => t.value === field.field_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white border-2 rounded-lg p-4 mb-3 ${
        isDragging ? 'border-sky-500 shadow-lg' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <div
            {...listeners}
            className="cursor-move mr-3 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{fieldType?.icon}</span>
              <span className="font-medium text-slate-900">{field.label}</span>
              {field.required && <span className="text-red-500">*</span>}
            </div>
            <div className="text-sm text-slate-500">
              <span className="inline-block bg-slate-100 px-2 py-1 rounded mr-2">
                {fieldType?.label}
              </span>
              {field.placeholder && <span>Placeholder: {field.placeholder}</span>}
            </div>
            {field.help_text && (
              <div className="text-xs text-slate-400 mt-1">{field.help_text}</div>
            )}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(field)}
            className="text-slate-600 hover:text-sky-600"
            title="Edit field"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(field)}
            className="text-slate-600 hover:text-red-600"
            title="Delete field"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Main FormBuilder component
const FormBuilder = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [originalFieldIds, setOriginalFieldIds] = useState([]); // Track fields from backend
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if user can edit this form
  const canEdit = user?.role === 'ADMIN' || (user?.role === 'MANAGER' && String(form?.department) === String(user?.department));

  useEffect(() => {
    fetchForm();
    fetchFields();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/forms/${formId}/`);
      setForm(response.data);
    } catch (error) {
      console.error('Failed to fetch form:', error);
      navigate('/forms');
    }
  };

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/forms/${formId}/fields/`);
      const fetchedFields = response.data || [];
      setFields(fetchedFields);
      // Track original field IDs from backend (non-temp IDs only)
      setOriginalFieldIds(fetchedFields.map(f => String(f.id)).filter(id => !id.startsWith('temp_')));
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      setFields([]);
      setOriginalFieldIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);

      // Just reorder locally, no API call
      const newFields = arrayMove(fields, oldIndex, newIndex);
      setFields(newFields);
    }
  };

  const handleAddField = (fieldType = null) => {
    // If fieldType is provided (from field type buttons), create a field object with that type
    if (fieldType) {
      setEditingField({ field_type: fieldType });
    } else {
      setEditingField(null);
    }
    setShowFieldEditor(true);
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleDeleteField = (field) => {
    if (!window.confirm(`Delete field "${field.label}"?`)) return;

    // Simply remove from local state (no API call)
    setFields(fields.filter(f => f.id !== field.id));
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  // Sanitize a field object to only include expected properties
  const sanitizeField = (field) => {
    // Ensure options is a clean array of strings
    let cleanOptions = [];
    if (Array.isArray(field.options)) {
      cleanOptions = field.options
        .filter(opt => opt != null)
        .map(opt => {
          if (typeof opt === 'string') return opt;
          if (typeof opt === 'object' && opt !== null) {
            return String(opt.label || opt.value || '');
          }
          return String(opt);
        })
        .filter(opt => opt !== '');
    }

    // Ensure validation_rules is a clean object with only primitive values
    let cleanValidationRules = {};
    if (field.validation_rules && typeof field.validation_rules === 'object') {
      const rules = field.validation_rules;
      // Only copy primitive values
      for (const key of Object.keys(rules)) {
        const val = rules[key];
        if (val === null || val === undefined) continue;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          cleanValidationRules[key] = val;
        }
      }
    }

    return {
      id: field.id ? String(field.id) : '',
      label: String(field.label || ''),
      name: String(field.name || ''),
      field_type: String(field.field_type || 'TEXT'),
      placeholder: String(field.placeholder || ''),
      help_text: String(field.help_text || ''),
      required: field.required === true,
      width: parseInt(field.width, 10) || 100,
      default_value: String(field.default_value || ''),
      options: cleanOptions,
      validation_rules: cleanValidationRules
    };
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      // Sanitize all fields to remove any DOM references or circular structures
      const sanitizedFields = fields.map(sanitizeField);

      // Ensure department is sent as ID (in case it's an object)
      const departmentId = typeof form.department === 'object'
        ? form.department.id
        : form.department;

      // Save form details
      const formData = {
        name: form.name,
        code: form.code,
        description: form.description || '',
        department: departmentId,
        status: form.status,
        requires_approval: form.requires_approval,
        is_template: form.is_template || false
      };

      await api.put(`/forms/${formId}/`, formData);

      // Find fields that were deleted (exist in original but not in current)
      const currentFieldIds = sanitizedFields.map(f => f.id).filter(id => !id.startsWith('temp_'));
      const deletedFieldIds = originalFieldIds.filter(id => !currentFieldIds.includes(id));

      // Delete removed fields from backend
      for (const fieldId of deletedFieldIds) {
        await api.delete(`/forms/${formId}/delete_field/?field_id=${fieldId}`);
      }

      // Then add/update all fields
      for (let i = 0; i < sanitizedFields.length; i++) {
        const field = sanitizedFields[i];

        const fieldData = {
          label: field.label,
          field_type: field.field_type,
          placeholder: field.placeholder,
          help_text: field.help_text,
          required: field.required,
          width: field.width,
          default_value: field.default_value,
          options: field.options,
          validation_rules: field.validation_rules,
          order: i
        };

        const fieldId = field.id;
        if (fieldId.startsWith('temp_')) {
          // New field - create it
          await api.post(`/forms/${formId}/add_field/`, fieldData);
        } else if (fieldId) {
          // Existing field - update it
          await api.put(`/forms/${formId}/update_field/`, {
            field_id: fieldId,
            ...fieldData
          });
        }
      }

      // Show success message
      alert('Form and fields saved successfully!');

      // Reload fields to get real IDs from backend
      await fetchFields();
    } catch (error) {
      console.error('Failed to save form:', error);
      if (error.response?.data) {
        const errors = Object.entries(error.response.data)
          .map(([field, messages]) => {
            // Handle both string and array messages
            const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${field}: ${messageText}`;
          })
          .join('\n');
        alert(`Failed to save form:\n${errors}`);
      } else {
        alert('Failed to save form. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setForm({ ...form, status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-slate-600">Loading form builder...</div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You don't have permission to edit this form. Only Admins and Form Managers can edit forms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/forms')}
                className="mr-4 text-slate-600 hover:text-slate-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Form Builder</h1>
                <p className="text-sm text-slate-500">{form?.name} - {form?.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={form?.status || 'DRAFT'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <button
                onClick={handlePreview}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Preview
              </button>
              <button
                onClick={handleSaveForm}
                disabled={saving}
                className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Field Types Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-medium text-slate-900 mb-4">Field Types</h2>
              <div className="space-y-2">
                {FIELD_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleAddField(type.value)}
                    className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-md flex items-center gap-2"
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm text-slate-700">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Fields Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-slate-900">Form Fields</h2>
                <button
                  onClick={() => handleAddField()}
                  className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 text-sm"
                >
                  Add Field
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
                  <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-slate-600 mb-2">No fields added yet</p>
                  <p className="text-sm text-slate-500">
                    Click "Add Field" or drag a field type from the left panel
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        onEdit={handleEditField}
                        onDelete={handleDeleteField}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && (
        <FieldEditor
          field={editingField}
          formId={formId}
          onClose={() => setShowFieldEditor(false)}
          onSave={(newField) => {
            // Check if we're updating an existing field
            const existingField = fields.find(f => f.id === newField.id);
            if (existingField) {
              // Update existing field in the array
              setFields(fields.map(f => f.id === newField.id ? newField : f));
            } else {
              // Add new field to the array
              setFields([...fields, newField]);
            }
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}

      {/* Form Preview Modal */}
      {showPreview && (
        <FormPreview
          form={form}
          fields={fields}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

// Field Editor Modal Component
const FieldEditor = ({ field, formId, onClose, onSave }) => {
  const [fieldData, setFieldData] = useState({
    label: field?.label || '',
    field_type: field?.field_type || 'TEXT',
    placeholder: field?.placeholder || '',
    help_text: field?.help_text || '',
    required: field?.required || false,
    width: field?.width || 100,
    default_value: field?.default_value || '',
    options: field?.options || [],
    validation_rules: field?.validation_rules || {}
  });
  const handleSubmit = (e) => {
    e.preventDefault();

    // Create field object for local state
    const fieldToSave = {
      ...fieldData,
      id: field?.id || `temp_${Date.now()}`, // Temporary ID for new fields
      name: field?.name || fieldData.label.toLowerCase().replace(/\s+/g, '_'), // Generate name from label
    };

    // Call parent's onSave with the field data (no API call here)
    onSave(fieldToSave);
  };

  const needsOptions = ['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(fieldData.field_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">
              {field?.id ? 'Edit Field' : 'Add New Field'}
            </h2>
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
            {/* Field Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Field Type
              </label>
              <select
                value={fieldData.field_type}
                onChange={(e) => setFieldData({ ...fieldData, field_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                disabled={!!field?.id}
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Label */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Label *
              </label>
              <input
                type="text"
                value={fieldData.label}
                onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                required
                placeholder="Enter field label (e.g., Full Name, Email Address)"
              />
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={fieldData.placeholder}
                onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Help Text */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Help Text
              </label>
              <textarea
                value={fieldData.help_text}
                onChange={(e) => setFieldData({ ...fieldData, help_text: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {/* Options (for select/radio/checkbox) */}
            {needsOptions && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Options (one per line)
                </label>
                <textarea
                  value={fieldData.options.join('\n')}
                  onChange={(e) => setFieldData({
                    ...fieldData,
                    options: e.target.value.split('\n').filter(o => o.trim())
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Default Value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default Value
                </label>
                <input
                  type="text"
                  value={fieldData.default_value}
                  onChange={(e) => setFieldData({ ...fieldData, default_value: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              {/* Field Width */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Field Width
                </label>
                <select
                  value={fieldData.width}
                  onChange={(e) => setFieldData({ ...fieldData, width: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                </select>
              </div>
            </div>

            {/* Required Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={fieldData.required}
                onChange={(e) => setFieldData({ ...fieldData, required: e.target.checked })}
                className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
              />
              <label htmlFor="required" className="ml-2 text-sm text-slate-700">
                This field is required
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
              >
                {field?.id ? 'Update Field' : 'Add Field'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Form Preview Modal Component
const FormPreview = ({ form, fields, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{form.name}</h2>
              {form.description && (
                <p className="text-slate-600 mt-1">{form.description}</p>
              )}
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

          <div className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No fields added to this form yet
              </p>
            ) : (
              fields.map(field => (
                <div key={field.id} className={`w-${field.width === 100 ? 'full' : field.width + '%'}`}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {/* Render field based on type */}
                  {field.field_type === 'TEXTAREA' ? (
                    <textarea
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                      rows={3}
                      disabled
                    />
                  ) : field.field_type === 'SELECT' ? (
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                      disabled
                    >
                      <option>{field.placeholder || 'Select...'}</option>
                      {field.options?.map((opt, idx) => (
                        <option key={idx}>{opt}</option>
                      ))}
                    </select>
                  ) : field.field_type === 'RADIO' ? (
                    <div className="space-y-2">
                      {field.options?.map((opt, idx) => (
                        <label key={idx} className="flex items-center">
                          <input type="radio" name={field.name} disabled className="mr-2" />
                          <span className="text-sm text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.field_type === 'CHECKBOX' ? (
                    <div className="space-y-2">
                      {field.options?.map((opt, idx) => (
                        <label key={idx} className="flex items-center">
                          <input type="checkbox" disabled className="mr-2" />
                          <span className="text-sm text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.field_type === 'RATING' ? (
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <span key={star} className="text-2xl text-slate-300">⭐</span>
                      ))}
                    </div>
                  ) : (
                    <input
                      type={
                        field.field_type === 'NUMBER' ? 'number' :
                        field.field_type === 'EMAIL' ? 'email' :
                        field.field_type === 'DATE' ? 'date' :
                        field.field_type === 'TIME' ? 'time' :
                        field.field_type === 'DATETIME' ? 'datetime-local' :
                        field.field_type === 'URL' ? 'url' :
                        field.field_type === 'PHONE' ? 'tel' :
                        field.field_type === 'FILE' ? 'file' :
                        'text'
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                      disabled
                    />
                  )}

                  {field.help_text && (
                    <p className="text-xs text-slate-500 mt-1">{field.help_text}</p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;