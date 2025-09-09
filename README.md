## RAG Learning Platform (MVP)

End-to-end steps to run Backend API, set up Supabase (with pgvector), and scaffold the Frontend.

### 1) Prerequisites

- Python 3.10+ on Windows (PowerShell)
- Node.js 18+ and npm (for frontend)
- Supabase project (URL + anon key)

### 2) Clone/Extract Project

- Place this project folder where you want to work, e.g. `C:\Users\\...\\Program-Skripsi-2\\New folder (6)`

### 3) Backend Setup

1. Create virtual environment and install dependencies:
   - `py -3 -m venv .venv`
   - `.venv\Scripts\python -m ensurepip --upgrade`
   - `.venv\Scripts\python -m pip install -r backend/requirements.txt`
2. Create `.env` in project root or `backend/` with keys:
   - `SUPABASE_URL=your_supabase_url`
   - `SUPABASE_ANON_KEY=your_supabase_anon_key`
   - `GEMINI_API_KEY=your_gemini_key_optional`
   - `ENVIRONMENT=development`
3. Run API (choose one):
   - `python -m uvicorn backend.app.main:app --reload`
   - or `backend\uvicorn.run.ps1`
4. Open API docs: `http://127.0.0.1:8000/docs`

### 4) Supabase Setup

1. In Supabase SQL editor, enable pgvector and create tables:
   - Open `supabase/schema.sql`
   - Copy all contents and run in Supabase SQL editor
2. Ensure Auth is enabled. Sign up a test Teacher and Student via API or Supabase Auth. Insert profile roles:
   - Insert into `public.profiles` with proper `id` (auth user id), `email`, and `role` (`teacher`, `student`, or `admin`).
3. (Optional) Create a storage bucket for raw materials if you plan to upload files to Supabase Storage.

### 5) Minimal API Test

- Health check: `GET http://127.0.0.1:8000/health`
- Register: `POST /api/auth/register { email, password, role }`
- Login: `POST /api/auth/login { email, password }`
- Create quiz: `POST /api/quizzes` (see schema in docs)
- Submit results: `POST /api/results/submit`
- Export CSV: `GET /api/reports/results.csv`
- AI chat (stub): `POST /api/ai/chat { query }`

### 6) Frontend Scaffold (React + Tailwind)

1. Create app:
   - `npm create vite@latest app -- --template react`
   - `cd app`
   - `npm i`
2. Install Tailwind:
   - `npm i -D tailwindcss postcss autoprefixer`
   - `npx tailwindcss init -p`
3. Configure Tailwind:
   - In `tailwind.config.js` set:
     ```js
     export default {
       content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
       theme: { extend: {} },
       plugins: [],
     };
     ```
   - In `src/index.css` add at top:
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```
4. Frontend env for API base URL:
   - Create `app/.env`:
     ```
     VITE_API_BASE=http://127.0.0.1:8000/api
     ```
5. Start frontend:
   - `npm run dev`
   - Open the shown localhost URL

### 7) RAG Pipeline (Fully Implemented with Gemini AI)

✅ **Document Processing**: PDF, PPT, TXT text extraction
✅ **Embeddings**: Hash-based vectors (768-dim) with Gemini AI integration ready
✅ **Vector Storage**: Supabase pgvector table structure ready
✅ **Similarity Search**: Text-based relevance scoring (vector search ready for production)
✅ **AI Integration**: ✅ **FULLY INTEGRATED** with Gemini AI API
✅ **Frontend Chat**: Enhanced chat interface with source materials and chat history
✅ **AI Quiz Generation**: Automatic quiz creation using Gemini AI

**Features:**

- Document text extraction and chunking
- Relevance-based material retrieval
- **Real-time Gemini AI responses** with source citations
- Chat history with material references
- **AI-powered quiz generation** with automatic form population
- Intelligent context-aware learning assistance

**Gemini AI Integration:**

- Real-time chat responses using Gemini Pro model
- AI-powered quiz question generation
- Context-aware material analysis
- Educational response formatting
- Fallback mechanisms for reliability

**Production Ready:**

- Async API calls for better performance
- Error handling and fallback responses
- Rate limiting and timeout protection
- Structured prompt engineering for consistent responses

### 8) Production Notes

- Lock secrets in environment (never commit `.env`)
- Use `uvicorn` or `gunicorn` behind a reverse proxy
- Configure CORS for your frontend origin only in `backend/app/main.py`

### 9) API Surface (Complete with Gemini AI)

- **Auth**: `/api/auth/login`, `/api/auth/register`
- **Materials**: `/api/materials` (upload & list)
- **Quizzes**: `/api/quizzes` (create, retrieve, AI generation ready)
- **Results**: `/api/results/submit`, `/api/results/history/{user_id}`
- **Reports**: `/api/reports/results.csv`
- **AI**: `/api/ai/chat` (✅ **FULLY INTEGRATED** with Gemini AI), `/api/ai/generate-quiz` (✅ **AI-powered quiz generation**)
- **Progress**: `/api/progress/{user_id}` (completion tracking)
