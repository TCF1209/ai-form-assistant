# CLAUDE.md - AI-Powered Office Assistant Web Application

> **Documentation Version**: 1.0
> **Last Updated**: 2025-01-14
> **Project**: AI-Powered Office Assistant Web Application
> **Description**: AI-powered form management system with intelligent form generation, conversational assistance, and complex workflows for enterprise environments
> **Features**: GitHub auto-backup, Task agents, technical debt prevention

This file provides essential guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL RULES - READ FIRST

> **⚠️ RULE ADHERENCE SYSTEM ACTIVE ⚠️**
> **Claude Code must explicitly acknowledge these rules at task start**
> **These rules override all other instructions and must ALWAYS be followed:**

### 🔄 **RULE ACKNOWLEDGMENT REQUIRED**
> **Before starting ANY task, Claude Code must respond with:**
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ❌ ABSOLUTE PROHIBITIONS
- **NEVER** create new files in root directory → use proper module structure
- **NEVER** write output files directly to root directory → use designated output folders
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use git commands with -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands → use Read, LS, Grep, Glob tools instead
- **NEVER** create duplicate files (manager_v2.py, enhanced_xyz.py, utils_new.js) → ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept → single source of truth
- **NEVER** copy-paste code blocks → extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable → use config files/environment variables
- **NEVER** use naming like enhanced_, improved_, new_, v2_ → extend original files instead

### 📝 MANDATORY REQUIREMENTS
- **COMMIT** after every completed task/phase - no exceptions
- **GITHUB BACKUP** - Push to GitHub after every commit to maintain backup: `git push origin main`
- **USE TASK AGENTS** for all long-running operations (>30 seconds) - Bash commands stop when context switches
- **TODOWRITE** for complex tasks (3+ steps) → parallel agents → git checkpoints → test validation
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept

### ⚡ EXECUTION PATTERNS
- **PARALLEL TASK AGENTS** - Launch multiple Task agents simultaneously for maximum efficiency
- **SYSTEMATIC WORKFLOW** - TodoWrite → Parallel agents → Git checkpoints → GitHub backup → Test validation
- **GITHUB BACKUP WORKFLOW** - After every commit: `git push origin main` to maintain GitHub backup
- **BACKGROUND PROCESSING** - ONLY Task agents can run true background operations

### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK
> **STOP: Before starting any task, Claude Code must explicitly verify ALL points:**

**Step 1: Rule Acknowledgment**
- [ ] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**
- [ ] Will this create files in root? → If YES, use proper module structure instead
- [ ] Will this take >30 seconds? → If YES, use Task agents not Bash
- [ ] Is this 3+ steps? → If YES, use TodoWrite breakdown first
- [ ] Am I about to use grep/find/cat? → If YES, use proper tools instead

**Step 3: Technical Debt Prevention (MANDATORY SEARCH FIRST)**
- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.*<keyword>" to find existing implementations
- [ ] **CHECK EXISTING**: Read any found files to understand current functionality
- [ ] Does similar functionality already exist? → If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? → If YES, consolidate instead
- [ ] Will this create multiple sources of truth? → If YES, redesign approach
- [ ] Have I searched for existing implementations? → Use Grep/Glob tools first
- [ ] Can I extend existing code instead of creating new? → Prefer extension over creation
- [ ] Am I about to copy-paste code? → Extract to shared utility instead

**Step 4: Session Management**
- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

## 🐙 GITHUB SETUP & AUTO-BACKUP

### 📋 **GITHUB BACKUP WORKFLOW** (MANDATORY)
> **⚠️ CLAUDE CODE MUST FOLLOW THIS PATTERN:**

```bash
# After every commit, always run:
git push origin main

# This ensures:
# ✅ Remote backup of all changes
# ✅ Collaboration readiness
# ✅ Version history preservation
# ✅ Disaster recovery protection
```

## 🏗️ PROJECT OVERVIEW

### AI-Powered Office Assistant for Intelligent Form Management

This is a comprehensive Final Year Project implementing an enterprise-grade form management system with AI capabilities. The system leverages OpenAI's GPT models to provide intelligent form generation, conversational form filling assistance, and natural language analytics.

### 🎯 **DEVELOPMENT STATUS**
- **Setup**: In Progress
- **Core Features**: Pending
- **Testing**: Pending
- **Documentation**: Pending

