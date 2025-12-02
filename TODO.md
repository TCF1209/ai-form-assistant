# OpenAI Integration TODO

## Status: In Progress

### Overview
Connecting the AI features to the real OpenAI API (GPT-4.1 mini) instead of using mock data.

---

## Tasks

### 1. AI Form Generation - COMPLETED
- [x] Updated `frontend/src/pages/ai/AIFormGeneration.jsx` to call real backend endpoint `/ai/form-generation/generate/`
- [x] Fixed backend role check in `backend/ai_integration/views.py` to include 'MANAGER' role
- [x] Added fallback mechanism - if OpenAI fails, falls back to template-based mock generation
- [x] Build verified successfully

**Implementation Details:**
- Frontend now sends `{ description, department }` to the backend
- Backend uses OpenAI service to generate form structure
- Response includes `form_data` with title, description, and fields
- Fields are mapped to the expected frontend format

---

### 2. Smart Assistant (Conversational Form Filling) - PENDING
- [ ] Update `frontend/src/services/assistantService.js` to call real backend endpoints
- [ ] Connect to `/ai/assistant/start_session/` for starting conversations
- [ ] Connect to `/ai/assistant/send_message/` for chat messages
- [ ] Connect to `/ai/assistant/end_session/` for ending sessions
- [ ] Test conversational form filling with real AI responses

**Current State:** Using keyword matching mock responses

---

### 3. Analytics Query (Natural Language) - PENDING (Optional)
- [ ] Review current implementation in `backend/ai_integration/views.py`
- [ ] Current implementation uses database queries with keyword matching
- [ ] Consider enhancing with OpenAI for better natural language understanding
- [ ] Note: Current implementation is functional without AI, enhancement is optional

**Current State:** Uses pattern matching on keywords to query database

---

## Configuration

### Environment Variables (backend/.env)
```
OPENAI_API_KEY=sk-proj-... (your API key)
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

### Testing
- Run `python test_openai.py` in backend directory to verify API connection
- Check `/api/v1/ai/health/` endpoint for service status

---

## Notes
- OpenAI API key has been configured and tested successfully
- User payment method has been added to OpenAI account
- Implementing features one-by-one to ensure stability
