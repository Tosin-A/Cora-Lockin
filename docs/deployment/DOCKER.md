# Docker Setup for CoreSense Project

This directory contains Docker configuration files for containerizing the entire CoreSense project, including the backend API, frontend application, and ML training components.

## 🏗️ Architecture

The Docker setup uses a **multi-stage Dockerfile** with different build targets for various use cases:

- **`backend`**: FastAPI backend service only
- **`ml-training`**: ML model training environment
- **`dev`**: Complete development environment
- **`production`**: Full-stack production deployment
- **`frontend-builder`**: Frontend build stage
- **`frontend-server`**: Static frontend serving

## 📁 Files Created

- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Orchestration for different environments
- `.dockerignore` - Files and directories to exclude from build context
- `nginx.conf` - Nginx configuration for frontend serving

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (create `.env` file)

### Environment Setup

Create a `.env` file in the project root with required variables:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
GPT_MODEL=gpt-4o-mini

# Messaging Configuration
MESSAGING_PROVIDER=local
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
BOT_PHONE_NUMBER=your_bot_phone_number

# Application Configuration
PORT=8000
ENVIRONMENT=development
```

## 🛠️ Usage Examples

### Backend Service Only

**Using Docker Compose:**
```bash
docker-compose up backend
```

**Using Docker directly:**
```bash
docker build --target backend -t coresense-backend .
docker run -p 8000:8000 --env-file .env coresense-backend
```

### Development Environment

Start the complete development environment:

```bash
docker-compose up dev
```

This provides:
- Backend API on http://localhost:8000
- Frontend dev server on http://localhost:8081
- All dependencies installed
- Volume mounting for live code reloading

**Access the development container:**
```bash
docker exec -it $(docker-compose ps -q dev) bash
```

### ML Training

Start the ML training environment:

```bash
docker-compose up ml-training
```

**Run training:**
```bash
docker exec -it $(docker-compose ps -q ml-training) python therunfile.py
```

### Production Deployment

**Backend only:**
```bash
docker-compose up backend
```

**Full stack with frontend:**
```bash
docker-compose up production
```

**Frontend only (static serving):**
```bash
docker-compose up frontend
```

### Build Specific Targets

```bash
# Backend service
docker build --target backend -t coresense-backend .

# Development environment
docker build --target dev -t coresense-dev .

# ML training environment
docker build --target ml-training -t coresense-ml .

# Production full stack
docker build --target production -t coresense-prod .
```

## 🔧 Service Configuration

### Backend Service (`backend`)
- **Port**: 8000
- **Framework**: FastAPI with Uvicorn
- **Health Check**: http://localhost:8000/health
- **Use Case**: API services, webhooks, backend logic

### Development Service (`dev`)
- **Ports**: 8000 (backend), 8081 (frontend dev server)
- **Features**: Live reloading, all dependencies, development tools
- **Use Case**: Full development workflow

### ML Training Service (`ml-training`)
- **Dependencies**: MLX, MLX-LM, all training libraries
- **Volumes**: Persistent storage for trained models
- **Use Case**: Model training and fine-tuning

### Frontend Server (`frontend`)
- **Port**: 3000
- **Framework**: Nginx serving static build
- **Use Case**: Production frontend deployment

## 📊 Docker Compose Services

| Service | Target | Port | Description |
|---------|--------|------|-------------|
| `backend` | `backend` | 8000 | FastAPI backend service |
| `dev` | `dev` | 8000, 8081 | Development environment |
| `ml-training` | `ml-training` | - | ML training environment |
| `frontend` | `frontend-server` | 3000 | Static frontend server |
| `production` | `production` | 8000 | Full stack production |

## 🐛 Troubleshooting

### Common Issues

**1. Port conflicts:**
```bash
# Check what's using the port
lsof -i :8000

# Stop conflicting services
docker-compose down
```

**2. Environment variables not loaded:**
- Ensure `.env` file is in the project root
- Check variable names match exactly
- Use `docker-compose config` to validate

**3. Build failures:**
```bash
# Clean build
docker system prune -a
docker-compose build --no-cache

# Check Docker daemon resources
docker system df
```

**4. Volume mounting issues:**
```bash
# Reset volumes
docker-compose down -v
docker system prune -a
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f dev
docker-compose logs -f ml-training

# Docker direct
docker logs -f <container_id>
```

### Container Shell Access

```bash
# Development container
docker-compose exec dev bash

# Backend container
docker-compose exec backend bash

# ML training container
docker-compose exec ml-training bash
```

## 🔄 Development Workflow

### Local Development

1. **Start development environment:**
   ```bash
   docker-compose up dev
   ```

2. **Access containers:**
   ```bash
   docker-compose exec dev bash
   ```

3. **Run commands:**
   ```bash
   # Backend development
   docker-compose exec dev uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

   # Frontend development
   docker-compose exec dev cd coresense && npm start

   # ML training
   docker-compose exec dev python therunfile.py
   ```

### Production Deployment

1. **Build and deploy:**
   ```bash
   docker-compose up --build -d production
   ```

2. **Monitor:**
   ```bash
   docker-compose logs -f production
   ```

## 🔒 Security Features

- **Non-root user**: All containers run as non-root user
- **Health checks**: Automated health monitoring
- **Security headers**: Nginx configuration includes security headers
- **Environment isolation**: Separate environments for dev/prod

## 📈 Performance

### Optimization Tips

1. **Multi-stage builds**: Reduces final image size
2. **Layer caching**: Dependencies cached separately
3. **Volume mounting**: Live code reloading in development
4. **Health checks**: Automatic container recovery

### Resource Allocation

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

## 🚀 Scaling

### Horizontal Scaling

```bash
# Scale backend service
docker-compose up --scale backend=3
```

### Load Balancing

Use the `frontend` service with nginx for load balancing backend services.

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Native/Expo Documentation](https://docs.expo.dev/)
- [MLX Documentation](https://ml-explore.github.io/mlx/)