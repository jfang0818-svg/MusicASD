# 🚀 Launch Configuration Guide

## Quick Start

Press `F5` in VS Code and select **"🚀 Full Stack (Recommended)"** to run both backend and frontend together.

---

## ✨ What's New in Your Improved launch.json

### 🔧 **Fixed Issues:**

1. **✅ Corrected API URL** - Changed from `http://localhost:8000/api/v1` to `http://localhost:8000`
   - Most endpoints are at root level (`/session/*`, `/music/*`, `/profile/*`)
   - Only analytics uses `/api/v1/analytics/*`

2. **✅ Removed SQLite** - Removed obsolete `DATABASE_URL` environment variable
   - Project now uses **Azure Blob Storage** + **Redis** (Phase 2)

3. **✅ Added Redis Configuration** - Added required `REDIS_URL` for session management
   - Default: `redis://localhost:6379/0`
   - Make sure Redis is running: `redis-server` (Windows: `redis-server.exe`)

4. **✅ Added Azure & OpenAI Placeholders** - Clear instructions for adding API keys
   - Uses `${env:AZURE_STORAGE_CONNECTION_STRING}` to read from system environment
   - Uses `${env:OPENAI_API_KEY}` to keep secrets out of version control

5. **✅ Updated App Version** - Changed from `1.0.0` to `2.0.0` (reflects Phase 1-5 updates)

6. **✅ Added New Configurations:**
   - `Frontend: Type Check` - Run TypeScript type checking
   - `Edge: Debug Frontend` - Debug in Microsoft Edge
   - `Frontend: Next.js Production` - Test production build locally

---

## 📋 Prerequisites

Before launching, ensure you have:

### **1. Redis Running (Required for Phase 2)**
```bash
# Windows
redis-server.exe

# macOS/Linux
redis-server
```

### **2. Environment Variables Set**

Create/update your system environment variables (or use `.env` file):

```bash
# Azure Blob Storage (Get from Azure Portal → Storage Account → Access Keys)
AZURE_STORAGE_CONNECTION_STRING=your_connection_string_here

# OpenAI API Key (Get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_api_key_here
```

### **3. Dependencies Installed**

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

---

## 🎯 Launch Configurations

### **Compound Configurations (Run Multiple at Once)**

| Name | What It Does | When to Use |
|------|-------------|-------------|
| 🚀 Full Stack (Recommended) | Backend + Frontend | **Default choice** - Start here! |
| 🔍 Full Stack + Chrome DevTools | Backend + Frontend + Chrome | Frontend debugging with DevTools |
| 🎵 Full Stack + MCP Server | Backend + MCP + Frontend | Testing MCP server integration |

### **Individual Configurations**

| Name | What It Does | When to Use |
|------|-------------|-------------|
| ⚡ Backend Only | FastAPI backend server | Backend-only development/testing |
| ⚛️ Frontend Only | Next.js frontend dev server | Frontend-only development |
| 🔌 MCP Server Only | MCP server standalone | MCP integration testing |

### **Utility Configurations**

| Name | What It Does |
|------|-------------|
| Frontend: Type Check | Run TypeScript compiler checks |
| Frontend: Next.js Build | Build production frontend |
| Frontend: Next.js Production | Test production build locally |
| Python: Current File | Debug currently open Python file |

---

## 🌍 Environment Variables Reference

### **Backend (FastAPI)**

```bash
# Environment
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
RELOAD=true

# Security (Change in production!)
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_CONTAINER_NAME=musicasd-container
AZURE_USE_EMULATOR=false

# OpenAI API
OPENAI_API_KEY=your_api_key
GPT_MODEL=gpt-4
GPT_TEMPERATURE=0.7

# Redis (Phase 2 - Required!)
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=10
REDIS_DECODE_RESPONSES=true

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_MUSIC_GENERATION=true
ENABLE_FILE_UPLOAD=true
ENABLE_GPT_SUGGESTIONS=true
MCP_ENABLED=true
MEDIAPIPE_ENABLED=false
```

### **Frontend (Next.js)**

```bash
# Backend URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_MCP_URL=http://localhost:3000/api/mcp

# App Info
NEXT_PUBLIC_APP_NAME=musicASD
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_ENVIRONMENT=development
```

---

## 🐛 Debugging Tips

### **Backend Debugging**
- **Set breakpoints** in Python files
- **`justMyCode: false`** - Step into library code
- **`showReturnValue: true`** - See function return values in debugger

### **Frontend Debugging**
- **Chrome DevTools** - Use "Full Stack + Chrome DevTools" configuration
- **React DevTools** - Install Chrome extension for component inspection
- **Network Tab** - Monitor API calls to backend

### **Common Issues**

#### ❌ "Redis connection failed"
```bash
# Start Redis server first
redis-server
```

#### ❌ "AZURE_STORAGE_CONNECTION_STRING not found"
```bash
# Add to system environment variables or .env file
export AZURE_STORAGE_CONNECTION_STRING="your_connection_string"
```

#### ❌ "OPENAI_API_KEY not found"
```bash
# Add to system environment variables or .env file
export OPENAI_API_KEY="your_api_key"
```

#### ❌ "Port 8000 already in use"
```bash
# Find and kill the process
# Windows: netstat -ano | findstr :8000
# macOS/Linux: lsof -i :8000
```

---

## 📊 Project Architecture

```
musicASD/
├── backend/               # FastAPI backend
│   ├── main.py           # Main server entry point
│   ├── api/              # API endpoints
│   ├── core/             # Configuration & state
│   ├── services/         # Redis, Azure, Auth services
│   └── .env              # Environment variables
│
├── frontend/             # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # API client & utilities
│
└── .vscode/
    └── launch.json       # Debug configurations (YOU ARE HERE!)
```

---

## 🎓 Best Practices

1. **Always use "Full Stack" compound** for development
2. **Keep secrets in environment variables**, not in launch.json
3. **Use `.env` file for local development** (already in `.gitignore`)
4. **Start Redis before launching** backend (Phase 2 requirement)
5. **Check backend logs** for Azure/OpenAI connection status
6. **Use browser DevTools** for frontend debugging

---

## 📚 Additional Resources

- **Backend Config:** `backend/core/config.py` - All environment variables defined here
- **Environment Example:** `backend/.env.example` - Template for `.env` file
- **API Documentation:** `http://localhost:8000/docs` - Swagger UI (when running)
- **Frontend:** `http://localhost:3000` - Next.js dev server

---

**Happy Coding! 🎵✨**
