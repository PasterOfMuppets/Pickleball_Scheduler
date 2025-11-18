# Backend Dockerfile for Pickleball Scheduler
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for alembic
RUN mkdir -p alembic/versions

# Make startup script executable
RUN chmod +x startup.sh

# Expose port
EXPOSE 6900

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:6900/health', timeout=5)" || exit 1

# Run database migrations and start server
CMD ["bash", "startup.sh"]
