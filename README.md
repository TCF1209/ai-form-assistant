# AI-Powered Office Assistant Web Application

## 🎯 Project Overview

An intelligent web-based form management system for enterprise environments that leverages AI to revolutionize how organizations handle forms, approvals, and document workflows.

### Key Features
- **AI Form Generation**: Create forms from natural language descriptions
- **Conversational Form Filling**: AI assistant guides users through form completion
- **Intelligent Workflows**: Complex approval routing with conditional logic
- **Natural Language Analytics**: Query system data using plain English
- **Complete Audit Trail**: Track all actions and maintain compliance

## 🚀 Quick Start

1. **Read CLAUDE.md first** - Contains essential rules for Claude Code
2. Follow the pre-task compliance checklist before starting any work
3. Use proper module structure under `backend/` and `frontend/`
4. Commit after every completed task

## 🛠 Tech Stack

### Backend
- Django 4.2 + Django REST Framework
- PostgreSQL 15
- Celery (task queue)
- Redis (caching)
- OpenAI API (GPT-3.5-turbo)

### Frontend
- React 18 + Vite
- Ant Design 5.0
- React Router v6
- Axios
- Recharts

## 📁 Project Structure

```
project-root/
├── backend/               # Django backend application
│   ├── api/              # REST API endpoints
│   ├── forms/            # Form models and services
│   ├── workflows/        # Workflow engine
│   ├── analytics/        # Analytics and reporting
│   ├── ai_integration/   # OpenAI integration
│   └── tests/            # Backend tests
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   └── services/     # API services
│   └── public/           # Static assets
├── docs/                 # Documentation
├── deployment/           # Deployment configs
└── tests/                # Integration tests
```

## 🎯 Development Guidelines

- **Always search first** before creating new files
- **Extend existing** functionality rather than duplicating
- **Use Task agents** for operations >30 seconds
- **Single source of truth** for all functionality
- **Commit frequently** with clear messages
- **Test incrementally** to catch issues early

## 📋 Setup Instructions

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Setup
```bash
# Ensure PostgreSQL is installed and running
createdb ai_office_assistant
# Configure database in backend/settings.py
```

## 👥 User Roles

1. **Regular Users**: Submit forms, track status, participate in approvals
2. **Form Managers**: Create forms, design workflows, view analytics
3. **System Administrators**: Full system control, user management, audit logs

## 📊 Key Metrics

- Form generation time: < 5 seconds
- Page load time: < 2 seconds
- AI response time: < 3 seconds
- Support for 100+ concurrent users

## 🧪 Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test

# Integration tests
python -m pytest tests/
```

## 📈 Development Phases

1. **Foundation** (Weeks 1-3): Setup, models, authentication
2. **Core Features** (Weeks 4-7): Forms, workflows, file uploads
3. **AI Integration** (Weeks 8-11): OpenAI integration, NLP features
4. **Advanced** (Weeks 12-13): Analytics, optimization
5. **Testing** (Week 14): Final testing and documentation

## 🤝 Contributing

This is a Final Year Project. Development follows these principles:
- Maintain clean code architecture
- Document complex logic
- Test all critical paths
- Follow CLAUDE.md rules strictly

## 📄 License

This project is part of an academic Final Year Project (FYP).

## 🙏 Acknowledgments

- Project template by Chang Ho Chien | HC AI 說人話channel
- Tutorial: https://youtu.be/8Q1bRZaHH24
- Built with Claude Code assistance

---

**For detailed technical documentation, see `/docs/technical/`**
**For API documentation, see `/docs/api/`**
**For deployment guide, see `/docs/deployment/`**