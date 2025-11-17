import React, { useState, useEffect } from 'react';
import {
  Table, Button, Card, Space, Tag, Input, Select,
  Dropdown, Menu, message, Modal, Tooltip, Badge
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, MoreOutlined, PlayCircleOutlined,
  PauseCircleOutlined, CopyOutlined, EyeOutlined,
  ForkOutlined, SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import WorkflowDesigner from './WorkflowDesigner';

const { Search } = Input;
const { Option } = Select;

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
      message.error('Failed to fetch workflows');
      console.error('Error fetching workflows:', error);
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
    console.log('Delete clicked for workflow:', workflow.name, 'Status:', workflow.status);
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
      console.log('Sending delete request for workflow:', workflowToDelete.id);
      await api.delete(`/workflows/${workflowToDelete.id}/`);
      message.success('Workflow deleted successfully');
      setDeleteModalVisible(false);
      setWorkflowToDelete(null);
      fetchWorkflows();
    } catch (error) {
      console.log('Error response:', error.response?.data);

      // Try to extract error message from different possible response formats
      let errorMessage = 'Failed to delete workflow';

      if (error.response?.data) {
        // Check for Django REST framework error format
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (Array.isArray(error.response.data)) {
          errorMessage = error.response.data[0];
        } else if (error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors[0];
        }
      }

      setDeletionError(errorMessage);
      message.error(errorMessage);
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
    console.log('Delete cancelled');
    setDeleteModalVisible(false);
    setWorkflowToDelete(null);
    setWorkflowInstances(null);
    setDeletionError(null);
  };

  const handleCancelInstances = async () => {
    if (!workflowToDelete) return;

    try {
      const response = await api.post(`/workflows/${workflowToDelete.id}/cancel_instances/`);
      message.success(response.data.message);

      // Re-check instances
      const checkResponse = await api.get(`/workflows/${workflowToDelete.id}/check_instances/`);
      setWorkflowInstances(checkResponse.data);
      setDeletionError(null);

      // If instances are now cleared, try deleting again
      if (checkResponse.data.can_delete) {
        message.info('You can now delete the workflow');
      }
    } catch (error) {
      message.error('Failed to cancel instances');
      console.error('Error cancelling instances:', error);
    }
  };

  const handleActivateWorkflow = async (workflow) => {
    try {
      await api.post(`/workflows/${workflow.id}/activate/`);
      message.success('Workflow activated');
      fetchWorkflows();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to activate workflow');
    }
  };

  const handleDeactivateWorkflow = async (workflow) => {
    try {
      await api.post(`/workflows/${workflow.id}/deactivate/`);
      message.success('Workflow deactivated successfully');
      // Immediately refresh the workflows list to show updated status
      await fetchWorkflows();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to deactivate workflow';
      message.error(errorMessage);
      console.error('Error deactivating workflow:', error);
    }
  };

  const handleCloneWorkflow = async (workflow) => {
    try {
      const response = await api.post(`/workflows/${workflow.id}/clone/`);
      message.success('Workflow cloned successfully');
      fetchWorkflows();
    } catch (error) {
      message.error('Failed to clone workflow');
    }
  };

  const handlePreviewWorkflow = (workflow) => {
    navigate(`/workflows/${workflow.id}/preview`);
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'default',
      'ACTIVE': 'success',
      'INACTIVE': 'warning',
      'ARCHIVED': 'error'
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      'SEQUENTIAL': 'blue',
      'PARALLEL': 'green',
      'CONDITIONAL': 'orange',
      'HYBRID': 'purple'
    };
    return colors[type] || 'default';
  };

  const getActionMenu = (record) => {
    const items = [];

    // Debug log to see the workflow status
    console.log('Workflow status for menu:', record.name, record.status);

    // Add Edit option first
    items.push({
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit'
    });

    if (record.status === 'DRAFT' || record.status === 'INACTIVE') {
      items.push({
        key: 'activate',
        icon: <PlayCircleOutlined />,
        label: 'Activate'
      });
    }

    if (record.status === 'ACTIVE') {
      items.push({
        key: 'deactivate',
        icon: <PauseCircleOutlined />,
        label: 'Deactivate'
      });
    }

    items.push(
      {
        key: 'preview',
        icon: <EyeOutlined />,
        label: 'Preview'
      },
      {
        key: 'clone',
        icon: <CopyOutlined />,
        label: 'Clone'
      },
      {
        type: 'divider'
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        disabled: record.status === 'ACTIVE' || record.status === 'ARCHIVED',
        title: record.status === 'ACTIVE' ? 'Deactivate workflow before deleting' :
               record.status === 'ARCHIVED' ? 'Cannot delete archived workflows' :
               'Delete this workflow'
      }
    );

    // Handle menu click at the menu level
    const handleMenuClick = ({ key }) => {
      console.log('Menu clicked:', key, 'Status:', record.status);

      // Check if delete is disabled
      if (key === 'delete' && (record.status === 'ACTIVE' || record.status === 'ARCHIVED')) {
        message.warning(
          record.status === 'ACTIVE'
            ? 'Please deactivate the workflow before deleting'
            : 'Archived workflows cannot be deleted'
        );
        return;
      }

      switch (key) {
        case 'edit':
          handleEditWorkflow(record);
          break;
        case 'activate':
          handleActivateWorkflow(record);
          break;
        case 'deactivate':
          handleDeactivateWorkflow(record);
          break;
        case 'preview':
          handlePreviewWorkflow(record);
          break;
        case 'clone':
          handleCloneWorkflow(record);
          break;
        case 'delete':
          handleDeleteWorkflow(record);
          break;
        default:
          break;
      }
    };

    return {
      items,
      onClick: handleMenuClick
    };
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ForkOutlined />
          <a onClick={() => handleEditWorkflow(record)}>{text}</a>
        </Space>
      ),
      filteredValue: [searchText],
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toLowerCase()) ||
        record.code.toLowerCase().includes(value.toLowerCase())
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <code>{text}</code>
    },
    {
      title: 'Form',
      dataIndex: 'form_name',
      key: 'form_name'
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name'
    },
    {
      title: 'Type',
      dataIndex: 'workflow_type',
      key: 'workflow_type',
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {type}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Steps',
      dataIndex: 'steps_count',
      key: 'steps_count',
      render: (count) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditWorkflow(record)}
              disabled={
                user.role === 'FORM_MANAGER' &&
                record.department_name !== user.department_name
              }
            />
          </Tooltip>
          <Dropdown menu={getActionMenu(record)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  const canCreateWorkflow = user.role === 'ADMIN' || user.role === 'FORM_MANAGER';

  return (
    <>
      <Card
        title={
          <Space>
            <ForkOutlined style={{ fontSize: 24 }} />
            <span style={{ fontSize: 18, fontWeight: 500 }}>Workflow Management</span>
          </Space>
        }
        extra={
          canCreateWorkflow && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateWorkflow}
            >
              Create Workflow
            </Button>
          )
        }
      >
        <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
          <Space wrap>
            <Search
              placeholder="Search workflows..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 300 }}
              onSearch={setSearchText}
            />

            <Select
              placeholder="Filter by Status"
              style={{ width: 150 }}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
              <Option value="ARCHIVED">Archived</Option>
            </Select>

            <Select
              placeholder="Filter by Type"
              style={{ width: 150 }}
              allowClear
              value={typeFilter}
              onChange={setTypeFilter}
            >
              <Option value="SEQUENTIAL">Sequential</Option>
              <Option value="PARALLEL">Parallel</Option>
              <Option value="CONDITIONAL">Conditional</Option>
              <Option value="HYBRID">Hybrid</Option>
            </Select>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={workflows}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} workflows`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

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

      <Modal
        title="Delete Workflow"
        open={deleteModalVisible}
        onOk={confirmDelete}
        onCancel={cancelDelete}
        okText="Delete"
        okType="danger"
        cancelText="Cancel"
        okButtonProps={{
          disabled: workflowInstances?.active_instances > 0
        }}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <p>
            Are you sure you want to delete "{workflowToDelete?.name}"?
          </p>

          {workflowInstances && (
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div><strong>Workflow Instance Status:</strong></div>
                <div>Total Instances: {workflowInstances.total_instances}</div>
                {workflowInstances.active_instances > 0 && (
                  <>
                    <div style={{ color: 'red' }}>
                      <strong>Active Instances: {workflowInstances.active_instances}</strong>
                    </div>
                    <div>• Pending: {workflowInstances.pending}</div>
                    <div>• In Progress: {workflowInstances.in_progress}</div>
                  </>
                )}
                <div>• Completed: {workflowInstances.completed}</div>
                <div>• Cancelled: {workflowInstances.cancelled}</div>
              </Space>
            </Card>
          )}

          {deletionError && (
            <div style={{
              padding: '10px',
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px',
              color: '#cf1322'
            }}>
              <strong>Error:</strong> {deletionError}
            </div>
          )}

          {workflowInstances?.active_instances > 0 && (
            <div style={{
              padding: '10px',
              backgroundColor: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: '4px'
            }}>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ color: '#d46b08' }}>
                  <strong>Cannot delete workflow with active instances!</strong>
                </div>
                <div>You can either:</div>
                <ul style={{ marginBottom: 10 }}>
                  <li>Wait for the instances to complete</li>
                  <li>Cancel all active instances first</li>
                </ul>
                <Button
                  type="primary"
                  danger
                  onClick={handleCancelInstances}
                  icon={<DeleteOutlined />}
                >
                  Cancel All Active Instances
                </Button>
              </Space>
            </div>
          )}

          {!workflowInstances?.active_instances && (
            <p style={{ color: '#52c41a' }}>
              ✓ This workflow can be safely deleted.
            </p>
          )}

          <p style={{ fontStyle: 'italic', color: '#8c8c8c' }}>
            Note: This action cannot be undone.
          </p>
        </Space>
      </Modal>
    </>
  );
};

export default Workflows;