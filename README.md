# CoreSense AI Coach Platform

## 🎯 Overview

CoreSense is a comprehensive AI coaching platform that combines mobile wellness tracking with intelligent conversation capabilities. The platform features a React Native mobile app for health insights and a Python FastAPI backend with OpenAI integration for personalized coaching conversations.

**Key Features:**
- 📱 React Native mobile app for health tracking and wellness insights
- 🤖 AI coaching through natural conversation
- 🔄 Real-time message processing and response generation
- 📊 Health data analysis and pattern recognition
- 🚀 Scalable FastAPI backend with modular architecture
- 🔐 Secure authentication and data management
- 💾 Supabase integration for database and auth

## 📁 Project Structure

```
.
├── backend/                          # FastAPI backend service
│   ├── api/                         # API endpoints and routing
│   │   ├── ai_coach.py             # Main AI coach endpoints
│   │   ├── health_insights.py      # Health data analysis endpoints
│   │   ├── messages.py             # Message processing endpoints
│   │   └── notifications.py        # Notification management
│   ├── core/                        # Core business logic
│   │   ├── ai_coach_service.py     # AI coaching functionality
│   │   ├── health_insights_service.py  # Health analysis
│   │   ├── message_limit_service.py   # Rate limiting
│   │   ├── notification_service.py    # Notification handling
│   │   └── pattern_recognition.py     # Pattern analysis
│   ├── models/                      # Data models
│   │   ├── health_metrics.py       # Health data models
│   │   ├── messages.py             # Message models
│   │   └── users.py                # User models
│   ├── db/                          # Database layer
│   │   ├── connection.py           # Database connection
│   │   ├── health_metrics_repo.py  # Health metrics repository
│   │   ├── messages_repo.py        # Messages repository
│   │   └── users_repo.py           # Users repository
│   ├── utils/                       # Utilities and helpers
│   │   ├── auth.py                 # Authentication utilities
│   │   ├── config.py               # Configuration management
│   │   ├── logger.py               # Logging utilities
│   │   └── validators.py           # Data validation
│   ├── main.py                      # FastAPI application entry point
│   ├── requirements.txt             # Python dependencies
│   └── Dockerfile                   # Docker configuration
│
├── coresense/                        # React Native mobile app
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ChatMessage.tsx     # Message display component
│   │   │   ├── HealthCard.tsx      # Health metrics card
│   │   │   └── CoachInput.tsx      # Chat input component
│   │   ├── screens/                # App screens
│   │   │   ├── HomeScreen.tsx      # Main dashboard
│   │   │   ├── ChatScreen.tsx      # AI coach chat
│   │   │   └── HealthScreen.tsx    # Health insights
│   │   ├── services/               # API and external services
│   │   │   ├── api.ts              # Backend API client
│   │   │   ├── auth.ts             # Authentication service
│   │   │   └── health.ts           # Health data service
│   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── useAuth.ts          # Authentication hook
│   │   │   ├── useHealth.ts        # Health data hook
│   │   │   └── useChat.ts          # Chat functionality hook
│   │   ├── types/                  # TypeScript type definitions
│   │   │   ├── api.ts              # API types
│   │   │   ├── health.ts           # Health data types
│   │   │   └── chat.ts             # Chat types
│   │   ├── utils/                  # Utility functions
│   │   │   ├── date.ts             # Date utilities
│   │   │   ├── formatting.ts       # Data formatting
│   │   │   └── validation.ts       # Input validation
│   │   └── App.tsx                 # Main app component
│   ├── package.json                # Dependencies and scripts
│   ├── tsconfig.json              # TypeScript configuration
│   └── app.json                   # Expo configuration
│
├── docs/                            # Documentation
│   ├── architecture/               # System architecture docs
│   │   ├── API_DESIGN.md          # API design guidelines
│   │   ├── DATABASE_SCHEMA.md     # Database structure
│   │   └── SYSTEM_OVERVIEW.md     # High-level system overview
│   ├── deployment/                # Deployment guides
│   │   ├── BACKEND_DEPLOYMENT.md  # Backend deployment
│   │   ├── MOBILE_DEPLOYMENT.md   # Mobile app deployment
│   │   └── DOCKER.md              # Docker deployment guide
│   ├── development/               # Development guides
│   │   ├── SETUP.md               # Local development setup
│   │   ├── CONTRIBUTING.md        # Contribution guidelines
│   │   └── TESTING.md             # Testing guidelines
│   ├── api/                       # API documentation
│   │   ├── AI_COACH_API.md        # AI coach endpoints
│   │   ├── HEALTH_INSIGHTS_API.md # Health insights endpoints
│   │   └── NOTIFICATIONS_API.md   # Notification endpoints
│   └── guides/                    # User and feature guides
│       ├── USER_GUIDE.md          # End-user documentation
│       ├── FEATURE_GUIDE.md       # Feature documentation
│       └── TROUBLESHOOTING.md     # Common issues and solutions
│
├── docker-compose.yml              # Multi-service Docker setup
├── .gitignore                      # Git ignore rules
└── README.md                       # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- React Native development environment
- Docker (optional)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the backend server
python main.py
```

The backend will be available at `http://localhost:8000`

### Mobile App Setup

```bash
# Navigate to mobile app directory
cd coresense

# Install dependencies
npm install

# Start the development server
npx expo start

# Run on device/simulator
npx expo run:ios    # iOS
npx expo run:android # Android
```

### Docker Setup (Alternative)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Setup Guide](docs/development/SETUP.md)** - Local development environment setup
- **[Architecture Overview](docs/architecture/SYSTEM_OVERVIEW.md)** - System design and architecture
- **[API Documentation](docs/api/)** - Complete API reference
- **[Deployment Guide](docs/deployment/)** - Production deployment instructions
- **[Contributing Guidelines](docs/development/CONTRIBUTING.md)** - How to contribute to the project

## 🔧 Development

### Backend Development
```bash
cd backend
python -m pytest tests/          # Run tests
python -m black .                # Format code
python -m flake8 .               # Lint code
```

### Mobile Development
```bash
cd coresense
npm test                         # Run tests
npm run lint                     # Lint code
npm run format                   # Format code
```

## 🏗️ Architecture

The platform follows a modular architecture:

- **Backend**: FastAPI with service-oriented design
- **Mobile**: React Native with component-based architecture
- **Database**: Supabase for authentication and data storage
- **AI Integration**: OpenAI GPT for conversational AI
- **Deployment**: Docker containerization with compose orchestration

## 🧪 Testing

```bash
# Backend tests
cd backend && python -m pytest

# Mobile app tests
cd coresense && npm test
```

## 📈 Performance

The platform is optimized for:
- Fast API response times (< 200ms)
- Efficient mobile app performance
- Scalable database queries
- Real-time message processing

## 🔒 Security

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure environment variable management
- Database query protection

## 🤝 Contributing

Please read [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) for guidelines on contributing to this project.

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check the [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)
- Review the [API Documentation](docs/api/)
- Contact the development team

---

**Note**: This project has been recently refactored for improved maintainability and developer experience. Legacy code has been consolidated and the architecture follows modern best practices.
