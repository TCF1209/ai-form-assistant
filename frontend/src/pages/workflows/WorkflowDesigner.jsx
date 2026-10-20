import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import WorkflowDiagram from './WorkflowDiagram';

// Icons
const ForkIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DragIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const BranchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

// Step type badge colors
const getStepTypeStyles = (type) => {
  const styles = {
    'APPROVAL': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircleIcon /> },
    'REVIEW': { bg: 'bg-sky-100', text: 'text-sky-700', icon: <InfoIcon /> },
    'NOTIFICATION': { bg: 'bg-amber-100', text: 'text-amber-700', icon: <BellIcon /> },
    'CONDITIONAL': { bg: 'bg-purple-100', text: 'text-purple-700', icon: <BranchIcon /> },
    'SYSTEM': { bg: 'bg-slate-100', text: 'text-slate-700', icon: <SettingsIcon /> }
  };
  return styles[type] || styles['APPROVAL'];
};

// User-friendly step type labels
const getStepTypeLabel = (type) => {
  const labels = {
    'APPROVAL': 'Approval',
    'REVIEW': 'Review',
    'NOTIFICATION': 'Notification',
    'CONDITIONAL': 'Conditional',
    'SYSTEM': 'System Action'
  };
  return labels[type] || type;
};

// Approval mode labels
const getApprovalModeLabel = (mode) => {
  const labels = {
    'ALL': 'All',
    'MAJORITY': 'Majority',
    'ANY': 'Any One'
  };
  return labels[mode] || mode;
};

const getApprovalModeColor = (mode) => {
  const colors = {
    'ALL': 'bg-purple-100 text-purple-700',
    'MAJORITY': 'bg-indigo-100 text-indigo-700',
    'ANY': 'bg-teal-100 text-teal-700'
  };
  return colors[mode] || 'bg-slate-100 text-slate-700';
};

