import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Badge, Tabs,
  Modal, Timeline, Typography, Row, Col, Statistic,
  Select, DatePicker, Input, message, Tooltip, Progress,
  Descriptions, Divider
} from 'antd';
import {
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SyncOutlined, EyeOutlined,
  PlayCircleOutlined, PauseCircleOutlined, UserOutlined,
  CommentOutlined, TeamOutlined, ForkOutlined,
  ExportOutlined, FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import moment from 'moment';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

const SubmissionsManagement = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [workflowModal, setWorkflowModal] = useState(false);
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    form: '',
    department: '',
    dateRange: []
  });
  const [forms, setForms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    draft: 0,
    withWorkflow: 0,
    inProgress: 0,
    completed: 0
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchSubmissions();
    fetchForms();
    fetchDepartments();
    fetchStats();
  }, [filters]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.form) params.form = filters.form;
      if (filters.department) params.department = filters.department;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await api.get('/submissions/', { params });
      const data = response.data.results || response.data;

      // Fetch workflow instances for each submission
      const submissionsWithWorkflow = await Promise.all(
        data.map(async (submission) => {
          try {
            const instanceResponse = await api.get('/workflow-instances/', {
              params: { submission: submission.id }
            });
            const instances = instanceResponse.data.results || instanceResponse.data;
            return {
              ...submission,
              workflow_instance: instances[0] || null
            };
          } catch (error) {
            return submission;
          }
        })
      );

      setSubmissions(submissionsWithWorkflow);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      message.error('Failed to fetch submissions');
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

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/');
      setDepartments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/submissions/');
      const data = response.data.results || response.data;

      // Fetch workflow instances
      const instancesResponse = await api.get('/workflow-instances/');
      const instances = instancesResponse.data.results || instancesResponse.data;

      const stats = {
        total: data.length,
        submitted: data.filter(s => s.status === 'SUBMITTED').length,
        draft: data.filter(s => s.status === 'DRAFT').length,
        withWorkflow: instances.length,
        inProgress: instances.filter(i => i.status === 'IN_PROGRESS').length,
        completed: instances.filter(i => i.status === 'COMPLETED').length
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchWorkflowDetails = async (submission) => {
    try {
      if (submission.workflow_instance) {
        const response = await api.get(
          `/workflow-instances/${submission.workflow_instance.id}/`
        );
        setWorkflowInstance(response.data);
      }
    } catch (error) {
      console.error('Error fetching workflow details:', error);
    }
  };

  const handleViewDetails = async (submission) => {
    setSelectedSubmission(submission);
    await fetchWorkflowDetails(submission);
    setDetailModal(true);
  };

  const handleViewWorkflow = async (submission) => {
    setSelectedSubmission(submission);
    await fetchWorkflowDetails(submission);
    setWorkflowModal(true);
  };

  const handleStartWorkflow = async (submission) => {
    try {
      // Find active workflow for the form
      const workflowResponse = await api.get('/workflows/', {
        params: {
          form: submission.form,
          status: 'ACTIVE'
        }
      });

      const workflows = workflowResponse.data.results || workflowResponse.data;

      if (workflows.length === 0) {
        message.warning('No active workflow found for this form');
        return;
      }

      // Start workflow instance
      await api.post('/workflow-instances/start/', {
        submission_id: submission.id,
        workflow_id: workflows[0].id
      });

      message.success('Workflow started successfully');
      fetchSubmissions();
    } catch (error) {
      console.error('Error starting workflow:', error);
      message.error(error.response?.data?.error || 'Failed to start workflow');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'default',
      'SUBMITTED': 'processing',
      'PENDING': 'warning',
      'IN_PROGRESS': 'processing',
      'COMPLETED': 'success',
      'FAILED': 'error',
      'CANCELLED': 'default'
    };
    return colors[status] || 'default';
  };

  const getProgressPercent = (instance) => {
    if (!instance || !instance.approvals) return 0;

    const total = instance.approvals.length;
    if (total === 0) return 0;

    const completed = instance.approvals.filter(
      a => a.status === 'APPROVED' || a.status === 'REJECTED'
    ).length;

    return Math.round((completed / total) * 100);
  };

  const columns = [
    {
      title: 'Submission #',
      dataIndex: 'submission_number',
      key: 'submission_number',
      fixed: 'left',
      render: (text) => (
        <Text strong>{text}</Text>
      )
    },
    {
      title: 'Form',
      dataIndex: 'form_detail',
      key: 'form',
      render: (form) => (
        <Space direction="vertical" size={0}>
          <Text>{form?.name || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {form?.department_name || 'No Department'}
          </Text>
        </Space>
      )
    },
    {
      title: 'Submitted By',
      dataIndex: 'submitted_by_detail',
      key: 'submitted_by',
      render: (user) => (
        <Space>
          <UserOutlined />
          <Text>{user?.username || 'Unknown'}</Text>
        </Space>
      )
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('MMM DD, YYYY HH:mm')
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
      title: 'Workflow',
      key: 'workflow',
      render: (_, record) => {
        const instance = record.workflow_instance;
        if (!instance) {
          return (
            <Space>
              <Tag>No Workflow</Tag>
              {record.status === 'SUBMITTED' && (
                <Tooltip title="Start Workflow">
                  <Button
                    type="text"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleStartWorkflow(record)}
                  />
                </Tooltip>
              )}
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Tag color={getStatusColor(instance.status)}>
              {instance.status}
            </Tag>
            <Progress
              percent={getProgressPercent(instance)}
              size="small"
              showInfo={false}
              status={
                instance.status === 'COMPLETED' ? 'success' :
                instance.status === 'FAILED' ? 'exception' :
                'active'
              }
            />
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.workflow_instance && (
            <Tooltip title="View Workflow">
              <Button
                type="text"
                icon={<ForkOutlined />}
                onClick={() => handleViewWorkflow(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <>
      <Card>
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card variant="borderless">
              <Statistic
                title="Total Submissions"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card variant="borderless">
              <Statistic
                title="Submitted"
                value={stats.submitted}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card variant="borderless">
              <Statistic
                title="Draft"
                value={stats.draft}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card variant="borderless">
              <Statistic
                title="With Workflow"
                value={stats.withWorkflow}
                prefix={<ForkOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card variant="borderless">
              <Statistic
                title="In Progress"
                value={stats.inProgress}
                prefix={<SyncOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card variant="borderless">
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Filter by Status"
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="SUBMITTED">Submitted</Option>
            </Select>

            <Select
              placeholder="Filter by Form"
              style={{ width: 200 }}
              allowClear
              value={filters.form}
              onChange={(value) => setFilters({ ...filters, form: value })}
            >
              {forms.map(form => (
                <Option key={form.id} value={form.id}>
                  {form.name}
                </Option>
              ))}
            </Select>

            {user.role === 'ADMIN' && (
              <Select
                placeholder="Filter by Department"
                style={{ width: 200 }}
                allowClear
                value={filters.department}
                onChange={(value) => setFilters({ ...filters, department: value })}
              >
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            )}

            <RangePicker
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />

            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                setFilters({ status: '', form: '', department: '', dateRange: [] });
                fetchSubmissions();
              }}
            >
              Reset
            </Button>
          </Space>
        </Card>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={submissions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} submissions`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Submission Details"
        open={detailModal}
        onCancel={() => {
          setDetailModal(false);
          setSelectedSubmission(null);
          setWorkflowInstance(null);
        }}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            Close
          </Button>
        ]}
      >
        {selectedSubmission && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions title="Submission Information" bordered>
              <Descriptions.Item label="Submission Number" span={3}>
                {selectedSubmission.submission_number}
              </Descriptions.Item>
              <Descriptions.Item label="Form">
                {selectedSubmission.form_detail?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {selectedSubmission.form_detail?.department_name || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedSubmission.status)}>
                  {selectedSubmission.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Submitted By" span={2}>
                {selectedSubmission.submitted_by_detail?.username}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted At">
                {moment(selectedSubmission.created_at).format('MMM DD, YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {workflowInstance && (
              <Descriptions title="Workflow Information" bordered>
                <Descriptions.Item label="Workflow">
                  {workflowInstance.workflow_detail?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  {workflowInstance.workflow_detail?.type}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(workflowInstance.status)}>
                    {workflowInstance.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Progress" span={3}>
                  <Progress
                    percent={getProgressPercent(workflowInstance)}
                    status={
                      workflowInstance.status === 'COMPLETED' ? 'success' :
                      workflowInstance.status === 'FAILED' ? 'exception' :
                      'active'
                    }
                  />
                </Descriptions.Item>
              </Descriptions>
            )}

            <Card size="small" title="Submitted Data">
              <pre style={{ maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(selectedSubmission.data, null, 2)}
              </pre>
            </Card>
          </Space>
        )}
      </Modal>

      {/* Workflow Modal */}
      <Modal
        title="Workflow Progress"
        open={workflowModal}
        onCancel={() => {
          setWorkflowModal(false);
          setSelectedSubmission(null);
          setWorkflowInstance(null);
        }}
        width={800}
        footer={[
          <Button key="close" onClick={() => setWorkflowModal(false)}>
            Close
          </Button>
        ]}
      >
        {workflowInstance && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Workflow:</Text>
                  <br />
                  <Text strong>{workflowInstance.workflow_detail?.name}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Status:</Text>
                  <br />
                  <Tag color={getStatusColor(workflowInstance.status)}>
                    {workflowInstance.status}
                  </Tag>
                </Col>
              </Row>
            </Card>

            <Timeline mode="left">
              {workflowInstance.approvals?.map((approval, index) => (
                <Timeline.Item
                  key={approval.id}
                  color={
                    approval.status === 'APPROVED' ? 'green' :
                    approval.status === 'REJECTED' ? 'red' :
                    approval.status === 'PENDING' ? 'blue' :
                    'gray'
                  }
                  dot={
                    approval.status === 'APPROVED' ? <CheckCircleOutlined /> :
                    approval.status === 'REJECTED' ? <CloseCircleOutlined /> :
                    approval.status === 'PENDING' ? <ClockCircleOutlined /> :
                    null
                  }
                  label={moment(approval.assigned_at).format('MMM DD, HH:mm')}
                >
                  <Space direction="vertical" size={0}>
                    <Space>
                      <Text strong>{approval.step_detail?.name}</Text>
                      <Tag color={getStatusColor(approval.status)}>
                        {approval.status}
                      </Tag>
                    </Space>
                    {approval.assigned_to_detail && (
                      <Text type="secondary">
                        <UserOutlined /> Assigned to: {approval.assigned_to_detail.username}
                      </Text>
                    )}
                    {approval.approved_by_detail && (
                      <Text type="secondary">
                        <UserOutlined /> {approval.status === 'APPROVED' ? 'Approved' : 'Rejected'} by: {approval.approved_by_detail.username}
                      </Text>
                    )}
                    {approval.completed_at && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Completed: {moment(approval.completed_at).format('MMM DD, YYYY HH:mm')}
                      </Text>
                    )}
                    {approval.comments && (
                      <Text type="secondary">
                        <CommentOutlined /> {approval.comments}
                      </Text>
                    )}
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default SubmissionsManagement;