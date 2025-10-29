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
    Modal.confirm({
      title: 'Delete Workflow',
      content: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/workflows/${workflow.id}/`);
          message.success('Workflow deleted successfully');
          fetchWorkflows();
        } catch (error) {
          message.error('Failed to delete workflow');
          console.error('Error deleting workflow:', error);
        }
      }
    });
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
      message.success('Workflow deactivated');
      fetchWorkflows();
    } catch (error) {
      message.error('Failed to deactivate workflow');
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

  const getActionMenu = (record) => (
    <Menu>
      {record.status === 'DRAFT' && (
        <Menu.Item
          key="activate"
          icon={<PlayCircleOutlined />}
          onClick={() => handleActivateWorkflow(record)}
        >
          Activate
        </Menu.Item>
      )}
      {record.status === 'ACTIVE' && (
        <Menu.Item
          key="deactivate"
          icon={<PauseCircleOutlined />}
          onClick={() => handleDeactivateWorkflow(record)}
        >
          Deactivate
        </Menu.Item>
      )}
      <Menu.Item
        key="preview"
        icon={<EyeOutlined />}
        onClick={() => handlePreviewWorkflow(record)}
      >
        Preview
      </Menu.Item>
      <Menu.Item
        key="clone"
        icon={<CopyOutlined />}
        onClick={() => handleCloneWorkflow(record)}
      >
        Clone
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => handleDeleteWorkflow(record)}
        disabled={record.status === 'ACTIVE'}
      >
        Delete
      </Menu.Item>
    </Menu>
  );

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
          <Dropdown overlay={getActionMenu(record)} trigger={['click']}>
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
    </>
  );
};

export default Workflows;