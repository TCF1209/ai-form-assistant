import React, { useState, useEffect } from 'react';
import {
  Card, List, Badge, Button, Space, Tag, Typography,
  Empty, Dropdown, Menu, message, Tabs, Avatar
} from 'antd';
import {
  BellOutlined, CheckOutlined, DeleteOutlined,
  MailOutlined, ClockCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, UserOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import moment from 'moment';

const { Text, Title } = Typography;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'unread') {
        params.is_read = false;
      }

      const response = await api.get('/workflow-notifications/', { params });
      setNotifications(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      message.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/workflow-notifications/unread_count/');
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/workflow-notifications/${notificationId}/mark_read/`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/workflow-notifications/mark_all_read/');
      message.success('All notifications marked as read');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
      message.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'ASSIGNED': <UserOutlined />,
      'REMINDER': <ClockCircleOutlined />,
      'ESCALATION': <ExclamationCircleOutlined />,
      'COMPLETED': <CheckCircleOutlined />,
      'REJECTED': <ExclamationCircleOutlined />,
      'DELEGATED': <UserOutlined />
    };
    return icons[type] || <BellOutlined />;
  };

  const getNotificationColor = (type) => {
    const colors = {
      'ASSIGNED': 'blue',
      'REMINDER': 'orange',
      'ESCALATION': 'red',
      'COMPLETED': 'green',
      'REJECTED': 'red',
      'DELEGATED': 'purple'
    };
    return colors[type] || 'default';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    // Navigate to approvals page
    navigate('/approvals');
  };

  const tabItems = [
    {
      key: 'all',
      label: 'All Notifications'
    },
    {
      key: 'unread',
      label: (
        <Space>
          Unread
          <Badge count={unreadCount} />
        </Space>
      )
    }
  ];

  return (
    <Card
      title={
        <Space>
          <BellOutlined style={{ fontSize: 24 }} />
          <Title level={4} style={{ margin: 0 }}>Notifications</Title>
        </Space>
      }
      extra={
        unreadCount > 0 && (
          <Button onClick={markAllAsRead}>
            <CheckOutlined /> Mark All as Read
          </Button>
        )
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No notifications"
        />
      ) : (
        <List
          loading={loading}
          dataSource={notifications}
          renderItem={item => (
            <List.Item
              key={item.id}
              style={{
                backgroundColor: !item.is_read ? '#f0f5ff' : 'transparent',
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: 4,
                marginBottom: 8
              }}
              onClick={() => handleNotificationClick(item)}
              actions={[
                !item.is_read && (
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(item.id);
                    }}
                  >
                    Mark as read
                  </Button>
                )
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getNotificationIcon(item.notification_type)}
                    style={{
                      backgroundColor: getNotificationColor(item.notification_type) + '20',
                      color: getNotificationColor(item.notification_type)
                    }}
                  />
                }
                title={
                  <Space>
                    <Text strong={!item.is_read}>{item.subject}</Text>
                    <Tag color={getNotificationColor(item.notification_type)}>
                      {item.notification_type}
                    </Tag>
                    {!item.is_read && (
                      <Badge dot status="processing" />
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text>{item.message}</Text>
                    <Space>
                      <ClockCircleOutlined />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {moment(item.created_at).fromNow()}
                      </Text>
                      {item.workflow_approval_detail && (
                        <>
                          <Text type="secondary">•</Text>
                          <FileTextOutlined />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.workflow_approval_detail.workflow_name}
                          </Text>
                        </>
                      )}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default Notifications;