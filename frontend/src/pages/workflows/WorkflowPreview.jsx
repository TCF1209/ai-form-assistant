import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const WorkflowPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workflows/${id}/`);
      setWorkflow(response.data);
    } catch (err) {
      console.error('Error fetching workflow:', err);
      setError('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'SEQUENTIAL': return 'bg-sky-100 text-sky-700 border-sky-300';
      case 'PARALLEL': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'CONDITIONAL': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'HYBRID': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
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

  const getApprovalModeLabel = (mode) => {
    switch(mode) {
      case 'ALL': return 'All must approve';
      case 'MAJORITY': return 'Majority approval';
      case 'ANY': return 'Any one can approve';
      default: return mode;
    }
  };

  const getApprovalModeColor = (mode) => {
    switch(mode) {
      case 'ALL': return 'bg-red-50 text-red-600 border-red-200';
      case 'MAJORITY': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'ANY': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
        <button
          onClick={() => navigate('/workflows')}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          Back to Workflows
        </button>
      </div>
    );
  }

  const steps = workflow?.steps || [];
  const isParallel = workflow?.workflow_type === 'PARALLEL';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{workflow?.name}</h1>
            <p className="text-slate-500">{workflow?.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(workflow?.status)}`}>
            {workflow?.status}
          </span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getTypeColor(workflow?.workflow_type)}`}>
            {workflow?.workflow_type}
          </span>
        </div>
      </div>

      {/* Workflow Info Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Form:</span>
            <p className="font-medium text-slate-800">{workflow?.form_name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-slate-500">Department:</span>
            <p className="font-medium text-slate-800">{workflow?.department_name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-slate-500">Steps:</span>
            <p className="font-medium text-slate-800">{steps.length}</p>
          </div>
          <div>
            <span className="text-slate-500">Created:</span>
            <p className="font-medium text-slate-800">
              {workflow?.created_at ? new Date(workflow.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Map */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Workflow Map</h2>

        {steps.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No steps defined in this workflow</p>
          </div>
        ) : isParallel ? (
          // Parallel Layout
          <div className="flex flex-col items-center">
            {/* Start Node */}
            <div className="w-24 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-medium shadow-md">
              Start
            </div>

            {/* Arrow down */}
            <div className="h-8 w-0.5 bg-slate-300"></div>

            {/* Split indicator */}
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <div className="h-0.5 w-8 bg-slate-300"></div>
              <span>All steps run in parallel</span>
              <div className="h-0.5 w-8 bg-slate-300"></div>
            </div>

            {/* Parallel Steps Container */}
            <div className="flex flex-wrap justify-center gap-6 py-4">
              {steps.map((step, index) => (
                <div key={step.id || index} className="relative">
                  {/* Step Card */}
                  <div className="w-64 bg-white border-2 border-sky-200 rounded-lg shadow-md overflow-hidden">
                    {/* Step Header */}
                    <div className="bg-sky-50 px-4 py-3 border-b border-sky-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-sky-600">Step {step.order || index + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getApprovalModeColor(step.approval_mode)}`}>
                          {getApprovalModeLabel(step.approval_mode)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-800 mt-1">{step.name}</h3>
                    </div>

                    {/* Step Body */}
                    <div className="px-4 py-3 space-y-2">
                      {step.description && (
                        <p className="text-sm text-slate-500">{step.description}</p>
                      )}

                      {/* Approvers */}
                      <div>
                        <span className="text-xs font-medium text-slate-500">Approvers:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(step.assigned_users_detail || []).length > 0 ? (
                            step.assigned_users_detail.map((user, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded">
                                {user.full_name || user.username}
                              </span>
                            ))
                          ) : step.assigned_user_name ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded">
                              {step.assigned_user_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Not assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Merge indicator */}
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
              <div className="h-0.5 w-8 bg-slate-300"></div>
              <span>All must complete</span>
              <div className="h-0.5 w-8 bg-slate-300"></div>
            </div>

            {/* Arrow down */}
            <div className="h-8 w-0.5 bg-slate-300"></div>

            {/* End Node */}
            <div className="w-24 h-10 bg-slate-500 text-white rounded-full flex items-center justify-center font-medium shadow-md">
              End
            </div>
          </div>
        ) : (
          // Sequential Layout
          <div className="flex flex-col items-center">
            {/* Start Node */}
            <div className="w-24 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-medium shadow-md">
              Start
            </div>

            {steps.map((step, index) => (
              <React.Fragment key={step.id || index}>
                {/* Arrow */}
                <div className="flex flex-col items-center">
                  <div className="h-6 w-0.5 bg-slate-300"></div>
                  <svg className="w-4 h-4 text-slate-400 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Step Card */}
                <div className="w-80 bg-white border-2 border-sky-200 rounded-lg shadow-md overflow-hidden">
                  {/* Step Header */}
                  <div className="bg-sky-50 px-4 py-3 border-b border-sky-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-sky-600">Step {step.order || index + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getApprovalModeColor(step.approval_mode)}`}>
                        {getApprovalModeLabel(step.approval_mode)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 mt-1">{step.name}</h3>
                  </div>

                  {/* Step Body */}
                  <div className="px-4 py-3 space-y-2">
                    {step.description && (
                      <p className="text-sm text-slate-500">{step.description}</p>
                    )}

                    {/* Approvers */}
                    <div>
                      <span className="text-xs font-medium text-slate-500">Approvers:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(step.assigned_users_detail || []).length > 0 ? (
                          step.assigned_users_detail.map((user, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded">
                              {user.full_name || user.username}
                            </span>
                          ))
                        ) : step.assigned_user_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded">
                            {step.assigned_user_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Conditions (if any) */}
                    {step.conditions && step.conditions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <span className="text-xs font-medium text-amber-600">Conditions:</span>
                        <div className="mt-1 text-xs text-slate-600">
                          {step.conditions.map((cond, i) => (
                            <div key={i} className="bg-amber-50 px-2 py-1 rounded mt-1">
                              {cond.field} {cond.operator} {cond.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Final Arrow */}
            <div className="flex flex-col items-center">
              <div className="h-6 w-0.5 bg-slate-300"></div>
              <svg className="w-4 h-4 text-slate-400 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {/* End Node */}
            <div className="w-24 h-10 bg-slate-500 text-white rounded-full flex items-center justify-center font-medium shadow-md">
              End
            </div>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="flex justify-center">
        <button
          onClick={() => navigate('/workflows')}
          className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          Back to Workflows
        </button>
      </div>
    </div>
  );
};

export default WorkflowPreview;
