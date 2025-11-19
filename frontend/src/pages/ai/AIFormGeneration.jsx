import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  RobotOutlined,
  FormOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  SendOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Button, Input, Select, Card, Tag, message, Alert, Spin, Tabs, Steps, Form, Radio, Switch } from 'antd';

const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const AIFormGeneration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedForm, setGeneratedForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    fields: []
  });
  const [generationHistory, setGenerationHistory] = useState([]);

  // Role-based access control
  const isAdmin = user?.role === 'ADMIN';
  const isFormManager = user?.role === 'FORM_MANAGER';

  // Check if user has access
  useEffect(() => {
    if (!isAdmin && !isFormManager) {
      message.error('Access denied. Only Admins and Form Managers can access this feature.');
      navigate('/forms');
    }
  }, [isAdmin, isFormManager, navigate]);

  // Fetch departments
  useEffect(() => {
    fetchDepartments();
    loadGenerationHistory();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments/');
      if (isFormManager && user?.department) {
        // Form Manager can only see their department
        const userDeptId = typeof user.department === 'object' ? user.department.id : user.department;
        const userDept = response.data.find(d => d.id === userDeptId);
        setDepartments(userDept ? [userDept] : []);
        setSelectedDepartment(userDeptId);
      } else if (isAdmin) {
        // Admin can see all departments
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      // Use mock data if API fails
      const mockDepartments = [
        { id: 1, name: 'Human Resources', code: 'HR' },
        { id: 2, name: 'Finance', code: 'FIN' },
        { id: 3, name: 'IT Department', code: 'IT' },
        { id: 4, name: 'Operations', code: 'OPS' }
      ];

      if (isFormManager) {
        setDepartments([mockDepartments[0]]);
        setSelectedDepartment(1);
      } else {
        setDepartments(mockDepartments);
      }
    }
  };

  const loadGenerationHistory = () => {
    // Load from localStorage for now (mock data)
    const history = localStorage.getItem('ai_form_generation_history');
    if (history) {
      setGenerationHistory(JSON.parse(history));
    } else {
      // Set mock history
      const mockHistory = [
        {
          id: 1,
          prompt: 'Create a leave application form',
          department: 'HR',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed'
        },
        {
          id: 2,
          prompt: 'Generate expense reimbursement form with approval workflow',
          department: 'Finance',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          status: 'completed'
        }
      ];
      setGenerationHistory(mockHistory);
    }
  };

  const saveToHistory = (prompt, department, status = 'completed') => {
    const newEntry = {
      id: Date.now(),
      prompt,
      department: departments.find(d => d.id === department)?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      status
    };

    const updatedHistory = [newEntry, ...generationHistory].slice(0, 10); // Keep last 10
    setGenerationHistory(updatedHistory);
    localStorage.setItem('ai_form_generation_history', JSON.stringify(updatedHistory));
  };

  // Mock AI form generation
  const generateFormWithAI = async () => {
    setLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock generated form based on prompt
      const mockForm = generateMockForm(prompt, selectedDepartment);

      setGeneratedForm(mockForm);
      setFormData(mockForm);
      saveToHistory(prompt, selectedDepartment);
      setCurrentStep(2);
      message.success('Form generated successfully! Review and customize as needed.');
    } catch (error) {
      message.error('Failed to generate form. Please try again.');
      saveToHistory(prompt, selectedDepartment, 'failed');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock form based on prompt
  const generateMockForm = (userPrompt, deptId) => {
    const dept = departments.find(d => d.id === deptId);
    const promptLower = userPrompt.toLowerCase();

    // Different form templates based on keywords in prompt
    if (promptLower.includes('leave') || promptLower.includes('vacation')) {
      return {
        name: 'Leave Application Form',
        code: `${dept?.code || 'FORM'}_LEAVE_${Date.now()}`,
        description: 'AI-generated form for leave/vacation requests',
        department_id: deptId,
        fields: [
          { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
          { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
          { name: 'leave_type', label: 'Leave Type', type: 'select', required: true,
            options: ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Emergency Leave'] },
          { name: 'start_date', label: 'Start Date', type: 'date', required: true },
          { name: 'end_date', label: 'End Date', type: 'date', required: true },
          { name: 'reason', label: 'Reason for Leave', type: 'textarea', required: true },
          { name: 'contact_during_leave', label: 'Contact Number During Leave', type: 'text', required: false },
          { name: 'covering_person', label: 'Person Covering Duties', type: 'text', required: true }
        ]
      };
    } else if (promptLower.includes('expense') || promptLower.includes('reimbursement')) {
      return {
        name: 'Expense Reimbursement Form',
        code: `${dept?.code || 'FORM'}_EXPENSE_${Date.now()}`,
        description: 'AI-generated form for expense reimbursement requests',
        department_id: deptId,
        fields: [
          { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
          { name: 'department', label: 'Department', type: 'text', required: true },
          { name: 'expense_date', label: 'Expense Date', type: 'date', required: true },
          { name: 'expense_category', label: 'Expense Category', type: 'select', required: true,
            options: ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Training', 'Other'] },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'currency', label: 'Currency', type: 'select', required: true,
            options: ['USD', 'EUR', 'GBP', 'SGD', 'MYR'] },
          { name: 'description', label: 'Expense Description', type: 'textarea', required: true },
          { name: 'receipt_attached', label: 'Receipt Attached', type: 'checkbox', required: false },
          { name: 'payment_method', label: 'Payment Method', type: 'select', required: true,
            options: ['Company Card', 'Personal Card', 'Cash'] }
        ]
      };
    } else if (promptLower.includes('feedback') || promptLower.includes('survey')) {
      return {
        name: 'Employee Feedback Form',
        code: `${dept?.code || 'FORM'}_FEEDBACK_${Date.now()}`,
        description: 'AI-generated form for collecting employee feedback',
        department_id: deptId,
        fields: [
          { name: 'employee_name', label: 'Name (Optional)', type: 'text', required: false },
          { name: 'department', label: 'Department', type: 'select', required: true,
            options: departments.map(d => d.name) },
          { name: 'feedback_type', label: 'Feedback Type', type: 'select', required: true,
            options: ['Suggestion', 'Complaint', 'Compliment', 'General Feedback'] },
          { name: 'subject', label: 'Subject', type: 'text', required: true },
          { name: 'feedback_details', label: 'Feedback Details', type: 'textarea', required: true },
          { name: 'priority', label: 'Priority', type: 'radio', required: true,
            options: ['Low', 'Medium', 'High', 'Critical'] },
          { name: 'anonymous', label: 'Submit Anonymously', type: 'checkbox', required: false }
        ]
      };
    } else {
      // Generic form based on prompt
      return {
        name: `Custom Form - ${userPrompt.substring(0, 30)}`,
        code: `${dept?.code || 'FORM'}_CUSTOM_${Date.now()}`,
        description: `AI-generated form based on: "${userPrompt}"`,
        department_id: deptId,
        fields: [
          { name: 'requestor_name', label: 'Requestor Name', type: 'text', required: true },
          { name: 'department', label: 'Department', type: 'text', required: true },
          { name: 'request_date', label: 'Request Date', type: 'date', required: true },
          { name: 'request_type', label: 'Request Type', type: 'text', required: true },
          { name: 'details', label: 'Details', type: 'textarea', required: true },
          { name: 'urgency', label: 'Urgency Level', type: 'select', required: true,
            options: ['Low', 'Medium', 'High', 'Urgent'] },
          { name: 'attachments', label: 'Attachments', type: 'file', required: false },
          { name: 'additional_notes', label: 'Additional Notes', type: 'textarea', required: false }
        ]
      };
    }
  };

  const handleEditField = (index, field) => {
    const updatedFields = [...formData.fields];
    updatedFields[index] = field;
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleDeleteField = (index) => {
    const updatedFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleAddField = () => {
    const newField = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false
    };
    setFormData({ ...formData, fields: [...formData.fields, newField] });
  };

  const handleSaveForm = async () => {
    setLoading(true);
    try {
      // Mock save - in real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));

      message.success('Form saved successfully!');
      // Navigate to form builder or forms list
      navigate('/forms');
    } catch (error) {
      message.error('Failed to save form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPromptStep = () => (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <div className="text-center mb-8">
          <RobotOutlined className="text-6xl text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">AI Form Generator</h2>
          <p className="text-gray-600">Describe the form you want to create, and AI will generate it for you</p>
        </div>

        <Form layout="vertical">
          <Form.Item label="Select Department" required>
            <Select
              size="large"
              placeholder="Choose a department"
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              disabled={isFormManager}
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>
                  <Tag color="blue">{dept.code}</Tag> {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Describe Your Form" required>
            <TextArea
              size="large"
              rows={6}
              placeholder="Example: Create a leave application form with fields for employee name, leave dates, reason, and approval workflow..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for better results:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific about the fields you need</li>
              <li>• Mention if you need approval workflows</li>
              <li>• Specify any validation requirements</li>
              <li>• Include any special conditions or rules</li>
            </ul>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={() => {
              if (!selectedDepartment) {
                message.warning('Please select a department');
                return;
              }
              if (!prompt.trim()) {
                message.warning('Please describe the form you want to create');
                return;
              }
              setCurrentStep(1);
              generateFormWithAI();
            }}
            block
            disabled={!selectedDepartment || !prompt.trim()}
          >
            Generate Form with AI
          </Button>
        </Form>
      </Card>

      {/* Generation History */}
      {generationHistory.length > 0 && (
        <Card className="mt-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Recent Generations</h3>
          <div className="space-y-2">
            {generationHistory.slice(0, 5).map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{item.prompt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag color="blue" className="text-xs">{item.department}</Tag>
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Tag color={item.status === 'completed' ? 'green' : 'red'}>
                  {item.status === 'completed' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                </Tag>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <Card className="shadow-lg p-8">
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
          size="large"
        />
        <h2 className="text-2xl font-bold mt-6 mb-2">Generating Your Form...</h2>
        <p className="text-gray-600 mb-4">AI is analyzing your requirements and creating the perfect form structure</p>

        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <h4 className="font-semibold mb-2">Processing:</h4>
          <p className="text-sm text-gray-700 italic">"{prompt}"</p>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <CheckCircleOutlined className="text-green-500 mr-2" />
            Analyzing requirements...
          </div>
          <div className="flex items-center justify-center text-sm text-gray-600">
            <LoadingOutlined className="mr-2" />
            Generating form fields...
          </div>
          <div className="flex items-center justify-center text-sm text-gray-600">
            <span className="mr-2">⏳</span>
            Setting up validations...
          </div>
        </div>
      </Card>
    </div>
  );

  const renderReviewStep = () => (
    <div className="max-w-6xl mx-auto">
      <Card className="shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Review Generated Form</h2>
            <p className="text-gray-600">AI has generated your form. Review and customize as needed.</p>
          </div>
          <div className="space-x-2">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setCurrentStep(0);
                setGeneratedForm(null);
              }}
            >
              Regenerate
            </Button>
            <Button
              type={isEditing ? 'default' : 'primary'}
              icon={<EditOutlined />}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Done Editing' : 'Edit Fields'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Form Details</h3>
            <Form layout="vertical">
              <Form.Item label="Form Name">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </Form.Item>
              <Form.Item label="Form Code">
                <Input
                  value={formData.code}
                  disabled
                  suffix={<Tag color="green">Auto-generated</Tag>}
                />
              </Form.Item>
              <Form.Item label="Description">
                <TextArea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </div>

          {/* Generated Fields */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Generated Fields ({formData.fields?.length || 0})</h3>
              {isEditing && (
                <Button
                  type="dashed"
                  size="small"
                  onClick={handleAddField}
                >
                  + Add Field
                </Button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {formData.fields?.map((field, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${isEditing ? 'hover:border-blue-400' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{field.label}</span>
                        {field.required && <Tag color="red" className="text-xs">Required</Tag>}
                        <Tag color="blue" className="text-xs">{field.type}</Tag>
                      </div>
                      <p className="text-xs text-gray-500">Field name: {field.name}</p>
                      {field.options && (
                        <p className="text-xs text-gray-500 mt-1">
                          Options: {Array.isArray(field.options) ? field.options.join(', ') : 'Custom options'}
                        </p>
                      )}
                    </div>
                    {isEditing && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        onClick={() => handleDeleteField(index)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button
            size="large"
            onClick={() => navigate('/forms')}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleSaveForm}
            loading={loading}
          >
            Save Form
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      {/* Steps indicator */}
      <div className="mb-8">
        <Steps current={currentStep}>
          <Step title="Describe Form" description="Tell AI what you need" />
          <Step title="AI Generation" description="Creating your form" />
          <Step title="Review & Save" description="Customize and save" />
        </Steps>
      </div>

      {/* Render current step */}
      {currentStep === 0 && renderPromptStep()}
      {currentStep === 1 && renderGeneratingStep()}
      {currentStep === 2 && renderReviewStep()}
    </div>
  );
};

export default AIFormGeneration;