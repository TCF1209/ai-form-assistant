import React, { useState, useEffect } from 'react';
import {
  Card, Space, Button, Select, Input, InputNumber,
  Row, Col, Radio, Tag, Empty, Tooltip
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, GroupOutlined,
  BranchesOutlined
} from '@ant-design/icons';

const { Option } = Select;

const ConditionBuilder = ({ value, onChange }) => {
  const [conditions, setConditions] = useState({
    logic: 'AND',
    rules: []
  });

  useEffect(() => {
    if (value && typeof value === 'object') {
      setConditions(value);
    }
  }, [value]);

  const operators = [
    { value: 'eq', label: 'Equals', types: ['text', 'number', 'select'] },
    { value: 'ne', label: 'Not Equals', types: ['text', 'number', 'select'] },
    { value: 'gt', label: 'Greater Than', types: ['number'] },
    { value: 'lt', label: 'Less Than', types: ['number'] },
    { value: 'gte', label: 'Greater or Equal', types: ['number'] },
    { value: 'lte', label: 'Less or Equal', types: ['number'] },
    { value: 'contains', label: 'Contains', types: ['text'] },
    { value: 'starts_with', label: 'Starts With', types: ['text'] },
    { value: 'ends_with', label: 'Ends With', types: ['text'] },
    { value: 'in', label: 'In List', types: ['text', 'select'] },
    { value: 'not_in', label: 'Not In List', types: ['text', 'select'] }
  ];

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Boolean' }
  ];

  const handleLogicChange = (logic) => {
    const newConditions = { ...conditions, logic };
    setConditions(newConditions);
    onChange?.(newConditions);
  };

  const addRule = () => {
    const newRule = {
      field: '',
      operator: 'eq',
      value: '',
      type: 'text'
    };
    const newConditions = {
      ...conditions,
      rules: [...conditions.rules, newRule]
    };
    setConditions(newConditions);
    onChange?.(newConditions);
  };

  const updateRule = (index, field, value) => {
    const newRules = [...conditions.rules];
    newRules[index] = { ...newRules[index], [field]: value };

    // Reset operator if type changes
    if (field === 'type') {
      const validOperators = operators.filter(op => op.types.includes(value));
      if (!validOperators.find(op => op.value === newRules[index].operator)) {
        newRules[index].operator = validOperators[0]?.value || 'eq';
      }
    }

    const newConditions = { ...conditions, rules: newRules };
    setConditions(newConditions);
    onChange?.(newConditions);
  };

  const deleteRule = (index) => {
    const newRules = conditions.rules.filter((_, i) => i !== index);
    const newConditions = { ...conditions, rules: newRules };
    setConditions(newConditions);
    onChange?.(newConditions);
  };

  const getOperatorsForType = (type) => {
    return operators.filter(op => op.types.includes(type));
  };

  const renderValueInput = (rule, index) => {
    const { type, operator } = rule;

    if (operator === 'in' || operator === 'not_in') {
      return (
        <Input
          placeholder="Comma-separated values"
          value={rule.value}
          onChange={(e) => updateRule(index, 'value', e.target.value)}
        />
      );
    }

    switch (type) {
      case 'number':
        return (
          <InputNumber
            placeholder="Enter value"
            value={rule.value}
            onChange={(val) => updateRule(index, 'value', val)}
            style={{ width: '100%' }}
          />
        );
      case 'boolean':
        return (
          <Select
            value={rule.value}
            onChange={(val) => updateRule(index, 'value', val)}
            style={{ width: '100%' }}
          >
            <Option value={true}>True</Option>
            <Option value={false}>False</Option>
          </Select>
        );
      default:
        return (
          <Input
            placeholder="Enter value"
            value={rule.value}
            onChange={(e) => updateRule(index, 'value', e.target.value)}
          />
        );
    }
  };

  return (
    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Logic Selector */}
        <Row align="middle" gutter={8}>
          <Col flex="none">
            <GroupOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          </Col>
          <Col flex="none">
            <span style={{ fontWeight: 500 }}>Condition Logic:</span>
          </Col>
          <Col>
            <Radio.Group
              value={conditions.logic}
              onChange={(e) => handleLogicChange(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="AND">
                ALL conditions must match (AND)
              </Radio.Button>
              <Radio.Button value="OR">
                ANY condition must match (OR)
              </Radio.Button>
            </Radio.Group>
          </Col>
        </Row>

        {/* Rules */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            <BranchesOutlined /> Conditions:
          </div>

          {conditions.rules.length === 0 ? (
            <Empty
              description="No conditions defined"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {conditions.rules.map((rule, index) => (
                <Card
                  key={index}
                  size="small"
                  bodyStyle={{ padding: '8px 12px' }}
                  style={{ backgroundColor: '#fff' }}
                >
                  <Row gutter={8} align="middle">
                    <Col span={5}>
                      <Input
                        placeholder="Field path"
                        value={rule.field}
                        onChange={(e) => updateRule(index, 'field', e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                    </Col>
                    <Col span={4}>
                      <Select
                        value={rule.type}
                        onChange={(val) => updateRule(index, 'type', val)}
                        style={{ width: '100%', fontSize: 12 }}
                        size="small"
                      >
                        {fieldTypes.map(ft => (
                          <Option key={ft.value} value={ft.value}>
                            {ft.label}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={5}>
                      <Select
                        value={rule.operator}
                        onChange={(val) => updateRule(index, 'operator', val)}
                        style={{ width: '100%', fontSize: 12 }}
                        size="small"
                      >
                        {getOperatorsForType(rule.type).map(op => (
                          <Option key={op.value} value={op.value}>
                            {op.label}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={8}>
                      {renderValueInput(rule, index)}
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteRule(index)}
                      />
                    </Col>
                  </Row>
                  {index < conditions.rules.length - 1 && (
                    <div style={{
                      textAlign: 'center',
                      margin: '4px 0',
                      color: '#8c8c8c',
                      fontSize: 11,
                      fontWeight: 500
                    }}>
                      {conditions.logic}
                    </div>
                  )}
                </Card>
              ))}
            </Space>
          )}
        </div>

        {/* Add Rule Button */}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addRule}
          style={{ width: '100%' }}
          size="small"
        >
          Add Condition
        </Button>

        {/* Field Path Help */}
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          <strong>Field Path Examples:</strong>
          <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
            <li>submission_data.amount - For form field values</li>
            <li>submitted_by - For submission metadata</li>
            <li>form_id - For form information</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default ConditionBuilder;