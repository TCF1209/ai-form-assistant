import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Badge, Tabs, Modal,
  Form, Input, Select, message, Tooltip, Typography, Empty,
  Row, Col, Statistic, Avatar, Timeline, Divider, Alert
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, UserOutlined, CalendarOutlined,
  CommentOutlined, SwapOutlined, ExclamationCircleOutlined,
  SyncOutlined, EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const MyApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionModal, setActionModal] = useState({ visible: false, type: null });
  const [viewModal, setViewModal] = useState({ visible: false, data: null });
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchApprovals();
    fetchStats();
    fetchUsers();
  }, [activeTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      let endpoint = '/workflow-approvals/';
      if (activeTab === 'pending') {
        endpoint = '/workflow-approvals/my_pending/';
      } else {
        const params = { status: activeTab.toUpperCase() };
        const response = await api.get('/workflow-approvals/', { params });
        setApprovals(response.data.results || response.data);
        return;
      }

      const response = await api.get(endpoint);
      setApprovals(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      if (error.response?.status === 403) {
        message.info('No approvals available for your role');
        setApprovals([]);
      } else {
        message.error('Failed to fetch approvals');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/workflow-approvals/');
      const data = response.data.results || response.data;

      const stats = {
        pending: data.filter(a => a.status === 'PENDING').length,
        approved: data.filter(a => a.status === 'APPROVED').length,
        rejected: data.filter(a => a.status === 'REJECTED').length,
        total: data.length
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      const data = response.data.results || response.data;
      // Filter to only show regular users for delegation
      setUsers(data.filter(u => u.role === 'USER' && u.id !== user.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAction = async (values) => {
    try {
      const approval = selectedApproval;
      const payload = {
        action: actionModal.type,
        comments: values.comments || ''
      };

      if (actionModal.type === 'delegate') {
        payload.delegate_to = values.delegate_to;
      }

      await api.post(`/workflow-approvals/${approval.id}/process/`, payload);

      const actionText = {
        approve: 'approved',
        reject: 'rejected',
        delegate: 'delegated'
      }[actionModal.type];

      message.success(`Successfully ${actionText} the approval`);

      setActionModal({ visible: false, type: null });
      form.resetFields();
      setSelectedApproval(null);
      fetchApprovals();
      fetchStats();
    } catch (error) {
      console.error('Error processing approval:', error);
      message.error(error.response?.data?.error || 'Failed to process approval');
    }
  };

  const handleViewSubmission = async (approval) => {
    try {
      // First, fetch the workflow instance details if we need more info
      let instance = null;
      if (approval.workflow_instance) {
        try {
          const instanceResponse = await api.get(`/workflow-instances/${approval.workflow_instance}/`);
          instance = instanceResponse.data;
        } catch (err) {
          console.log('Could not fetch workflow instance, continuing...');
        }
      }

      // Fetch the submission data
      let submission = null;
      if (approval.submission_detail?.id) {
        try {
          const submissionResponse = await api.get(`/submissions/${approval.submission_detail.id}/`);
          submission = submissionResponse.data;
        } catch (err) {
          console.error('Error fetching submission:', err);
          // If the specific endpoint fails, try to use the detail we already have
          submission = approval.submission_detail;
        }
      } else if (instance?.submission) {
        try {
          const submissionResponse = await api.get(`/submissions/${instance.submission}/`);
          submission = submissionResponse.data;
        } catch (err) {
          console.error('Error fetching submission from instance:', err);
        }
      }

      if (!submission) {
        message.error('Could not fetch submission details');
        return;
      }

      setViewModal({
        visible: true,
        data: {
          instance,
          submission,
          approval
        }
      });
    } catch (error) {
      console.error('Error in handleViewSubmission:', error);
      message.error('Failed to load submission details');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'warning',
      'APPROVED': 'success',
      'REJECTED': 'error',
      'DELEGATED': 'processing',
      'SKIPPED': 'default'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Form',
      dataIndex: 'step_detail',
      key: 'form',
      render: (step) => (
        <Space direction="vertical" size={0}>
          <Text strong>{step?.name || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Step {step?.order + 1} • {step?.type}
          </Text>
        </Space>
      )
    },
    {
      title: 'Workflow',
      key: 'workflow',
      render: (record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.workflow_instance}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Assigned: {moment(record.assigned_at).fromNow()}
          </Text>
        </Space>
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
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => date ? (
        <Space>
          <CalendarOutlined />
          <Text type={moment(date).isBefore() ? 'danger' : undefined}>
            {moment(date).format('MMM DD, YYYY')}
          </Text>
        </Space>
      ) : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Submission">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewSubmission(record)}
            />
          </Tooltip>
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Approve">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                  onClick={() => {
                    setSelectedApproval(record);
                    setActionModal({ visible: true, type: 'approve' });
                  }}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  danger
                  onClick={() => {
                    setSelectedApproval(record);
                    setActionModal({ visible: true, type: 'reject' });
                  }}
                />
              </Tooltip>
              <Tooltip title="Delegate">
                <Button
                  type="text"
                  icon={<SwapOutlined />}
                  onClick={() => {
                    setSelectedApproval(record);
                    setActionModal({ visible: true, type: 'delegate' });
                  }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];

  const tabItems = [
    {
      key: 'pending',
      label: (
        <Space>
          <ClockCircleOutlined />
          Pending
          <Badge count={stats.pending} />
        </Space>
      )
    },
    {
      key: 'approved',
      label: (
        <Space>
          <CheckCircleOutlined />
          Approved
          <Badge count={stats.approved} showZero style={{ backgroundColor: '#52c41a' }} />
        </Space>
      )
    },
    {
      key: 'rejected',
      label: (
        <Space>
          <CloseCircleOutlined />
          Rejected
          <Badge count={stats.rejected} showZero style={{ backgroundColor: '#ff4d4f' }} />
        </Space>
      )
    }
  ];

  // Check if user is admin or form manager
  if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical">
              <ExclamationCircleOutlined style={{ fontSize: 48, color: '#faad14' }} />
              <Title level={4}>Approval Access Restricted</Title>
              <Paragraph>
                As an {user.role === 'ADMIN' ? 'Administrator' : 'Form Manager'},
                you manage workflows but cannot approve submissions.
              </Paragraph>
              <Paragraph type="secondary">
                Only regular users can approve workflow items.
              </Paragraph>
              <Button type="primary" onClick={() => navigate('/workflows')}>
                Go to Workflow Management
              </Button>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Pending Approvals"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Approved"
                value={stats.approved}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Rejected"
                value={stats.rejected}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Total Processed"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <Table
          columns={columns}
          dataSource={approvals}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} approvals`
          }}
        />
      </Card>

      {/* Action Modal */}
      <Modal
        title={
          <Space>
            {actionModal.type === 'approve' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
            {actionModal.type === 'reject' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            {actionModal.type === 'delegate' && <SwapOutlined style={{ color: '#1890ff' }} />}
            {actionModal.type === 'approve' && 'Approve Request'}
            {actionModal.type === 'reject' && 'Reject Request'}
            {actionModal.type === 'delegate' && 'Delegate Request'}
          </Space>
        }
        open={actionModal.visible}
        onCancel={() => {
          setActionModal({ visible: false, type: null });
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAction}
        >
          {actionModal.type === 'delegate' && (
            <Form.Item
              name="delegate_to"
              label="Delegate To"
              rules={[{ required: true, message: 'Please select a user' }]}
            >
              <Select
                showSearch
                placeholder="Select a user to delegate to"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="comments"
            label="Comments"
            rules={[
              {
                required: actionModal.type === 'reject',
                message: 'Please provide a reason for rejection'
              }
            ]}
          >
            <TextArea
              rows={4}
              placeholder={
                actionModal.type === 'approve'
                  ? 'Optional: Add approval comments...'
                  : actionModal.type === 'reject'
                  ? 'Required: Provide reason for rejection...'
                  : 'Optional: Add delegation notes...'
              }
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setActionModal({ visible: false, type: null });
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                danger={actionModal.type === 'reject'}
              >
                {actionModal.type === 'approve' && 'Approve'}
                {actionModal.type === 'reject' && 'Reject'}
                {actionModal.type === 'delegate' && 'Delegate'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Submission Modal */}
      <Modal
        title="Submission Details"
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, data: null })}
        width={800}
        footer={[
          <Button key="close" onClick={() => setViewModal({ visible: false, data: null })}>
            Close
          </Button>
        ]}
      >
        {viewModal.data && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small" title="Submission Information">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Submission Number:</Text>
                  <br />
                  <Text strong>{viewModal.data.submission?.submission_number}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Submitted By:</Text>
                  <br />
                  <Text strong>{viewModal.data.submission?.submitted_by_detail?.username}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Form:</Text>
                  <br />
                  <Text strong>{viewModal.data.submission?.form_detail?.name}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Submitted At:</Text>
                  <br />
                  <Text strong>
                    {moment(viewModal.data.submission?.created_at).format('MMM DD, YYYY HH:mm')}
                  </Text>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Form Data">
              <pre style={{ maxHeight: 300, overflow: 'auto' }}>
                {JSON.stringify(viewModal.data.submission?.data, null, 2)}
              </pre>
            </Card>

            <Card size="small" title="Workflow Progress">
              <Timeline>
                {viewModal.data.instance?.approvals?.map((approval, index) => (
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
                  >
                    <p>
                      <Text strong>{approval.step_detail?.name}</Text>
                      <Tag color={getStatusColor(approval.status)} style={{ marginLeft: 8 }}>
                        {approval.status}
                      </Tag>
                    </p>
                    {approval.assigned_to_detail && (
                      <p>
                        <UserOutlined /> {approval.assigned_to_detail.username}
                      </p>
                    )}
                    {approval.completed_at && (
                      <p>
                        <Text type="secondary">
                          {moment(approval.completed_at).format('MMM DD, YYYY HH:mm')}
                        </Text>
                      </p>
                    )}
                    {approval.comments && (
                      <p>
                        <CommentOutlined /> {approval.comments}
                      </p>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default MyApprovals;