// Sortable Step Component
const SortableStep = ({ step, index, onEdit, onDelete, isReadOnly, users }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id || `temp-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const typeStyles = getStepTypeStyles(step.step_type);

  // Get approver names for multi-approver display
  const getApproverNames = () => {
    // Check for multi-approver data first (from API response)
    if (step.assigned_users_detail && step.assigned_users_detail.length > 0) {
      return step.assigned_users_detail.map(u => u.full_name || u.username);
    }
    // Check for approvers array (local state)
    if (step.approvers && step.approvers.length > 0 && users) {
      return step.approvers.map(userId => {
        const user = users.find(u => String(u.id) === String(userId));
        return user ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) : '';
      }).filter(Boolean);
    }
    // Fallback to single assigned_user (backward compatibility)
    if (step.assigned_user && users) {
      const user = users.find(u => String(u.id) === String(step.assigned_user));
      if (user) {
        return [user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username];
      }
    }
    return [];
  };

  const approverNames = getApproverNames();
  const approvalMode = step.approval_mode || 'ALL';

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className={`bg-white border border-slate-200 rounded-lg p-3 ${!isReadOnly ? 'cursor-move' : ''} hover:border-sky-300 transition-colors`}>
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <div {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600 cursor-grab">
              <DragIcon />
            </div>
          )}

          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </div>

          <div className={`p-1.5 rounded ${typeStyles.bg} ${typeStyles.text}`}>
            {typeStyles.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 truncate">{step.name}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeStyles.bg} ${typeStyles.text}`}>
                {getStepTypeLabel(step.step_type)}
              </span>
              {/* Approval Mode Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getApprovalModeColor(approvalMode)}`}>
                {getApprovalModeLabel(approvalMode)}
              </span>
              {/* Approvers Badge */}
              {approverNames.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">
                  <UsersIcon />
                  {approverNames.length === 1 ? approverNames[0] : `${approverNames.length} approvers`}
                </span>
              )}
              {step.time_limit_hours && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  <ClockIcon /> {step.time_limit_hours}h limit
                </span>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(index)}
                className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded transition-colors"
                title="Edit Step"
              >
                <SettingsIcon />
              </button>
              <button
                onClick={() => onDelete(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete Step"
              >
                <DeleteIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Small X icon for removing approvers
const SmallXIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Step Editor Component with Multi-Approver Support
const StepEditor = ({ step, onSave, onCancel, users }) => {
  const [formData, setFormData] = useState({
    name: step?.name || '',
    step_type: 'APPROVAL',
    approval_mode: step?.approval_mode || 'ALL',
    approvers: step?.approvers || [],
    is_required: true,
    can_skip: false
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (step) {
      // Get approvers from either approvers array or assigned_users_detail (API response)
      let approvers = step.approvers || [];
      if (approvers.length === 0 && step.assigned_users_detail && step.assigned_users_detail.length > 0) {
        approvers = step.assigned_users_detail.map(u => u.id);
      }
      // Fallback to single assigned_user for backward compatibility
      if (approvers.length === 0 && step.assigned_user) {
        approvers = [step.assigned_user];
      }

      setFormData({
        name: step.name || '',
        step_type: 'APPROVAL',
        approval_mode: step.approval_mode || 'ALL',
        approvers: approvers,
        is_required: true,
        can_skip: false
      });
    }
  }, [step]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const addApprover = (userId) => {
    if (userId && !formData.approvers.includes(userId)) {
      handleChange('approvers', [...formData.approvers, userId]);
    }
  };

  const removeApprover = (userId) => {
    handleChange('approvers', formData.approvers.filter(id => id !== userId));
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Step name is required';
    }
    if (formData.approvers.length === 0) {
      newErrors.approvers = 'Please add at least one approver';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  // Filter out admins and form managers from user list
  const eligibleUsers = users.filter(u => u.role === 'USER');

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Step Configuration</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Step Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Step Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
              errors.name ? 'border-red-300' : 'border-slate-300'
            }`}
            placeholder="e.g., Manager Approval"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Approval Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Approval Mode <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'ALL', label: 'All Must Approve', desc: 'Every approver must approve', selectedClass: 'border-purple-500 bg-purple-50', textClass: 'text-purple-700' },
              { value: 'MAJORITY', label: 'Majority', desc: 'More than 50% must approve', selectedClass: 'border-indigo-500 bg-indigo-50', textClass: 'text-indigo-700' },
              { value: 'ANY', label: 'Any One', desc: 'One approval is enough', selectedClass: 'border-teal-500 bg-teal-50', textClass: 'text-teal-700' }
            ].map(mode => (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleChange('approval_mode', mode.value)}
                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                  formData.approval_mode === mode.value
                    ? mode.selectedClass
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`font-medium text-sm ${formData.approval_mode === mode.value ? mode.textClass : 'text-slate-800'}`}>
                  {mode.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Select Approvers */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Approvers <span className="text-red-500">*</span>
          </label>

          {/* Selected Approvers Tags */}
          <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
            {formData.approvers.map(userId => {
              const user = eligibleUsers.find(u => String(u.id) === String(userId));
              if (!user) return null;
              const displayName = user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username;
              return (
                <span
                  key={userId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded-full text-sm"
                >
                  {displayName}
                  <button
                    type="button"
                    onClick={() => removeApprover(userId)}
                    className="text-sky-500 hover:text-sky-700 ml-1"
                  >
                    <SmallXIcon />
                  </button>
                </span>
              );
            })}
            {formData.approvers.length === 0 && (
              <span className="text-sm text-slate-400 italic">No approvers selected</span>
            )}
          </div>

          {/* Add Approver Dropdown */}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addApprover(e.target.value);
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
              errors.approvers ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            <option value="">+ Add approver...</option>
            {eligibleUsers
              .filter(u => !formData.approvers.includes(String(u.id)) && !formData.approvers.includes(u.id))
              .map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username})
                </option>
              ))}
          </select>
          {errors.approvers && <p className="mt-1 text-sm text-red-500">{errors.approvers}</p>}
          <p className="mt-1 text-xs text-slate-500">
            Select one or more approvers. Only regular users can be approvers.
          </p>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Save Step
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkflowDesigner = ({ visible, onClose, workflow, forms }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [currentStep, setCurrentStep] = useState(0); // Wizard step (0: Basic Info, 1: Add Steps, 2: Review)
  const [existingWorkflows, setExistingWorkflows] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, index: null });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form data (code is auto-generated by backend)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    form: '',
    workflow_type: '',
    status: 'DRAFT',
    approval_threshold: 100,
    allow_delegation: true,
    allow_comments: true,
    auto_escalate: false,
    escalation_days: 3
  });
  const [errors, setErrors] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (visible) {
      fetchUsers();
      fetchDepartments();
      fetchExistingWorkflows();
      if (workflow) {
        fetchWorkflowDetails();
      } else {
        resetForm();
      }
    }
  }, [visible, workflow]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/', { params: { page_size: 1000 } });
      setUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/', { params: { page_size: 1000 } });
      setDepartments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchExistingWorkflows = async () => {
    try {
      const response = await api.get('/workflows/', { params: { page_size: 1000 } });
      setExistingWorkflows(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching existing workflows:', error);
    }
  };

  const fetchWorkflowDetails = async () => {
    try {
      const response = await api.get(`/workflows/${workflow.id}/`);
      const data = response.data;

      setFormData({
        name: data.name || '',
        description: data.description || '',
        form: data.form || '',
        workflow_type: data.workflow_type || '',
        status: data.status || 'DRAFT',
        approval_threshold: data.approval_threshold || 100,
        allow_delegation: data.allow_delegation ?? true,
        allow_comments: data.allow_comments ?? true,
        auto_escalate: data.auto_escalate ?? false,
        escalation_days: data.escalation_days || 3
      });

      // Map assigned_users_detail to approvers array for each step
      const stepsWithApprovers = (data.steps || []).map(step => ({
        ...step,
        // Convert assigned_users_detail (from API) to approvers array (for frontend)
        approvers: step.approvers ||
          (step.assigned_users_detail && step.assigned_users_detail.length > 0
            ? step.assigned_users_detail.map(u => u.id)
            : step.assigned_user ? [step.assigned_user] : [])
      }));
      setSteps(stepsWithApprovers);
      setSelectedForm(data.form);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch workflow details' });
      console.error('Error fetching workflow:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      form: '',
      workflow_type: '',
      status: 'DRAFT',
      approval_threshold: 100,
      allow_delegation: true,
      allow_comments: true,
      auto_escalate: false,
      escalation_days: 3
    });
    setSteps([]);
    setEditingStepIndex(null);
    setSelectedForm(null);
    setCurrentStep(0);
    setErrors({});
    setMessage({ type: '', text: '' });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => (item.id || `temp-${items.indexOf(item)}`) === active.id);
        const newIndex = items.findIndex((item) => (item.id || `temp-${items.indexOf(item)}`) === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleAddStep = () => {
    // Generate step name based on workflow type
    const stepNumber = steps.length + 1;
    const stepName = formData.workflow_type === 'PARALLEL'
      ? `Approver ${stepNumber}`
      : `Step ${stepNumber}`;

    const newStep = {
      name: stepName,
      step_type: 'APPROVAL',
      order: steps.length,
      approval_mode: 'ALL',
      approvers: [],
      is_required: true,
      can_skip: false
    };
    setSteps([...steps, newStep]);
    setEditingStepIndex(steps.length);
  };

  const handleEditStep = (index) => {
    setEditingStepIndex(index);
  };

  const handleDeleteStep = (index) => {
    setDeleteModal({ open: true, index });
  };

  const confirmDeleteStep = () => {
    const index = deleteModal.index;
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.map((step, i) => ({ ...step, order: i })));
    if (editingStepIndex === index) {
      setEditingStepIndex(null);
    }
    setDeleteModal({ open: false, index: null });
  };

  const handleSaveStep = (values) => {
    const newSteps = [...steps];
    newSteps[editingStepIndex] = {
      ...newSteps[editingStepIndex],
      ...values,
      order: editingStepIndex
    };
    setSteps(newSteps);
    setEditingStepIndex(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Workflow name is required';
    }
    if (!formData.form) {
      newErrors.form = 'Please select a form';
    } else if (formsWithWorkflows.has(String(formData.form))) {
      newErrors.form = 'This form already has a workflow';
    }
    if (!formData.workflow_type) {
      newErrors.workflow_type = 'Please select workflow type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setCurrentStep(0);
      return;
    }

    if (steps.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one approval step' });
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        steps: steps.map((step, index) => ({
          ...step,
          order: index,
          // Convert empty strings to null for integer fields
          time_limit_hours: step.time_limit_hours ? parseInt(step.time_limit_hours, 10) : null
        }))
      };

      if (workflow) {
        await api.put(`/workflows/${workflow.id}/`, payload);
        setMessage({ type: 'success', text: 'Workflow updated successfully' });
      } else {
        await api.post('/workflows/', payload);
        setMessage({ type: 'success', text: 'Workflow created successfully' });
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving workflow:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save workflow' });
    } finally {
      setLoading(false);
    }
  };

  // Filter forms based on user role
  const availableForms = user.role === 'ADMIN'
    ? forms
    : user.role === 'MANAGER'
      ? forms
      : forms.filter(f => String(f.department) === String(user.department));

  // Check which forms already have workflows (convert to strings for consistent comparison)
  const formsWithWorkflows = new Set(
    existingWorkflows
      .filter(w => w.id !== workflow?.id)
      .map(w => String(w.form))
  );

  const isReadOnly = workflow && workflow.status === 'ACTIVE';

  // Helper to get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => String(u.id) === String(userId));
    if (user) {
      return user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.username;
    }
    return 'Unknown';
  };

  // Helper to get form name by ID
  const getFormName = (formId) => {
    const form = availableForms.find(f => String(f.id) === String(formId));
    return form ? form.name : 'Unknown Form';
  };

  // Validate current step before proceeding
  const validateCurrentStep = () => {
    if (currentStep === 0) {
      return validateForm();
    }
    if (currentStep === 1) {
      if (steps.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one approval step' });
        return false;
      }
      // Check all steps have at least one approver assigned
      const unassignedStep = steps.find(s => (!s.approvers || s.approvers.length === 0) && !s.assigned_user);
      if (unassignedStep) {
        setMessage({ type: 'error', text: `Step "${unassignedStep.name}" has no approvers. Please add at least one approver to each step.` });
        return false;
      }
      setMessage({ type: '', text: '' });
      return true;
    }
    return true;
  };

  // Handle next step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 2));
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setMessage({ type: '', text: '' });
  };

  if (!visible) return null;

  // Step indicator component
  const StepIndicator = () => (
    <div className="px-6 py-4 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {[
          { title: 'Basic Information', desc: 'Name, form & type' },
          { title: 'Approval Steps', desc: 'Add approvers' },
          { title: 'Review & Create', desc: 'Confirm details' }
        ].map((step, index) => (
          <div key={index} className="flex-1 flex items-center">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                currentStep > index
                  ? 'bg-emerald-500 text-white'
                  : currentStep === index
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > index ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${currentStep >= index ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-slate-500">{step.desc}</p>
              </div>
            </div>
            {index < 2 && (
              <div className={`flex-1 h-0.5 mx-4 transition-colors ${
                currentStep > index ? 'bg-emerald-500' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Step 0: Basic Information
  const renderBasicInfoStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-50 rounded-full mb-4">
          <ForkIcon className="w-8 h-8 text-sky-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Basic Information</h2>
        <p className="text-slate-600 mt-1">Set up the basic details for your workflow</p>
      </div>

      {!workflow && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InfoIcon className="flex-shrink-0 mt-0.5 text-sky-500" />
            <div>
              <p className="text-sm font-medium text-sky-800">One Workflow Per Form</p>
              <p className="text-sm text-sky-600">Each form can only have one workflow.</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Workflow Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleFormChange('name', e.target.value)}
          disabled={isReadOnly}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 ${
            errors.name ? 'border-red-300' : 'border-slate-300'
          }`}
          placeholder="e.g., Leave Request Approval"
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Associated Form <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.form}
          onChange={(e) => {
            const selectedValue = e.target.value;
            if (selectedValue && formsWithWorkflows.has(String(selectedValue))) {
              return;
            }
            handleFormChange('form', selectedValue);
            setSelectedForm(selectedValue);
          }}
          disabled={isReadOnly || workflow !== null}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 ${
            errors.form ? 'border-red-300' : 'border-slate-300'
          }`}
        >
          <option value="">Select a form</option>
          {availableForms
            .filter(f => !formsWithWorkflows.has(String(f.id)))
            .map(f => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.department_name})
              </option>
            ))}
        </select>
        {errors.form && <p className="mt-1 text-sm text-red-500">{errors.form}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Workflow Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => !isReadOnly && handleFormChange('workflow_type', 'SEQUENTIAL')}
            disabled={isReadOnly}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.workflow_type === 'SEQUENTIAL'
                ? 'border-sky-500 bg-sky-50'
                : 'border-slate-200 hover:border-slate-300'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formData.workflow_type === 'SEQUENTIAL' ? 'bg-sky-500 text-white' : 'bg-slate-200'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <span className="font-medium text-slate-800">Sequential</span>
            </div>
            <p className="text-sm text-slate-600">Approvers review one after another in order</p>
          </button>

          <button
            type="button"
            onClick={() => !isReadOnly && handleFormChange('workflow_type', 'PARALLEL')}
            disabled={isReadOnly}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.workflow_type === 'PARALLEL'
                ? 'border-sky-500 bg-sky-50'
                : 'border-slate-200 hover:border-slate-300'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formData.workflow_type === 'PARALLEL' ? 'bg-sky-500 text-white' : 'bg-slate-200'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="font-medium text-slate-800">Parallel</span>
            </div>
            <p className="text-sm text-slate-600">All approvers review at the same time</p>
          </button>
        </div>
        {errors.workflow_type && <p className="mt-1 text-sm text-red-500">{errors.workflow_type}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          disabled={isReadOnly}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100"
          placeholder="Describe the workflow purpose..."
        />
      </div>
    </div>
  );

  // Step 1: Add Approval Steps - SEQUENTIAL UI
  const renderSequentialStepsUI = () => (
    <>
      {/* Workflow Diagram Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Workflow Preview
          </h3>
          <span className="text-xs text-slate-500">Click on a step to edit it</span>
        </div>
        <WorkflowDiagram
          steps={steps}
          workflowType={formData.workflow_type}
          users={users}
          onStepSelect={handleEditStep}
          selectedStepIndex={editingStepIndex}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Steps List */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Approval Steps</h3>
            {!isReadOnly && (
              <button
                onClick={handleAddStep}
                className="flex items-center gap-2 px-3 py-1.5 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 transition-colors"
              >
                <PlusIcon />
                Add Step
              </button>
            )}
          </div>

          <div className="p-4">
            {steps.length === 0 ? (
              <div className="text-center py-8">
                <EmptyIcon className="mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No steps added yet</p>
                {!isReadOnly && (
                  <button
                    onClick={handleAddStep}
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Add First Step
                  </button>
                )}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map((s, i) => s.id || `temp-${i}`)} strategy={verticalListSortingStrategy}>
                  {steps.map((step, index) => (
                    <SortableStep
                      key={step.id || `temp-${index}`}
                      step={step}
                      index={index}
                      onEdit={handleEditStep}
                      onDelete={handleDeleteStep}
                      isReadOnly={isReadOnly}
                      users={users}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Step Editor */}
        <div>
          {editingStepIndex !== null ? (
            <StepEditor
              step={steps[editingStepIndex]}
              onSave={handleSaveStep}
              onCancel={() => setEditingStepIndex(null)}
              users={users}
            />
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-8 text-center h-full flex flex-col items-center justify-center">
              <SettingsIcon className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500">Click on a step to configure it</p>
              <p className="text-slate-400 text-sm mt-1">or add a new step to get started</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Step 1: Add Approval Steps - PARALLEL UI
  const renderParallelStepsUI = () => {
    // For parallel workflow, we use a single step with multiple approvers
    const parallelStep = steps[0] || { name: 'Parallel Approval', approvers: [], approval_mode: 'ALL' };
    const eligibleUsers = users.filter(u => u.role === 'USER');

    const handleParallelApproverAdd = (userId) => {
      if (!userId) return;
      const currentApprovers = parallelStep.approvers || [];
      if (!currentApprovers.includes(userId) && !currentApprovers.includes(String(userId))) {
        const updatedStep = {
          ...parallelStep,
          name: 'Parallel Approval',
          step_type: 'APPROVAL',
          order: 0,
          approvers: [...currentApprovers, userId],
        };
        setSteps([updatedStep]);
      }
    };

    const handleParallelApproverRemove = (userId) => {
      const currentApprovers = parallelStep.approvers || [];
      const updatedStep = {
        ...parallelStep,
        approvers: currentApprovers.filter(id => String(id) !== String(userId)),
      };
      setSteps([updatedStep]);
    };

    const handleParallelModeChange = (mode) => {
      const updatedStep = {
        ...parallelStep,
        name: 'Parallel Approval',
        step_type: 'APPROVAL',
        order: 0,
        approval_mode: mode,
        approvers: parallelStep.approvers || [],
      };
      setSteps([updatedStep]);
    };

    const getApproverName = (userId) => {
      const user = eligibleUsers.find(u => String(u.id) === String(userId));
      if (user) {
        return user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
      }
      return 'Unknown';
    };

    return (
      <>
        {/* Workflow Diagram Preview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Workflow Preview
            </h3>
          </div>
          <WorkflowDiagram
            steps={steps}
            workflowType={formData.workflow_type}
            users={users}
            onStepSelect={() => {}}
            selectedStepIndex={null}
          />
        </div>

        {/* Parallel Approval Configuration */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Parallel Approval</h3>
                  <p className="text-sm text-slate-500">All selected approvers will review simultaneously</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Approval Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approval Requirement <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'ALL', label: 'All Must Approve', desc: 'Every approver must approve', icon: '✓✓', color: 'purple' },
                    { value: 'MAJORITY', label: 'Majority', desc: 'More than 50% must approve', icon: '>½', color: 'indigo' },
                    { value: 'ANY', label: 'Any One', desc: 'One approval is enough', icon: '✓', color: 'teal' }
                  ].map(mode => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => !isReadOnly && handleParallelModeChange(mode.value)}
                      disabled={isReadOnly}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        parallelStep.approval_mode === mode.value
                          ? `border-${mode.color}-500 bg-${mode.color}-50 ring-2 ring-${mode.color}-200`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-lg font-bold ${
                          parallelStep.approval_mode === mode.value ? `text-${mode.color}-600` : 'text-slate-400'
                        }`}>{mode.icon}</span>
                        <span className={`font-medium text-sm ${
                          parallelStep.approval_mode === mode.value ? `text-${mode.color}-700` : 'text-slate-700'
                        }`}>{mode.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Approvers Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approvers <span className="text-red-500">*</span>
                </label>

                {/* Selected Approvers */}
                <div className="min-h-[60px] p-3 bg-slate-50 rounded-lg border border-slate-200 mb-3">
                  {(parallelStep.approvers || []).length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-2">No approvers selected yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(parallelStep.approvers || []).map(userId => (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm shadow-sm"
                        >
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-medium">
                            {getApproverName(userId).charAt(0).toUpperCase()}
                          </span>
                          <span className="text-slate-700">{getApproverName(userId)}</span>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleParallelApproverRemove(userId)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Approver Dropdown */}
                {!isReadOnly && (
                  <select
                    value=""
                    onChange={(e) => handleParallelApproverAdd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">+ Add approver...</option>
                    {eligibleUsers
                      .filter(u => {
                        const approvers = parallelStep.approvers || [];
                        return !approvers.includes(String(u.id)) && !approvers.includes(u.id);
                      })
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.username})
                        </option>
                      ))}
                  </select>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Select all approvers who should review submissions simultaneously.
                </p>
              </div>

              {/* Summary Info */}
              {(parallelStep.approvers || []).length > 0 && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-sky-700">
                      <span className="font-medium">{(parallelStep.approvers || []).length} approver{(parallelStep.approvers || []).length > 1 ? 's' : ''}</span> will review at the same time.
                      {parallelStep.approval_mode === 'ALL' && ' All must approve for the workflow to complete.'}
                      {parallelStep.approval_mode === 'MAJORITY' && ' More than half must approve for the workflow to complete.'}
                      {parallelStep.approval_mode === 'ANY' && ' Only one approval is needed for the workflow to complete.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Step 1: Add Approval Steps - Main Render
  const renderStepsStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-50 rounded-full mb-4">
          {formData.workflow_type === 'SEQUENTIAL' ? (
            <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )}
        </div>
        <h2 className="text-xl font-semibold text-slate-800">
          {formData.workflow_type === 'SEQUENTIAL' ? 'Configure Approval Steps' : 'Configure Parallel Approvers'}
        </h2>
        <p className="text-slate-600 mt-1">
          {formData.workflow_type === 'SEQUENTIAL'
            ? 'Add approval steps in the order they should be executed'
            : 'Add all approvers who will review submissions at the same time'}
        </p>
      </div>

      {formData.workflow_type === 'SEQUENTIAL' ? renderSequentialStepsUI() : renderParallelStepsUI()}
    </div>
  );

  // Step 2: Review & Create
  const renderReviewStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Review & Create</h2>
        <p className="text-slate-600 mt-1">Review your workflow before creating it</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Workflow Summary</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Workflow Name</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{formData.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Workflow Type</p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {formData.workflow_type === 'SEQUENTIAL' ? 'Sequential (Step by step)' : 'Parallel (All at once)'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Associated Form</p>
            <p className="text-sm font-medium text-slate-800 mt-1">{getFormName(formData.form)}</p>
          </div>

          {formData.description && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Description</p>
              <p className="text-sm text-slate-600 mt-1">{formData.description}</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
              {formData.workflow_type === 'SEQUENTIAL' ? 'Approval Order' : 'Approvers'} ({steps.length})
            </p>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    formData.workflow_type === 'SEQUENTIAL' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">{step.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getApprovalModeColor(step.approval_mode || 'ALL')}`}>
                        {getApprovalModeLabel(step.approval_mode || 'ALL')}
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-slate-500">
                        {step.approvers && step.approvers.length > 0 ? (
                          <>Approvers ({step.approvers.length}): {step.approvers.map(userId => getUserName(userId)).join(', ')}</>
                        ) : step.assigned_user ? (
                          <>Approver: {getUserName(step.assigned_user)}</>
                        ) : (
                          <span className="text-amber-600">No approvers assigned</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-sky-50 border border-sky-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <InfoIcon className="flex-shrink-0 mt-0.5 text-sky-500" />
          <div>
            <p className="text-sm font-medium text-sky-800">What happens next?</p>
            <p className="text-sm text-sky-600">
              After creating, the workflow will be in Draft status. Activate it when you're ready to start using it with form submissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <ForkIcon className="text-sky-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {workflow ? 'Edit Workflow' : 'Create Workflow'}
                </h2>
                {isReadOnly && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    Read-Only (Active Workflow)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <XIcon />
            </button>
          </div>

          {/* Step Indicator */}
          {!isReadOnly && <StepIndicator />}

          {/* Message */}
          {message.text && (
            <div className={`mx-6 mt-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
            {currentStep === 0 && renderBasicInfoStep()}
            {currentStep === 1 && renderStepsStep()}
            {currentStep === 2 && renderReviewStep()}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between">
            <div>
              {currentStep > 0 && !isReadOnly && (
                <button
                  onClick={handlePrevStep}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              {!isReadOnly && (
                currentStep < 2 ? (
                  <button
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {workflow ? 'Update Workflow' : 'Create Workflow'}
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, index: null })}
        onConfirm={confirmDeleteStep}
        title="Delete Step"
        message="Are you sure you want to delete this step?"
      />
    </div>
  );
};

export default WorkflowDesigner;
