import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const DepartmentModal = ({ departments: initialDepartments, onClose, onSave }) => {
  const [departments, setDepartments] = useState(initialDepartments || []);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parent: '',
    manager: ''
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/?page_size=1000');
      // Handle paginated response
      if (response.data.results !== undefined) {
        setDepartments(response.data.results);
      } else if (Array.isArray(response.data)) {
        setDepartments(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/?page_size=1000');
      // Handle paginated response
      if (response.data.results !== undefined) {
        setUsers(response.data.results);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      parent: dept.parent || '',
      manager: dept.manager || ''
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      parent: '',
      manager: ''
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      parent: '',
      manager: ''
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrors({});

      const dataToSend = {
        ...formData,
        parent: formData.parent || null,
        manager: formData.manager || null
      };

      if (editingId) {
        // Update existing department
        await api.patch(`/departments/${editingId}/`, dataToSend);
      } else {
        // Create new department
        await api.post('/departments/', dataToSend);
      }

      fetchDepartments();
      handleCancel();
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deptId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await api.delete(`/departments/${deptId}/`);
        fetchDepartments();
      } catch (error) {
        console.error('Failed to delete department:', error);
      }
    }
  };

  const handleToggleActive = async (dept) => {
    try {
      await api.patch(`/departments/${dept.id}/`, {
        is_active: !dept.is_active
      });
      fetchDepartments();
    } catch (error) {
      console.error('Failed to toggle department status:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">
              Manage Departments
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

          {errors.general && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-medium text-slate-800 mb-3">
                {editingId ? 'Edit Department' : 'Create Department'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={`w-full px-3 py-2 border ${
                      errors.code ? 'border-red-300' : 'border-slate-300'
                    } rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500`}
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Parent Department
                  </label>
                  <select
                    value={formData.parent}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">None</option>
                    {departments
                      .filter(d => d.id !== editingId)
                      .map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Manager
                  </label>
                  <select
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">None</option>
                    {users
                      .filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Add Department Button */}
          {!isCreating && !editingId && (
            <button
              onClick={handleCreate}
              className="mb-4 px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
            >
              Add Department
            </button>
          )}

          {/* Departments List */}
          <div className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No departments found</p>
            ) : (
              departments.map(dept => (
                <div
                  key={dept.id}
                  className="bg-white border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium text-slate-800">
                          {dept.name}
                        </h4>
                        <span className="text-sm text-slate-500">({dept.code})</span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          dept.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {dept.description && (
                        <p className="text-sm text-slate-600 mt-1">{dept.description}</p>
                      )}
                      <div className="text-sm text-slate-500 mt-2">
                        {dept.parent_name && <span>Parent: {dept.parent_name} | </span>}
                        {dept.manager_name && <span>Manager: {dept.manager_name} | </span>}
                        <span>Users: {dept.total_users || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="text-sky-600 hover:text-sky-900 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(dept)}
                        className={`text-sm ${
                          dept.is_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {dept.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentModal;