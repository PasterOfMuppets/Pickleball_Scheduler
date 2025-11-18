# Docker Setup Guide

This guide explains how to run the Pickleball Scheduler application using Docker containers.

## Overview

The application runs in **3 lightweight containers**:
1. **Database** (PostgreSQL 15) - ~50MB memory
2. **Backend** (FastAPI/Python) - ~100MB memory
3. **Frontend** (React/Vite dev server) - ~150MB memory

**Total overhead: ~300MB** - very efficient!

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

Install from: https://docs.docker.com/get-docker/

## Quick Start

### 1. Configure Environment (Optional)

For development, the defaults work fine. For production or to use SMS/Email:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

### 2. Start All Services

```bash
# Build and start all containers
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

This will:
- Build the backend and frontend images (first time only, ~2-5 minutes)
- Start PostgreSQL, Backend, and Frontend containers
- Run database migrations automatically
- Enable hot-reload for development

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:6900
- **API Docs**: http://localhost:6900/docs

### 4. Stop All Services

```bash
# Stop containers (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop, remove containers AND delete data
docker-compose down -v
```

## Development Workflow

### Hot Reload

Both frontend and backend have hot-reload enabled:

**Backend**: Edit files in `backend/app/` - server auto-restarts
**Frontend**: Edit files in `frontend/src/` - browser auto-refreshes

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Run Commands Inside Containers

```bash
# Backend shell (for Python commands)
docker-compose exec backend bash

# Frontend shell (for npm commands)
docker-compose exec frontend sh

# Database shell
docker-compose exec db psql -U postgres -d pickleball_scheduler
```

### Database Migrations

```bash
# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback last migration
docker-compose exec backend alembic downgrade -1
```

### Run Tests

```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend npm test
```

### Rebuild After Dependency Changes

```bash
# If you update requirements.txt or package.json
docker-compose up -d --build
```

## Production Deployment

For production, use the optimized frontend build:

```bash
# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

(Note: Create `docker-compose.prod.yml` to override frontend target to `production`)

Or manually:

```bash
# Build production frontend
cd frontend
docker build --target production -t pickleball-frontend:prod .

# Run with nginx
docker run -d -p 80:80 pickleball-frontend:prod
```

## Troubleshooting

### Containers won't start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Database connection errors

```bash
# Ensure database is healthy
docker-compose ps db

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Port conflicts

If ports 5173, 6900, or 5433 are already in use:

```bash
# Edit docker-compose.yml and change port mappings
# Example: Change "5173:5173" to "3000:5173"
```

### Clear all data and restart

```bash
# WARNING: This deletes ALL data
docker-compose down -v
docker-compose up -d
```

## Resource Usage

Check container resource usage:

```bash
docker stats
```

Expected usage:
- **db**: ~50MB RAM, <1% CPU (idle)
- **backend**: ~100MB RAM, <5% CPU (idle)
- **frontend**: ~150MB RAM, <5% CPU (idle)

## Architecture

```
┌─────────────────┐
│   Browser       │
│  localhost:5173 │
└────────┬────────┘
         │
    ┌────▼──────────────────────┐
    │  Frontend Container       │
    │  (Vite Dev Server)        │
    │  Port: 5173               │
    └────┬──────────────────────┘
         │ /api/* proxied to backend
    ┌────▼──────────────────────┐
    │  Backend Container        │
    │  (FastAPI/Uvicorn)        │
    │  Port: 6900               │
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Database Container       │
    │  (PostgreSQL 15)          │
    │  Port: 5432 (internal)    │
    │  Port: 5433 (external)    │
    └───────────────────────────┘
```

All containers communicate via a Docker network named `pickleball_network`.

## Useful Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# View logs
docker-compose logs -f [service]

# Rebuild
docker-compose up -d --build

# Shell access
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec db psql -U postgres -d pickleball_scheduler

# Database operations
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic revision --autogenerate -m "msg"

# Testing
docker-compose exec backend pytest
docker-compose exec frontend npm test

# Clean up
docker-compose down          # Stop and remove containers
docker-compose down -v       # Also remove volumes (data)
docker system prune          # Clean up unused Docker resources
```

## Next Steps

1. Start the containers: `docker-compose up -d`
2. Create an admin user (see CLAUDE.md "Creating Initial Admin User")
3. Access the app at http://localhost:5173
4. Check out the API docs at http://localhost:6900/docs

For more details, see:
- **CLAUDE.md** - Project overview and development guide
- **pickleball_league_scheduler_design_v1_3.md** - Complete system design
- **claude_code_setup_guide.md** - Phase-by-phase implementation guide
