import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const SubmissionViewModal = ({ submissionId, onClose }) => {
  const [submission, setSubmission] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionDetails();
    }
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);

      // Fetch submission details
      const submissionResponse = await api.get(`/submissions/${submissionId}/`);
      setSubmission(submissionResponse.data);

      // Fetch form fields to display the data properly
      const fieldsResponse = await api.get(`/forms/${submissionResponse.data.form}/fields/`);
      const sortedFields = (fieldsResponse.data || []).sort((a, b) => a.order - b.order);
      setFields(sortedFields);
    } catch (error) {
      console.error('Failed to fetch submission details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFieldValue = (field, value) => {
    if (!value && value !== 0 && value !== false) {
      return <span className="text-slate-400">Not provided</span>;
    }

    switch (field.field_type) {
      case 'CHECKBOX':
        return value ? 'Yes' : 'No';

      case 'MULTISELECT':
        return Array.isArray(value) ? value.join(', ') : value;

      case 'DATE':
        return new Date(value).toLocaleDateString();

      case 'DATETIME':
        return new Date(value).toLocaleString();

      case 'TIME':
        return value;

      case 'FILE':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:text-sky-700 underline"
          >
            View File
          </a>
        );

      case 'URL':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:text-sky-700 underline"
          >
            {value}
          </a>
        );

      case 'RATING':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={value >= star ? 'text-yellow-400' : 'text-slate-300'}
              >
                ★
              </span>
            ))}
          </div>
        );

      default:
        return value;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (!submissionId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Submission Details</h2>
              {submission && (
                <div className="mt-2 flex gap-4 text-sm text-slate-600">
                  <span>Form: {submission.form_name}</span>
                  <span>•</span>
                  <span>Submitted by: {submission.submitted_by_name}</span>
                  <span>•</span>
                  <span>Date: {new Date(submission.created_at).toLocaleDateString()}</span>
                </div>
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

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading submission details...</p>
            </div>
          ) : submission ? (
            <div className="space-y-6">
              {/* Status and Metadata */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Version</label>
                    <p className="mt-1 text-slate-900">v{submission.version}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Submission ID</label>
                    <p className="mt-1 text-slate-900 font-mono text-sm">{submission.id}</p>
                  </div>
                </div>

                {submission.rejection_reason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                    <p className="mt-1 text-red-700">{submission.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Form Data */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Submitted Data</h3>
                <div className="space-y-4">
                  {fields.length > 0 ? (
                    fields.map(field => {
                      const value = submission.data?.[field.name];
                      return (
                        <div key={field.id} className="border-b pb-3 last:border-0">
                          <label className="text-sm font-medium text-slate-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className="mt-1 text-slate-900">
                            {renderFieldValue(field, value)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-500">No field data available</p>
                  )}
                </div>
              </div>

              {/* Files */}
              {submission.files && submission.files.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Attached Files</h3>
                  <div className="space-y-2">
                    {submission.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium text-slate-900">{file.field_name}</p>
                          <p className="text-sm text-slate-600">
                            Uploaded: {new Date(file.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                        <a
                          href={file.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-sm text-slate-600 border-t pt-4">
                <p>Created: {new Date(submission.created_at).toLocaleString()}</p>
                <p>Last Updated: {new Date(submission.updated_at).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              Failed to load submission details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionViewModal;