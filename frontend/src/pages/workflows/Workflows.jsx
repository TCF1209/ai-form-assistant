import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import WorkflowDesigner from './WorkflowDesigner';

const Workflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [designerVisible, setDesignerVisible] = useState(false);
  const [forms, setForms] = useState([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);
  const [workflowInstances, setWorkflowInstances] = useState(null);
  const [deletionError, setDeletionError] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchWorkflows();
    fetchForms();
  }, [statusFilter, typeFilter]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.workflow_type = typeFilter;

      const response = await api.get('/workflows/', { params });
      setWorkflows(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      // Mock data for testing
      setWorkflows([
        {
          id: 1,
          name: 'Leave Request Form Workflow',
          code: 'LEAVE_REQUEST',
          form_name: 'Leave Request Form',
          department_name: 'Administration',
          workflow_type: 'PARALLEL',
          status: 'ACTIVE',
          steps_count: 2,
          created_at: '2025-01-19'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const response = await api.get('/forms/');
      setForms(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setDesignerVisible(true);
  };

  const handleEditWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setDesignerVisible(true);
  };

  const handleDeleteWorkflow = async (workflow) => {
    setWorkflowToDelete(workflow);
    setDeletionError(null);
    setWorkflowInstances(null);

    // Check for active instances
    try {
      const response = await api.get(`/workflows/${workflow.id}/check_instances/`);
      setWorkflowInstances(response.data);
    } catch (error) {
      console.error('Failed to check instances:', error);
    }

    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!workflowToDelete) return;

    try {
      await api.delete(`/workflows/${workflowToDelete.id}/`);
      setDeleteModalVisible(false);
      setWorkflowToDelete(null);
      fetchWorkflows();
    } catch (error) {
      let errorMessage = 'Failed to delete workflow';

      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      }

      setDeletionError(errorMessage);
      console.error('Error deleting workflow:', error);

      // Re-check instances after failed delete
      try {
        const response = await api.get(`/workflows/${workflowToDelete.id}/check_instances/`);
        setWorkflowInstances(response.data);
      } catch (checkError) {
        console.error('Failed to check instances:', checkError);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setWorkflowToDelete(null);
    setWorkflowInstances(null);
    setDeletionError(null);
  };

  const handleCancelInstances = async () => {
    if (!workflowToDelete) return;

    try {
      const response = await api.post(`/workflows/${workflowToDelete.id}/cancel_instances/`);

      // Re-check instances
      const checkResponse = await api.get(`/workflows/${workflowToDelete.id}/check_instances/`);
      setWorkflowInstances(checkResponse.data);
      setDeletionError(null);
    } catch (error) {
      console.error('Error cancelling instances:', error);
    }
  };

  const handleActivateWorkflow = async (workflow) => {
    try {
      await api.post(`/workflows/${workflow.id}/activate/`);
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to activate workflow:', error);
    }
  };

  const handleDeactivateWorkflow = async (workflow) => {
    try {
      await api.post(`/workflows/${workflow.id}/deactivate/`);
      await fetchWorkflows();
    } catch (error) {
      console.error('Error deactivating workflow:', error);
    }
  };

  const handleCloneWorkflow = async (workflow) => {
    alert('Cloning is disabled. Each form can only have one workflow. Please create a new workflow for a different form instead.');
  };

  const handlePreviewWorkflow = (workflow) => {
    navigate(`/workflows/${workflow.id}/preview`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'INACTIVE': return 'bg-amber-100 text-amber-700';
      case 'DRAFT': return 'bg-amber-100 text-amber-700';
      case 'ARCHIVED': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'SEQUENTIAL': return 'bg-sky-100 text-sky-700';
      case 'PARALLEL': return 'bg-emerald-100 text-emerald-700';
      case 'CONDITIONAL': return 'bg-amber-100 text-amber-700';
      case 'HYBRID': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchText ||
      workflow.name.toLowerCase().includes(searchText.toLowerCase()) ||
      workflow.code.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const canCreateWorkflow = user?.role === 'ADMIN' || user?.role === 'FORM_MANAGER';
  const canEditWorkflow = (workflow) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'FORM_MANAGER' && workflow.department_name === user.department_name) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Workflow Management</h1>
              <p className="text-slate-600">Create and manage approval workflows for your forms</p>
            </div>
            {canCreateWorkflow && (
              <button
                onClick={handleCreateWorkflow}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md shadow-sm transition-colors"
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Workflow
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Search workflows..."
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            className="px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="SEQUENTIAL">Sequential</option>
            <option value="PARALLEL">Parallel</option>
            <option value="CONDITIONAL">Conditional</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        {/* Workflows Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">No workflows</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by creating a new workflow.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Steps
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredWorkflows.map((workflow) => (
                    <tr key={workflow.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEditWorkflow(workflow)}
                          className="text-sky-500 hover:text-sky-600 font-medium"
                        >
                          {workflow.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-slate-600">{workflow.code}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {workflow.form_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {workflow.department_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getTypeColor(workflow.workflow_type)}`}>
                          {workflow.workflow_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(workflow.status)}`}>
                          {workflow.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                          {workflow.steps_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(workflow.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === workflow.id ? null : workflow.id)}
                            className="p-2 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {actionMenuOpen === workflow.id && (
                            <div className="absolute right-0 z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                              <div className="py-1">
                                {canEditWorkflow(workflow) && (
                                  <button
                                    onClick={() => {
                                      handleEditWorkflow(workflow);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                  >
                                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                )}

                                {(workflow.status === 'DRAFT' || workflow.status === 'INACTIVE') && (
                                  <button
                                    onClick={() => {
                                      handleActivateWorkflow(workflow);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                  >
                                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Activate
                                  </button>
                                )}

                                {workflow.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => {
                                      handleDeactivateWorkflow(workflow);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                  >
                                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Deactivate
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    handlePreviewWorkflow(workflow);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                >
                                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Preview
                                </button>

                                <button
                                  onClick={() => {
                                    handleCloneWorkflow(workflow);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                >
                                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Clone
                                </button>

                                <hr className="my-1" />

                                <button
                                  onClick={() => {
                                    if (workflow.status === 'ACTIVE' || workflow.status === 'ARCHIVED') {
                                      alert(
                                        workflow.status === 'ACTIVE'
                                          ? 'Please deactivate the workflow before deleting'
                                          : 'Archived workflows cannot be deleted'
                                      );
                                    } else {
                                      handleDeleteWorkflow(workflow);
                                    }
                                    setActionMenuOpen(null);
                                  }}
                                  disabled={workflow.status === 'ACTIVE' || workflow.status === 'ARCHIVED'}
                                  className={`w-full text-left px-4 py-2 text-sm ${
                                    workflow.status === 'ACTIVE' || workflow.status === 'ARCHIVED'
                                      ? 'text-slate-400 cursor-not-allowed'
                                      : 'text-red-600 hover:bg-red-50'
                                  }`}
                                >
                                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Statistics Cards - Fixed at bottom */}
      <div className="bg-white border-t border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-sky-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Workflows</p>
              <p className="text-2xl font-semibold text-slate-900">{workflows.length}</p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-shrink-0 bg-emerald-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Active</p>
              <p className="text-2xl font-semibold text-slate-900">
                {workflows.filter(w => w.status === 'ACTIVE').length}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-shrink-0 bg-amber-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Draft</p>
              <p className="text-2xl font-semibold text-slate-900">
                {workflows.filter(w => w.status === 'DRAFT').length}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex-shrink-0 bg-slate-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Archived</p>
              <p className="text-2xl font-semibold text-slate-900">
                {workflows.filter(w => w.status === 'ARCHIVED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Designer Modal */}
      <WorkflowDesigner
        visible={designerVisible}
        onClose={() => {
          setDesignerVisible(false);
          setSelectedWorkflow(null);
          fetchWorkflows();
        }}
        workflow={selectedWorkflow}
        forms={forms}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Delete Workflow</h3>

              <p className="text-slate-700 mb-4">
                Are you sure you want to delete "{workflowToDelete?.name}"?
              </p>

              {workflowInstances && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-slate-900 mb-2">Workflow Instance Status:</h4>
                  <div className="space-y-1 text-sm">
                    <div>Total Instances: {workflowInstances.total_instances}</div>
                    {workflowInstances.active_instances > 0 && (
                      <>
                        <div className="text-red-600 font-medium">
                          Active Instances: {workflowInstances.active_instances}
                        </div>
                        <div>• Pending: {workflowInstances.pending}</div>
                        <div>• In Progress: {workflowInstances.in_progress}</div>
                      </>
                    )}
                    <div>• Completed: {workflowInstances.completed}</div>
                    <div>• Cancelled: {workflowInstances.cancelled}</div>
                  </div>
                </div>
              )}

              {deletionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
                  <strong>Error:</strong> {deletionError}
                </div>
              )}

              {workflowInstances?.active_instances > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="text-amber-800">
                    <strong>Cannot delete workflow with active instances!</strong>
                  </div>
                  <p className="mt-2 text-sm">You can either:</p>
                  <ul className="list-disc list-inside text-sm mt-1 mb-3">
                    <li>Wait for the instances to complete</li>
                    <li>Cancel all active instances first</li>
                  </ul>
                  <button
                    onClick={handleCancelInstances}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    Cancel All Active Instances
                  </button>
                </div>
              )}

              {!workflowInstances?.active_instances && workflowInstances && (
                <p className="text-emerald-600 mb-4">
                  ✓ This workflow can be safely deleted.
                </p>
              )}

              <p className="text-sm text-slate-500 italic mb-6">
                Note: This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={workflowInstances?.active_instances > 0}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    workflowInstances?.active_instances > 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
};

export default Workflows;