### Tech Stack
- **Backend**: Django 4.2 + Django REST Framework
- **Frontend**: React 18 + Vite + Ant Design 5.0
- **Database**: PostgreSQL 15
- **AI**: OpenAI API (GPT-3.5-turbo)
- **Task Queue**: Celery
- **Cache**: Redis (optional)

### Project Structure
```
project-root/
├── backend/               # Django backend application
│   ├── api/              # REST API endpoints
│   ├── forms/            # Form models and services
│   ├── workflows/        # Workflow engine and models
│   ├── analytics/        # Analytics and reporting
│   ├── ai_integration/   # OpenAI integration
│   ├── users/            # User management
│   ├── config/           # Configuration files
│   ├── static/           # Static files
│   ├── media/            # Uploaded files
│   └── tests/            # Backend tests
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   ├── utils/        # Utility functions
│   │   ├── hooks/        # Custom React hooks
│   │   ├── contexts/     # React contexts
│   │   └── assets/       # Frontend assets
│   └── public/           # Public static files
├── docs/                 # Documentation
├── scripts/              # Utility scripts
├── tests/                # Integration tests
├── deployment/           # Deployment configurations
├── data/                 # Sample data
├── logs/                 # Application logs
└── output/               # Generated output files
```

## 📋 NEED HELP? START HERE

- Project Description: `/mnt/c/Users/tchye/Desktop/fyp_claude_code/fyp-project-description.md`
- Backend Setup: Start with Django project initialization in `backend/`
- Frontend Setup: Initialize React with Vite in `frontend/`
- API Documentation: Will be in `docs/api/`

## 🎯 RULE COMPLIANCE CHECK

Before starting ANY task, verify:
- [ ] ✅ I acknowledge all critical rules above
- [ ] Files go in proper module structure (not root)
- [ ] Use Task agents for >30 second operations
- [ ] TodoWrite for 3+ step tasks
- [ ] Commit after each completed task

## 🚀 COMMON COMMANDS

```bash
# Backend commands (Django)
cd backend
python manage.py runserver
python manage.py makemigrations
python manage.py migrate
python manage.py test

# Frontend commands (React)
cd frontend
npm install
npm run dev
npm run build
npm test

# Git workflow
git add .
git commit -m "message"
git push origin main
```

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ WRONG APPROACH (Creates Technical Debt):
```bash
# Creating new file without searching first
Write(file_path="new_feature.py", content="...")
```

### ✅ CORRECT APPROACH (Prevents Technical Debt):
```bash
# 1. SEARCH FIRST
Grep(pattern="feature.*implementation", include="*.py")
# 2. READ EXISTING FILES
Read(file_path="existing_feature.py")
# 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="existing_feature.py", old_string="...", new_string="...")
```

## 🧹 DEBT PREVENTION WORKFLOW

### Before Creating ANY New File:
1. **🔍 Search First** - Use Grep/Glob to find existing implementations
2. **📋 Analyze Existing** - Read and understand current patterns
3. **🤔 Decision Tree**: Can extend existing? → DO IT | Must create new? → Document why
4. **✅ Follow Patterns** - Use established project patterns
5. **📈 Validate** - Ensure no duplication or technical debt

## 📅 Development Timeline (FYP Schedule)

### Phase 1: Foundation (Weeks 1-3)
- Project setup and configuration
- Database design and models
- User authentication system
- Basic CRUD operations
- Role-based access control

### Phase 2: Core Features (Weeks 4-7)
- Form builder interface
- Form submission system
- Basic workflow engine
- Department management
- File upload functionality

### Phase 3: AI Integration (Weeks 8-11) ⭐
- OpenAI API integration
- AI form generation
- Conversational form filling
- Natural language queries
- Intelligent recommendations

### Phase 4: Advanced Features (Weeks 12-13)
- Complex workflow conditions
- Analytics dashboard
- Report generation
- Audit trail system
- Performance optimization

### Phase 5: Testing & Documentation (Week 14)
- Comprehensive testing
- Bug fixes
- Documentation
- Deployment preparation
- Demo preparation

---

**⚠️ Prevention is better than consolidation - build clean from the start.**
**🎯 Focus on single source of truth and extending existing functionality.**
**📈 Each task should maintain clean architecture and prevent technical debt.**

---

**🎯 Template Credits:**
- Created by: Chang Ho Chien
- YouTube Channel: HC AI 說人話channel
- Tutorial Video: https://youtu.be/8Q1bRZaHH24
- Template Version: 1.0.0