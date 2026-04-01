# 🌌 Aria AI — Premium Personal Assistant

Aria is a high-performance, real-time conversational AI assistant built with **Next.js 15**, **Supabase**, and a robust multi-model fallback architecture. It features integrated **Web Search**, **RAG (Retrieval-Augmented Generation)**, and a premium **Qwen-style UI** with smooth streaming responses and PDF export capabilities.

---

## 🚀 Key Features

### 🧠 Advanced RAG (Long-Term Memory)
- **Persistent Memory**: Automatically extracts and stores factual knowledge, user preferences, and snippets from conversations.
- **pgvector Integration**: Uses Supabase `pgvector` for high-performance similarity searches.
- **Auto-Extraction**: Leverages **Groq (Llama 3.3 70B)** to intelligently decide what's worth remembering.
- **Embeddings**: Uses HuggingFace `all-MiniLM-L6-v2` (384-dim) for semantic text representation.
- **Session Isolation**: Strictly isolates memories per-user (via Supabase Auth) or per-guest (via persistent device UUID).

### 🌐 Real-Time Web Search
- **Intent Detection**: Automatically detects when a query requires up-to-date information.
- **DuckDuckGo Integration**: Fetches fresh search results and injects them into the AI's context window.

### 🤖 Multi-Model Fallback Engine
- **Reliability First**: Intelligent routing between **Groq**, **HuggingFace**, and **OpenRouter**.
- **Automatic Failover**: If one provider is down or rate-limited, Aria instantly tries the next one in the chain to ensure 100% uptime.

### 📄 Premium Qwen-Style UI
- **Rich Formatting**: Forced emoji-prefixed headers, comparison tables, and Markdown perfection.
- **Mermaid Diagrams**: Visualizes workflows and architectures natively in the chat.
- **Streaming Logic**: Custom `TextDecoder` loop for smooth, real-time typing effects.
- **PDF Export**: Built-in, print-optimized tool to save conversations as professional documents.

### 🛠️ Infrastructure Hardening
- **ISP Bypass (Jio Fix)**: Custom DNS resolver for Supabase to bypass regional ISP blocks (hardcoded Cloudflare IP fallback).
- **Network-Free Ingestion**: Background tasks invoke ingestion logic directly on the server to avoid brittle `localhost` networking issues.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router / Turbopack) |
| **Styling** | Tailwind CSS + Vanilla CSS (Aesthetics) |
| **Animations** | Framer Motion |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Auth** | Supabase SSR (Auth Helper) |
| **Icons** | Lucide React |
| **LLM Providers** | Groq, HuggingFace, OpenRouter |
| **Markdown** | React-Markdown + RemarkGFM |
| **Syntax Highlighting** | React-Syntax-Highlighter |

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── chat/         # Core AI loop & web search
│   │   └── rag/          # Ingestion, storage & retrieval
│   ├── chat/[id]/        # Main streaming interface
│   ├── memory/           # Memory management dashboard
│   └── settings/         # User preferences
├── components/
│   └── ui/               # Premium React components
├── context/              # Auth & Global state
├── utils/
│   └── supabase/         # SSR client initializers
└── supabase_rag_setup.sql # Database schema & vector logic
```

---

## 🔧 Getting Started

### 1. Prerequisites
- Node.js 18+
- Supabase Project (with `pgvector` enabled)
- API Keys: Groq, HuggingFace, and OpenRouter

### 2. Environment Variables (`.env.local`)
Create a `.env.local` file with the following:
```env
# AI Models
GROQ_API_KEY=your_key
HF_TOKEN=your_token
OPENROUTER_KEY=your_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Setup
Run the contents of `supabase_rag_setup.sql` in your Supabase SQL Editor. This will:
- Enable the `vector` extension.
- Create the `rag_memories` table.
- Install the `match_memories` similarity search function.

### 4. Installation
```bash
npm install
npm run dev
```

---

## 📜 Maintenance & Debugging

Aria features a robust **Error Detection Method**:
- **Structured Logs**: Backend errors are tagged (e.g., `[RAG Ingest Error]`) for instant diagnosis in the terminal.
- **Fallbacks**: If HuggingFace embedding fails, Aria gracefully falls back to strict keyword matching.
- **Direct Ingestion**: Memory processing is handled as an async background function, totally bypassing `localhost` networking bugs common on Windows development environments.

---

## 📄 License
Education and Personal use only. Built with 💜 for the next generation of AI assistants.
