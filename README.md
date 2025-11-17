# musicASD - AI-Powered Music Therapy Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-green)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow)](https://www.python.org/)

An AI-powered music therapy platform designed to support children with Autism Spectrum Disorder (ASD) through personalized music interventions, real-time engagement tracking, and data-driven insights.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Usage Guide](#-usage-guide)
- [Development](#-development)
- [Deployment](#-deployment)
- [Research Background](#-research-background)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Capabilities

- **AI-Powered Music Analysis**: GPT-5.1 integration for intelligent music element analysis based on child profiles
- **Comprehensive Child Profiles**: 7-section profile system covering demographics, sensory preferences, communication, behavioral patterns, music preferences, therapy goals, and medical history
- **Real-Time Session Management**: Track engagement levels (LOW/MED/HIGH), music responses, and therapy outcomes
- **Personalized Music Playback**: Curated music library with 18+ tracks across 3 categories (Calm, Happy, Energetic)
- **Advanced Analytics**: Detailed reporting and insights on therapy effectiveness and progress
- **Secure Authentication**: JWT-based authentication with email verification and password reset
- **Trial System**: 14-day trial period for new users with subscription management
- **Azure Cloud Storage**: Scalable data storage for user profiles, sessions, and files

### Therapeutic Features

- **Engagement Tracking**: Monitor child engagement in real-time during therapy sessions
- **Music Response Logging**: Record and analyze child responses to different music interventions
- **Progress Visualization**: Charts and graphs showing therapy progress over time
- **Caregiver Dashboard**: Comprehensive interface for managing multiple child profiles
- **Session History**: Complete history of all therapy sessions with detailed metrics
- **Goal Tracking**: Set and monitor therapeutic goals for each child

### Technical Features

- **MCP Integration**: Model Context Protocol for AI interactions
- **Camera Integration Ready**: Framework prepared for MediaPipe-based engagement detection
- **Programmatic Music Generation**: Dynamic audio generation capabilities
- **File Upload Support**: Upload and manage custom audio files
- **Real-Time Updates**: WebSocket support for live session updates
- **Responsive Design**: Mobile-friendly interface with Radix UI components
- **Data Export**: Export session data for external analysis

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.3 | React framework with Turbopack |
| **React** | 19.0.0 | UI library |
| **TypeScript** | 5.5.4 | Type safety |
| **Tailwind CSS** | 3.4.9 | Styling |
| **Radix UI** | Latest | Accessible components |
| **TanStack Query** | 5.51.21 | Data fetching & caching |
| **Zustand** | 4.5.4 | State management |
| **Framer Motion** | 11.3.0 | Animations |
| **Recharts** | 2.12.7 | Data visualization |
| **WaveSurfer.js** | 7.8.2 | Audio waveform visualization |
| **Axios** | 1.7.3 | HTTP client |
| **React Hot Toast** | 2.4.1 | Notifications |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115.6 | Web framework |
| **Python** | 3.11+ | Runtime |
| **Uvicorn** | 0.32.1 | ASGI server |
| **Pydantic** | 2.10.3 | Data validation |
| **Azure Blob Storage** | Latest | Cloud storage |
| **OpenAI API** | 1.57.4 | GPT integration |
| **JWT** | 2.10.1 | Authentication |
| **bcrypt** | 4.2.1 | Password hashing |
| **python-multipart** | 0.0.20 | File uploads |
| **python-dotenv** | 1.0.1 | Environment management |
| **aiosmtplib** | 3.0.2 | Email service |

### Infrastructure

- **Azure Blob Storage**: User data, profiles, sessions, and file storage
- **Azure SMTP**: Email delivery for verification and notifications
- **Node.js**: 20.9+ for frontend build and development
- **npm**: Package management

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                 │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │  Dashboard   │   Profiles   │   Sessions & Analytics   │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API / WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │   Auth   │ Profiles │ Sessions │  Music   │ Analytics │ │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘ │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GPT Integration │ MCP Server │ Email Service       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬───────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Azure Blob Storage                              │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ Users & Auth │   Profiles   │  Sessions & Files        │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Project Structure

```
musicASD/
├── frontend/                 # Next.js 16 application
│   ├── app/                 # Next.js app directory
│   │   ├── (auth)/         # Authentication pages
│   │   ├── dashboard/      # Main dashboard
│   │   ├── profiles/       # Child profile management
│   │   ├── sessions/       # Therapy session interface
│   │   ├── analytics/      # Data visualization
│   │   └── api/            # API route handlers
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── music/         # Music player components
│   │   ├── profiles/      # Profile management
│   │   └── ui/            # Reusable UI components
│   ├── lib/               # Utilities and helpers
│   │   ├── api.ts         # API client
│   │   ├── api-types.ts   # TypeScript types
│   │   └── utils.ts       # Utility functions
│   ├── hooks/             # Custom React hooks
│   └── public/            # Static assets
│
├── backend/                # FastAPI application
│   ├── api/               # API route handlers
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── profiles.py    # Child profile endpoints
│   │   ├── sessions.py    # Session management
│   │   ├── music.py       # Music playback
│   │   └── analytics.py   # Analytics endpoints
│   ├── services/          # Business logic
│   │   ├── auth.py        # Authentication service
│   │   ├── azure_storage.py # Azure storage operations
│   │   ├── email_service.py # Email notifications
│   │   ├── gpt_service.py   # OpenAI GPT integration
│   │   └── mcp_server.py    # MCP protocol handler
│   ├── models/            # Data models
│   │   └── schemas.py     # Pydantic schemas
│   ├── core/              # Core configuration
│   │   └── config.py      # Settings and environment
│   ├── middleware/        # Custom middleware
│   │   └── rate_limit.py  # Rate limiting
│   └── main.py           # Application entry point
│
├── lib/                   # Shared libraries
│   └── music_library.json # Music track catalog
│
└── research_project_proposal.md # Research documentation
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.9 or higher
- **Python** 3.11 or higher
- **npm** or **yarn**
- **Azure Storage Account** (for production)
- **OpenAI API Key** (for GPT features)
- **SMTP Server** (for email features)

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd musicASD
```

2. **Set up environment variables** (see [Environment Setup](#-environment-setup))

3. **Install and run** (see [Installation](#-installation))

## 🔧 Environment Setup

### Backend Environment Variables

Create `backend/.env` file:

```env
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_CONTAINER_NAME=musicasd-data

# JWT Authentication
JWT_SECRET_KEY=your_secure_random_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080  # 7 days

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Email Service (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=your_email@gmail.com
SMTP_FROM_NAME=musicASD Platform

# Application
ENVIRONMENT=development
DEBUG=True
```

### Frontend Environment Variables

Create `frontend/.env.local` file:

```env
# API URLs (configured via next.config.js)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/backend
NEXT_PUBLIC_MCP_URL=http://localhost:3000/api/mcp
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

### Generating Secret Keys

```bash
# Generate JWT secret key (Python)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📦 Installation

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv .venv

# Activate on Windows
.venv\Scripts\activate

# Activate on macOS/Linux
source .venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Verify installation**
```bash
python -c "import fastapi; print(f'FastAPI {fastapi.__version__}')"
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Verify installation**
```bash
npm list next react
```

## 🎯 Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

#### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will be available at:
- Application: `http://localhost:3000` (or next available port)
- With Turbopack enabled by default

### Production Mode

#### Build Frontend

```bash
cd frontend
npm run build
npm run start
```

#### Run Backend with Production Server

```bash
cd backend
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/send-verification-code` | Send 6-digit verification code | No |
| POST | `/auth/verify-code` | Verify email with code | No |
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with credentials | No |
| GET | `/auth/me` | Get current user profile | Yes |
| DELETE | `/auth/account` | Delete user account | Yes |
| POST | `/auth/request-password-reset` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### Child Profile Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/profiles/create` | Create child profile | Yes |
| GET | `/profiles/list` | List all child profiles | Yes |
| GET | `/profiles/{child_id}` | Get specific profile | Yes |
| PUT | `/profiles/{child_id}` | Update profile | Yes |
| DELETE | `/profiles/{child_id}` | Delete profile | Yes |
| POST | `/profiles/{child_id}/analyze` | Generate GPT analysis | Yes |
| GET | `/profiles/{child_id}/music-elements` | Get music analysis | Yes |

### Session Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/sessions/start` | Start therapy session | Yes |
| POST | `/sessions/{session_id}/end` | End session | Yes |
| POST | `/sessions/{session_id}/engagement` | Update engagement level | Yes |
| POST | `/sessions/{session_id}/music-response` | Log music response | Yes |
| GET | `/sessions/{child_id}/list` | List child sessions | Yes |
| GET | `/sessions/{session_id}` | Get session details | Yes |

### Music & Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/music/library` | Get music catalog | Yes |
| POST | `/music/play` | Play music track | Yes |
| GET | `/analytics/child/{child_id}` | Get child analytics | Yes |
| GET | `/analytics/session/{session_id}` | Get session analytics | Yes |

### Interactive API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📖 Usage Guide

### 1. User Registration

1. Navigate to the registration page
2. Enter email and click "Send Verification Code"
3. Check email for 6-digit code (valid for 5 minutes)
4. Enter code and complete registration
5. Receive 14-day free trial

### 2. Creating Child Profiles

1. Log in to dashboard
2. Click "Add Child Profile"
3. Complete 7-section profile:
   - **Demographics**: Name, age, diagnosis
   - **Sensory Preferences**: Sound sensitivities, preferences
   - **Communication**: Verbal abilities, preferences
   - **Behavioral Patterns**: Typical behaviors, triggers
   - **Music Preferences**: Favorite genres, instruments
   - **Goals**: Therapy objectives
   - **Medical History**: Relevant conditions, medications

4. Save profile to generate AI music analysis

### 3. Running Therapy Sessions

1. Select child profile from dashboard
2. Click "Start Session"
3. Monitor engagement level (LOW/MED/HIGH)
4. Play music from recommended categories
5. Log child responses (Positive/Neutral/Negative)
6. Add session notes
7. End session to save data

### 4. Viewing Analytics

1. Navigate to Analytics section
2. Select child profile
3. View charts showing:
   - Engagement trends over time
   - Music preference patterns
   - Response effectiveness
   - Goal progress
   - Session frequency

### 5. Managing Subscription

- Trial period: 14 days from registration
- View trial status in profile settings
- Upgrade before trial expiration
- Trial end date displayed in dashboard

## 👩‍💻 Development

### Code Style

- **Frontend**: ESLint + TypeScript strict mode
- **Backend**: PEP 8 with type hints
- **Formatting**: Prettier (frontend), Black (backend)

### Type Safety

```bash
# Frontend type checking
cd frontend
npm run type-check

# Generate API types from OpenAPI
npm run generate-types
```

### Running Tests

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend
pytest
```

### Development Tools

- **Frontend Hot Reload**: Turbopack (10x faster Fast Refresh)
- **Backend Hot Reload**: Uvicorn with --reload
- **API Testing**: Swagger UI at /docs
- **React DevTools**: Browser extension recommended
- **TanStack Query DevTools**: Included in development mode

## 🚀 Deployment

### Azure Deployment (Recommended)

#### Frontend (Azure Static Web Apps)

```bash
# Build for production
cd frontend
npm run build

# Deploy to Azure Static Web Apps
# Follow Azure portal instructions
```

#### Backend (Azure App Service)

```bash
# Create requirements.txt is up to date
cd backend
pip freeze > requirements.txt

# Deploy to Azure App Service
# Configure environment variables in Azure portal
```

#### Storage (Azure Blob Storage)

1. Create Azure Storage Account
2. Create container: `musicasd-data`
3. Configure connection string in backend environment

### Environment-Specific Configuration

- Set `ENVIRONMENT=production` in backend .env
- Update CORS origins in `backend/main.py`
- Configure custom domain in Azure
- Enable HTTPS/SSL certificates
- Set up Azure CDN for static assets

## 🔬 Research Background

musicASD is based on research in music therapy for autism spectrum disorder. The platform implements evidence-based approaches including:

- **Music-based interventions** for social and communication skills
- **Real-time engagement monitoring** for adaptive therapy
- **Data-driven insights** for therapy optimization
- **Caregiver involvement** in therapeutic process

For detailed research background, see [research_project_proposal.md](./research_project_proposal.md)

### Key Research Areas

- Music therapy effectiveness for ASD
- AI-assisted therapeutic interventions
- Engagement detection and analysis
- Personalized music selection
- Data collection and analysis for therapy outcomes

## 🗺 Roadmap

### Current Features (v1.0)
- ✅ User authentication and authorization
- ✅ Child profile management (7 sections)
- ✅ GPT-powered music analysis
- ✅ Session management
- ✅ Music playback (18+ tracks)
- ✅ Basic analytics

### Planned Features (v2.0)
- 🔄 MediaPipe integration for camera-based engagement detection
- 🔄 Advanced analytics with ML insights
- 🔄 Real-time WebSocket updates
- 🔄 Custom music upload and management
- 🔄 Multi-language support
- 🔄 Mobile app (React Native)

### Future Enhancements (v3.0)
- 📋 Collaborative sessions (multiple caregivers)
- 📋 Integration with therapy practice management
- 📋 Research data export and anonymization
- 📋 Insurance claim integration
- 📋 Telehealth video sessions

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Use conventional commit messages

## 📄 License

MIT License - Use freely for therapy, research, and educational purposes.

## 🙏 Acknowledgments

- Music therapy research community
- Autism advocacy organizations
- Open source contributors
- Azure and OpenAI for infrastructure and AI capabilities

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Review API documentation at `/docs`
- Check troubleshooting section below

## ⚠️ Troubleshooting

### Backend Issues

**Backend won't start**
- Verify Python 3.11+ installed: `python --version`
- Check all environment variables in `.env`
- Ensure Azure Storage credentials are correct
- Install dependencies: `pip install -r requirements.txt`

**Database/Storage errors**
- Verify Azure Storage connection string
- Check container name matches configuration
- Ensure proper permissions on storage account

### Frontend Issues

**Build errors**
- Clear Next.js cache: `rm -rf .next`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (requires 20.9+)

**API connection issues**
- Ensure backend is running on port 8000
- Check proxy configuration in `next.config.js`
- Verify environment variables in `.env.local`

### Authentication Issues

**Email verification not working**
- Check SMTP configuration in backend `.env`
- Verify email credentials (use app password for Gmail)
- Check spam/junk folder for verification emails
- Review backend logs for email errors

**Token expired errors**
- JWT tokens expire after 7 days (configurable)
- Log out and log in again to get new token
- Clear browser cache/cookies if persisting

### Session Issues

**Port conflicts**
- Frontend may run on different port (3000, 3001, 3003)
- Check terminal output for actual port
- Update bookmarks to correct port

**Performance issues**
- Ensure Turbopack is enabled (default in Next.js 16)
- Check for memory leaks in long-running sessions
- Monitor Azure storage throttling limits

---

**Built with ❤️ for supporting children with autism and their caregivers**
