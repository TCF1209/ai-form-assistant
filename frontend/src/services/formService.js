import api from './api';

/**
 * Form Service
 * Handles all form-related API interactions
 */

const formService = {
  /**
   * Get all forms (filtered based on user role)
   */
  async getAllForms(params = {}) {
    const response = await api.get('/forms/', { params });
    return response.data;
  },

  /**
   * Get a single form by ID with all fields
   */
  async getForm(id) {
    const response = await api.get(`/forms/${id}/`);
    return response.data;
  },

  /**
   * Create a new form
   * @param {Object} formData - Form data including name, code, description, department, fields
   */
  async createForm(formData) {
    const response = await api.post('/forms/', formData);
    return response.data;
  },

  /**
   * Create a form from AI generation
   * @param {Object} aiFormData - AI generated form data
   */
  async createAIForm(aiFormData) {
    let createdForm = null;
    try {
      // Transform AI generated data to match backend format
      const formData = {
        name: aiFormData.title || aiFormData.name,
        code: aiFormData.code || this.generateFormCode(aiFormData.title || aiFormData.name),
        description: aiFormData.description || '',
        department: aiFormData.department,
        status: 'DRAFT',
        ai_generated: true,
        ai_prompt: aiFormData.prompt || '',
        config: aiFormData.config || {},
        fields: aiFormData.fields || []
      };

      createdForm = await this.createForm({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        department: formData.department,
        status: formData.status,
        ai_generated: formData.ai_generated,
        ai_prompt: formData.ai_prompt,
        config: formData.config
      });

      // Then add fields one by one
      if (formData.fields && formData.fields.length > 0) {
        for (let i = 0; i < formData.fields.length; i++) {
          const field = formData.fields[i];
          await this.addField(createdForm.id, {
            name: field.name || this.generateFieldName(field.label),
            label: field.label || field.name,
            field_type: this.mapFieldType(field.type),
            placeholder: field.placeholder || '',
            help_text: field.helpText || field.help_text || '',
            required: field.required || false,
            order: i,
            validation_rules: field.validation || field.validation_rules || {},
            options: field.options || [],
            default_value: field.defaultValue || field.default_value || '',
            width: field.width || 100,
            conditional_logic: field.conditions || field.conditional_logic || {}
          });
        }
      }

      // Return the complete form with fields
      return await this.getForm(createdForm.id);
    } catch (error) {
      // Don't leave a half-built form behind when adding one of its fields failed
      if (createdForm?.id) {
        await api.delete(`/forms/${createdForm.id}/`).catch(() => {});
      }
      throw error;
    }
  },

  /**
   * Update an existing form
   */
  async updateForm(id, formData) {
    const response = await api.patch(`/forms/${id}/`, formData);
    return response.data;
  },

  /**
   * Delete a form
   */
  async deleteForm(id) {
    await api.delete(`/forms/${id}/`);
  },

  /**
   * Duplicate a form
   */
  async duplicateForm(id, newCode, newName) {
    const response = await api.post(`/forms/${id}/duplicate/`, {
      code: newCode,
      name: newName
    });
    return response.data;
  },

  /**
   * Get all fields for a form
   */
  async getFormFields(formId) {
    const response = await api.get(`/forms/${formId}/fields/`);
    return response.data;
  },

  /**
   * Add a field to a form
   */
  async addField(formId, fieldData) {
    const response = await api.post(`/forms/${formId}/add_field/`, fieldData);
    return response.data;
  },

  /**
   * Update a field in a form
   */
  async updateField(formId, fieldId, fieldData) {
    const response = await api.put(`/forms/${formId}/update_field/`, {
      field_id: fieldId,
      ...fieldData
    });
    return response.data;
  },

  /**
   * Delete a field from a form
   */
  async deleteField(formId, fieldId) {
    await api.delete(`/forms/${formId}/delete_field/?field_id=${fieldId}`);
  },

  /**
   * Reorder fields in a form
   */
  async reorderFields(formId, fieldIds) {
    const response = await api.post(`/forms/${formId}/reorder_fields/`, {
      field_ids: fieldIds
    });
    return response.data;
  },

  /**
   * Get available form templates
   */
  async getTemplates() {
    const response = await api.get('/forms/templates/');
    return response.data;
  },

  /**
   * Create a form from a template
   */
  async createFromTemplate(templateKey, formCode, formName, department, status = 'DRAFT') {
    const response = await api.post('/forms/create_from_template/', {
      template: templateKey,
      code: formCode,
      name: formName,
      department,
      status
    });
    return response.data;
  },

  // Helper functions

  /**
   * Generate a form code from form name
   */
  generateFormCode(name) {
    if (!name) return `FORM_${Date.now()}`;

    const code = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20);

    return code || `FORM_${Date.now()}`;
  },

  /**
   * Generate a field name from label
   */
  generateFieldName(label) {
    if (!label) return `field_${Date.now()}`;

    return label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  },

  /**
   * Map frontend field types to backend field types
   */
  mapFieldType(frontendType) {
    const typeMap = {
      'text': 'TEXT',
      'textarea': 'TEXTAREA',
      'number': 'NUMBER',
      'date': 'DATE',
      'time': 'TIME',
      'datetime': 'DATETIME',
      'email': 'EMAIL',
      'phone': 'PHONE',
      'url': 'URL',
      'select': 'SELECT',
      'dropdown': 'SELECT',
      'multiselect': 'MULTISELECT',
      'radio': 'RADIO',
      'checkbox': 'CHECKBOX',
      'file': 'FILE',
      'signature': 'SIGNATURE',
      'rating': 'RATING'
    };

    return typeMap[frontendType?.toLowerCase()] || 'TEXT';
  }
};

export default formService;