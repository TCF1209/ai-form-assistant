import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Button, Space, Card, Row, Col,
  Tabs, Switch, InputNumber, message, Tag, Divider, Alert,
  Empty, Tooltip, Badge, Collapse, Radio
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, DragOutlined, SaveOutlined,
  PlayCircleOutlined, SettingOutlined, UserOutlined,
  TeamOutlined, BranchesOutlined, CheckCircleOutlined,
  CloseCircleOutlined, InfoCircleOutlined, ClockCircleOutlined,
  ForkOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import ConditionBuilder from './ConditionBuilder';

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

// Sortable Step Component
const SortableStep = ({ step, index, onEdit, onDelete, isReadOnly }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id || `temp-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const getStepIcon = (type) => {
    const icons = {
      'APPROVAL': <CheckCircleOutlined />,
      'REVIEW': <InfoCircleOutlined />,
      'NOTIFICATION': <BranchesOutlined />,
      'CONDITIONAL': <BranchesOutlined />,
      'SYSTEM': <SettingOutlined />
    };
    return icons[type] || <CheckCircleOutlined />;
  };

  const getStepColor = (type) => {
    const colors = {
      'APPROVAL': 'green',
      'REVIEW': 'blue',
      'NOTIFICATION': 'orange',
      'CONDITIONAL': 'purple',
      'SYSTEM': 'cyan'
    };
    return colors[type] || 'default';
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        className="workflow-step-card"
        style={{ marginBottom: 8, cursor: isReadOnly ? 'default' : 'move' }}
        styles={{ body: { padding: '8px 12px' } }}
      >
        <Row align="middle" gutter={8}>
          {!isReadOnly && (
            <Col flex="none">
              <DragOutlined {...attributes} {...listeners} style={{ cursor: 'grab' }} />
            </Col>
          )}
          <Col flex="none">
            <Badge count={index + 1} style={{ backgroundColor: '#52c41a' }} />
          </Col>
          <Col flex="none">
            {getStepIcon(step.step_type)}
          </Col>
          <Col flex="auto">
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={{ fontWeight: 500 }}>{step.name}</div>
              <Space size={4}>
                <Tag color={getStepColor(step.step_type)} style={{ margin: 0 }}>
                  {step.step_type}
                </Tag>
                {step.assigned_user && (
                  <Tag icon={<UserOutlined />} style={{ margin: 0 }}>
                    User: {step.assigned_user_name}
                  </Tag>
                )}
                {step.assigned_role && (
                  <Tag icon={<TeamOutlined />} style={{ margin: 0 }}>
                    Role: {step.assigned_role}
                  </Tag>
                )}
                {step.time_limit_hours && (
                  <Tag icon={<ClockCircleOutlined />} style={{ margin: 0 }}>
                    {step.time_limit_hours}h
                  </Tag>
                )}
              </Space>
            </Space>
          </Col>
          {!isReadOnly && (
            <Col flex="none">
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => onEdit(index)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(index)}
                />
              </Space>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};

// Step Editor Component
const StepEditor = ({ step, onSave, onCancel, users, departments }) => {
  const [form] = Form.useForm();
  const [showConditions, setShowConditions] = useState(false);
  const [stepType, setStepType] = useState(step?.step_type || 'APPROVAL');

  useEffect(() => {
    if (step) {
      form.setFieldsValue(step);
      setStepType(step.step_type);
      setShowConditions(!!step.conditions && Object.keys(step.conditions).length > 0);
    }
  }, [step, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      onSave(values);
    });
  };

  // Filter out admins and form managers from user list
  const eligibleUsers = users.filter(u => u.role === 'USER');

  return (
    <Card title="Step Configuration" size="small">
      <Form form={form} layout="vertical" initialValues={step || {}}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Step Name"
              rules={[{ required: true, message: 'Please enter step name' }]}
            >
              <Input placeholder="e.g., Manager Approval" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="step_type"
              label="Step Type"
              rules={[{ required: true }]}
            >
              <Select onChange={setStepType}>
                <Option value="APPROVAL">Approval</Option>
                <Option value="REVIEW">Review</Option>
                <Option value="NOTIFICATION">Notification</Option>
                <Option value="CONDITIONAL">Conditional</Option>
                <Option value="SYSTEM">System Action</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {stepType === 'APPROVAL' && (
          <>
            <Alert
              message="Approver Assignment"
              description="Only regular users can be approvers. Admins and Form Managers cannot approve."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="assigned_user"
                  label="Assign to User"
                >
                  <Select placeholder="Select a user" allowClear>
                    {eligibleUsers.map(user => (
                      <Option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.username})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="assigned_role"
                  label="Or Assign to Role"
                >
                  <Select placeholder="Select a role" allowClear>
                    <Option value="USER">Regular User</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="assigned_department"
                  label="In Department"
                >
                  <Select placeholder="Select department" allowClear>
                    {departments.map(dept => (
                      <Option key={dept.id} value={dept.id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="is_required" valuePropName="checked">
              <Switch checkedChildren="Required" unCheckedChildren="Optional" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="can_skip" valuePropName="checked">
              <Switch checkedChildren="Can Skip" unCheckedChildren="Cannot Skip" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="time_limit_hours" label="Time Limit (hours)">
              <InputNumber min={1} max={720} placeholder="No limit" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Switch
            checked={showConditions}
            onChange={setShowConditions}
            checkedChildren="Has Conditions"
            unCheckedChildren="No Conditions"
          />
        </Form.Item>

        {showConditions && (
          <Form.Item name="conditions" label="Step Conditions">
            <ConditionBuilder />
          </Form.Item>
        )}

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            Save Step
          </Button>
        </Space>
      </Form>
    </Card>
  );
};

const WorkflowDesigner = ({ visible, onClose, workflow, forms }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (visible) {
      fetchUsers();
      fetchDepartments();
      if (workflow) {
        fetchWorkflowDetails();
      } else {
        resetForm();
      }
    }
  }, [visible, workflow]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const fetchWorkflowDetails = async () => {
    try {
      const response = await api.get(`/workflows/${workflow.id}/`);
      const data = response.data;

      form.setFieldsValue({
        name: data.name,
        code: data.code,
        description: data.description,
        form: data.form,
        workflow_type: data.workflow_type,
        status: data.status,
        approval_threshold: data.approval_threshold,
        allow_delegation: data.allow_delegation,
        allow_comments: data.allow_comments,
        auto_escalate: data.auto_escalate,
        escalation_days: data.escalation_days
      });

      setSteps(data.steps || []);
      setSelectedForm(data.form);
    } catch (error) {
      message.error('Failed to fetch workflow details');
      console.error('Error fetching workflow:', error);
    }
  };

  const resetForm = () => {
    form.resetFields();
    setSteps([]);
    setEditingStepIndex(null);
    setSelectedForm(null);
    setActiveTab('basic');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => (item.id || `temp-${items.indexOf(item)}`) === active.id);
        const newIndex = items.findIndex((item) => (item.id || `temp-${items.indexOf(item)}`) === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order field
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleAddStep = () => {
    const newStep = {
      name: `Step ${steps.length + 1}`,
      step_type: 'APPROVAL',
      order: steps.length,
      is_required: true,
      can_skip: false
    };
    setSteps([...steps, newStep]);
    setEditingStepIndex(steps.length);
  };

  const handleEditStep = (index) => {
    setEditingStepIndex(index);
  };

  const handleDeleteStep = (index) => {
    Modal.confirm({
      title: 'Delete Step',
      content: 'Are you sure you want to delete this step?',
      onOk: () => {
        const newSteps = steps.filter((_, i) => i !== index);
        // Reorder remaining steps
        setSteps(newSteps.map((step, i) => ({ ...step, order: i })));
        if (editingStepIndex === index) {
          setEditingStepIndex(null);
        }
      }
    });
  };

  const handleSaveStep = (values) => {
    const newSteps = [...steps];
    newSteps[editingStepIndex] = {
      ...newSteps[editingStepIndex],
      ...values,
      order: editingStepIndex
    };
    setSteps(newSteps);
    setEditingStepIndex(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate steps
      if (steps.length === 0 && values.workflow_type !== 'NOTIFICATION') {
        message.error('Please add at least one step to the workflow');
        return;
      }

      setLoading(true);

      const payload = {
        ...values,
        steps: steps.map((step, index) => ({
          ...step,
          order: index
        }))
      };

      if (workflow) {
        await api.put(`/workflows/${workflow.id}/`, payload);
        message.success('Workflow updated successfully');
      } else {
        await api.post('/workflows/', payload);
        message.success('Workflow created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving workflow:', error);
      message.error(error.response?.data?.detail || 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  // Filter forms based on user role
  const availableForms = user.role === 'ADMIN'
    ? forms
    : forms.filter(f => f.department === user.department_id);

  const isReadOnly = workflow && workflow.status === 'ACTIVE';

  return (
    <Modal
      title={
        <Space>
          <ForkOutlined />
          <span>{workflow ? 'Edit Workflow' : 'Create Workflow'}</span>
          {isReadOnly && <Tag color="warning">Read-Only (Active Workflow)</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        !isReadOnly && (
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            icon={<SaveOutlined />}
          >
            {workflow ? 'Update Workflow' : 'Create Workflow'}
          </Button>
        )
      ]}
      styles={{ body: { padding: 0 } }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'basic',
            label: 'Basic Information',
            children: (
              <div style={{ padding: 24 }}>
            <Form form={form} layout="vertical" disabled={isReadOnly}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Workflow Name"
                    rules={[{ required: true, message: 'Please enter workflow name' }]}
                  >
                    <Input placeholder="e.g., Leave Request Approval" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="code"
                    label="Workflow Code"
                    rules={[
                      { required: true, message: 'Please enter workflow code' },
                      { pattern: /^[A-Z_]+$/, message: 'Use uppercase letters and underscores only' }
                    ]}
                  >
                    <Input placeholder="e.g., LEAVE_APPROVAL" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="form"
                    label="Associated Form"
                    rules={[{ required: true, message: 'Please select a form' }]}
                  >
                    <Select
                      placeholder="Select a form"
                      onChange={setSelectedForm}
                      disabled={workflow !== null}
                    >
                      {availableForms.map(form => (
                        <Option key={form.id} value={form.id}>
                          {form.name} ({form.department_name})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="workflow_type"
                    label="Workflow Type"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Select workflow type">
                      <Option value="SEQUENTIAL">Sequential (Step by step)</Option>
                      <Option value="PARALLEL">Parallel (All at once)</Option>
                      <Option value="CONDITIONAL">Conditional (Based on rules)</Option>
                      <Option value="HYBRID">Hybrid (Mix of sequential and parallel)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={3} placeholder="Describe the workflow purpose and process" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="approval_threshold"
                    label="Approval Threshold (%)"
                    tooltip="For parallel workflows, percentage of approvals needed"
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      defaultValue={100}
                      formatter={value => `${value}%`}
                      parser={value => value.replace('%', '')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="escalation_days"
                    label="Auto-escalate after (days)"
                  >
                    <InputNumber
                      min={1}
                      max={30}
                      defaultValue={3}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="status"
                    label="Initial Status"
                    initialValue="DRAFT"
                  >
                    <Select disabled>
                      <Option value="DRAFT">Draft</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="allow_delegation" valuePropName="checked" initialValue={true}>
                    <Switch checkedChildren="Allow Delegation" unCheckedChildren="No Delegation" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="allow_comments" valuePropName="checked" initialValue={true}>
                    <Switch checkedChildren="Allow Comments" unCheckedChildren="No Comments" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="auto_escalate" valuePropName="checked">
                    <Switch checkedChildren="Auto-Escalate" unCheckedChildren="No Auto-Escalate" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
            )
          },
          {
            key: 'steps',
            label: 'Workflow Steps',
            children: (
              <div style={{ padding: 24, minHeight: 400 }}>
            <Row gutter={16}>
              <Col span={editingStepIndex !== null ? 12 : 24}>
                <Card
                  title="Workflow Steps"
                  size="small"
                  extra={
                    !isReadOnly && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={handleAddStep}
                      >
                        Add Step
                      </Button>
                    )
                  }
                >
                  {steps.length === 0 ? (
                    <Empty
                      description="No steps added yet"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      {!isReadOnly && (
                        <Button type="primary" onClick={handleAddStep}>
                          Add First Step
                        </Button>
                      )}
                    </Empty>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={steps.map((s, i) => s.id || `temp-${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {steps.map((step, index) => (
                          <SortableStep
                            key={step.id || `temp-${index}`}
                            step={step}
                            index={index}
                            onEdit={handleEditStep}
                            onDelete={handleDeleteStep}
                            isReadOnly={isReadOnly}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </Card>
              </Col>

              {editingStepIndex !== null && (
                <Col span={12}>
                  <StepEditor
                    step={steps[editingStepIndex]}
                    onSave={handleSaveStep}
                    onCancel={() => setEditingStepIndex(null)}
                    users={users}
                    departments={departments}
                  />
                </Col>
              )}
            </Row>
          </div>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default WorkflowDesigner;