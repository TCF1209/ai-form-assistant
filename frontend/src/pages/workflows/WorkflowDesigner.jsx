import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import ConditionBuilder from './ConditionBuilder';

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

  // Get the assigned user name
  const getAssignedUserName = () => {
    // First check if assigned_user_name is already provided (from API)
    if (step.assigned_user_name) return step.assigned_user_name;
    // Otherwise look up from users array
    if (step.assigned_user && users) {
      const user = users.find(u => u.id === step.assigned_user || u.id === parseInt(step.assigned_user));
      if (user) {
        return user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.username;
      }
    }
    return null;
  };

  const assignedUserName = getAssignedUserName();

  // User-friendly role labels
  const getRoleLabel = (role) => {
    const labels = {
      'MANAGER': 'Manager',
      'ADMIN': 'Admin',
      'USER': 'User',
      'DEPARTMENT_HEAD': 'Department Head',
      'SUPERVISOR': 'Supervisor'
    };
    return labels[role] || role;
  };

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
              {assignedUserName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">
                  <UserIcon /> {assignedUserName}
                </span>
              )}
              {step.assigned_role && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  <UsersIcon /> {getRoleLabel(step.assigned_role)}
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

// Step Editor Component
const StepEditor = ({ step, onSave, onCancel, users, departments }) => {
  const [formData, setFormData] = useState({
    name: step?.name || '',
    step_type: step?.step_type || 'APPROVAL',
    assigned_user: step?.assigned_user || '',
    assigned_role: step?.assigned_role || '',
    assigned_department: step?.assigned_department || '',
    is_required: step?.is_required ?? true,
    can_skip: step?.can_skip ?? false,
    time_limit_hours: step?.time_limit_hours || '',
    conditions: step?.conditions || {}
  });
  const [showConditions, setShowConditions] = useState(!!step?.conditions && Object.keys(step.conditions).length > 0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name || '',
        step_type: step.step_type || 'APPROVAL',
        assigned_user: step.assigned_user || '',
        assigned_role: step.assigned_role || '',
        assigned_department: step.assigned_department || '',
        is_required: step.is_required ?? true,
        can_skip: step.can_skip ?? false,
        time_limit_hours: step.time_limit_hours || '',
        conditions: step.conditions || {}
      });
      setShowConditions(!!step.conditions && Object.keys(step.conditions).length > 0);
    }
  }, [step]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Step name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      conditions: showConditions ? formData.conditions : {}
    });
  };

  // Filter out admins and form managers from user list
  const eligibleUsers = users.filter(u => u.role === 'USER');

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Step Configuration</h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Step Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.step_type}
              onChange={(e) => handleChange('step_type', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="APPROVAL">Approval</option>
              <option value="REVIEW">Review</option>
              <option value="NOTIFICATION">Notification</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="SYSTEM">System Action</option>
            </select>
          </div>
        </div>

        {formData.step_type === 'APPROVAL' && (
          <>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <InfoIcon className="flex-shrink-0 mt-0.5 text-sky-500" />
                <div>
                  <p className="text-sm font-medium text-sky-800">Approver Assignment</p>
                  <p className="text-sm text-sky-600">Only regular users can be approvers. Admins and Form Managers cannot approve.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assign to User
                </label>
                <select
                  value={formData.assigned_user}
                  onChange={(e) => handleChange('assigned_user', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select a user</option>
                  {eligibleUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Or Assign to Role
                </label>
                <select
                  value={formData.assigned_role}
                  onChange={(e) => handleChange('assigned_role', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select a role</option>
                  <option value="USER">Regular User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  In Department
                </label>
                <select
                  value={formData.assigned_department}
                  onChange={(e) => handleChange('assigned_department', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_required}
                onChange={(e) => handleChange('is_required', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
            <span className="text-sm text-slate-700">{formData.is_required ? 'Required' : 'Optional'}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_skip}
                onChange={(e) => handleChange('can_skip', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
            <span className="text-sm text-slate-700">{formData.can_skip ? 'Can Skip' : 'Cannot Skip'}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Limit (hours)
            </label>
            <input
              type="number"
              value={formData.time_limit_hours}
              onChange={(e) => handleChange('time_limit_hours', e.target.value)}
              min="1"
              max="720"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="No limit"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showConditions}
              onChange={(e) => setShowConditions(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
          </label>
          <span className="text-sm text-slate-700">{showConditions ? 'Has Conditions' : 'No Conditions'}</span>
        </div>

        {showConditions && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Step Conditions
            </label>
            <ConditionBuilder
              value={formData.conditions}
              onChange={(conditions) => handleChange('conditions', conditions)}
            />
          </div>
        )}

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
  const [activeTab, setActiveTab] = useState('basic');
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
      const response = await api.get('/users/');
      setUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/');
      setDepartments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchExistingWorkflows = async () => {
    try {
      const response = await api.get('/workflows/');
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

      setSteps(data.steps || []);
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
    setActiveTab('basic');
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
    const newStep = {
      name: `Step ${steps.length + 1}`,
      step_type: 'APPROVAL',
      order: steps.length,
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
      setActiveTab('basic');
      return;
    }

    if (steps.length === 0 && formData.workflow_type !== 'NOTIFICATION') {
      setMessage({ type: 'error', text: 'Please add at least one step to the workflow' });
      setActiveTab('steps');
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
      : forms.filter(f => f.department === user.department || f.department === user.department_id);

  // Check which forms already have workflows (convert to strings for consistent comparison)
  const formsWithWorkflows = new Set(
    existingWorkflows
      .filter(w => w.id !== workflow?.id)
      .map(w => String(w.form))
  );

  const isReadOnly = workflow && workflow.status === 'ACTIVE';

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden z-10">
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

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'basic'
                    ? 'text-sky-600 border-sky-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                Basic Information
              </button>
              <button
                onClick={() => setActiveTab('steps')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'steps'
                    ? 'text-sky-600 border-sky-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                Workflow Steps
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {!workflow && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <InfoIcon className="flex-shrink-0 mt-0.5 text-sky-500" />
                      <div>
                        <p className="text-sm font-medium text-sky-800">One Workflow Per Form</p>
                        <p className="text-sm text-sky-600">Each form can only have one workflow. Only forms without workflows are available for selection.</p>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Associated Form <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.form}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        // Prevent selecting forms that already have workflows
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
                      {availableForms.some(f => formsWithWorkflows.has(String(f.id))) && (
                        <optgroup label="── Unavailable (already have workflow) ──">
                          {availableForms
                            .filter(f => formsWithWorkflows.has(String(f.id)))
                            .map(f => (
                              <option key={f.id} value={f.id} disabled className="text-slate-400">
                                {f.name} ({f.department_name})
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    {errors.form && <p className="mt-1 text-sm text-red-500">{errors.form}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Workflow Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.workflow_type}
                      onChange={(e) => handleFormChange('workflow_type', e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 ${
                        errors.workflow_type ? 'border-red-300' : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select workflow type</option>
                      <option value="SEQUENTIAL">Sequential (Step by step)</option>
                      <option value="PARALLEL">Parallel (All at once)</option>
                    </select>
                    {errors.workflow_type && <p className="mt-1 text-sm text-red-500">{errors.workflow_type}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    disabled={isReadOnly}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100"
                    placeholder="Describe the workflow purpose and process"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Approval Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={formData.approval_threshold}
                      onChange={(e) => handleFormChange('approval_threshold', parseInt(e.target.value) || 0)}
                      disabled={isReadOnly}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">For parallel workflows</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Auto-escalate after (days)
                    </label>
                    <input
                      type="number"
                      value={formData.escalation_days}
                      onChange={(e) => handleFormChange('escalation_days', parseInt(e.target.value) || 0)}
                      disabled={isReadOnly}
                      min="1"
                      max="30"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Initial Status
                    </label>
                    <input
                      type="text"
                      value="Draft"
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allow_delegation}
                        onChange={(e) => handleFormChange('allow_delegation', e.target.checked)}
                        disabled={isReadOnly}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-disabled:opacity-50"></div>
                    </label>
                    <span className="text-sm text-slate-700">Allow Delegation</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allow_comments}
                        onChange={(e) => handleFormChange('allow_comments', e.target.checked)}
                        disabled={isReadOnly}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-disabled:opacity-50"></div>
                    </label>
                    <span className="text-sm text-slate-700">Allow Comments</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.auto_escalate}
                        onChange={(e) => handleFormChange('auto_escalate', e.target.checked)}
                        disabled={isReadOnly}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-disabled:opacity-50"></div>
                    </label>
                    <span className="text-sm text-slate-700">Auto-Escalate</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'steps' && (
              <div className="grid grid-cols-2 gap-6" style={{ minHeight: 400 }}>
                <div>
                  <div className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800">Workflow Steps</h3>
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
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={steps.map((s, i) => s.id || `temp-${i}`)}
                            strategy={verticalListSortingStrategy}
                          >
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
                </div>

                <div>
                  {editingStepIndex !== null ? (
                    <StepEditor
                      step={steps[editingStepIndex]}
                      onSave={handleSaveStep}
                      onCancel={() => setEditingStepIndex(null)}
                      users={users}
                      departments={departments}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-8 text-center">
                      <SettingsIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Select a step to configure or add a new step</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    {workflow ? 'Update Workflow' : 'Create Workflow'}
                  </>
                )}
              </button>
            )}
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
