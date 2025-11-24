import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Badge, Progress,
  Modal, Timeline, Typography, Row, Col, Statistic,
  Tooltip, message, Empty
} from 'antd';
import {
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SyncOutlined, EyeOutlined,
  DownloadOutlined, ExclamationCircleOutlined, UserOutlined,
  CommentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import moment from 'moment';

const { Text, Title, Paragraph } = Typography;

const MySubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/submissions/');
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

  const fetchStats = async () => {
    try {
      const response = await api.get('/submissions/');
      const data = response.data.results || response.data;

      // Fetch workflow instances
      const instancesResponse = await api.get('/workflow-instances/');
      const instances = instancesResponse.data.results || instancesResponse.data;

      const userInstances = instances.filter(i =>
        data.some(s => s.id === i.submission)
      );

      const stats = {
        total: data.length,
        inProgress: userInstances.filter(i => i.status === 'IN_PROGRESS').length,
        completed: userInstances.filter(i => i.status === 'COMPLETED').length,
        rejected: userInstances.filter(i => i.status === 'FAILED').length
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

  const getStatusColor = (status) => {
    if (!status) return 'default';
    const colors = {
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
            {form?.department_name}
          </Text>
        </Space>
      )
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Space direction="vertical" size={0}>
          <Text>{moment(date).format('MMM DD, YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {moment(date).format('HH:mm')}
          </Text>
        </Space>
      )
    },
    {
      title: 'Workflow Status',
      key: 'workflow_status',
      render: (_, record) => {
        const instance = record.workflow_instance;
        if (!instance) {
          return <Tag>No Workflow</Tag>;
        }
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Tag color={getStatusColor(instance.status)}>
              {instance.status}
            </Tag>
            <Progress
              percent={getProgressPercent(instance)}
              size="small"
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
      title: 'Current Step',
      key: 'current_step',
      render: (_, record) => {
        const instance = record.workflow_instance;
        if (!instance || !instance.current_step_detail) {
          return '-';
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>{instance.current_step_detail.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Step {instance.current_step_detail.order + 1}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'DRAFT' && (
            <Tooltip title="Continue Editing">
              <Button
                type="text"
                icon={<SyncOutlined />}
                onClick={() => navigate(`/forms/${record.form}/submit?draft=${record.id}`)}
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
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Total Submissions"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="In Progress"
                value={stats.inProgress}
                prefix={<SyncOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless">
              <Statistic
                title="Completed"
                value={stats.completed}
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
        </Row>

        <Table
          columns={columns}
          dataSource={submissions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} submissions`
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Submission Details
          </Space>
        }
        open={detailModal}
        onCancel={() => {
          setDetailModal(false);
          setSelectedSubmission(null);
          setWorkflowInstance(null);
        }}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            Close
          </Button>
        ]}
      >
        {selectedSubmission && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Submission Info */}
            <Card size="small" title="Submission Information">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Submission Number:</Text>
                  <br />
                  <Text strong>{selectedSubmission.submission_number}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Form:</Text>
                  <br />
                  <Text strong>{selectedSubmission.form_detail?.name}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Status:</Text>
                  <br />
                  <Tag color={selectedSubmission.status === 'SUBMITTED' ? 'success' : 'default'}>
                    {selectedSubmission.status}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Submitted At:</Text>
                  <br />
                  <Text strong>
                    {moment(selectedSubmission.created_at).format('MMM DD, YYYY HH:mm')}
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* Form Data */}
            <Card size="small" title="Submitted Data">
              <pre style={{ maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(selectedSubmission.data, null, 2)}
              </pre>
            </Card>

            {/* Workflow Progress */}
            {workflowInstance && (
              <Card size="small" title="Workflow Progress">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
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

                  <Progress
                    percent={getProgressPercent(workflowInstance)}
                    status={
                      workflowInstance.status === 'COMPLETED' ? 'success' :
                      workflowInstance.status === 'FAILED' ? 'exception' :
                      'active'
                    }
                  />

                  <Timeline>
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
                              <UserOutlined /> {approval.assigned_to_detail.username}
                            </Text>
                          )}
                          {approval.completed_at && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {moment(approval.completed_at).format('MMM DD, YYYY HH:mm')}
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
              </Card>
            )}

            {/* Attached Files */}
            {selectedSubmission.files && selectedSubmission.files.length > 0 && (
              <Card size="small" title="Attached Files">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedSubmission.files.map(file => (
                    <div key={file.id}>
                      <FileTextOutlined /> {file.file_name}
                      <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        href={file.file}
                        target="_blank"
                        style={{ float: 'right' }}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </>
  );
};

export default MySubmissions;