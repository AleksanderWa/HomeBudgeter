FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend directory to /app/backend to maintain import structure
COPY . /app/backend/

# Set PYTHONPATH to include the app directory
ENV PYTHONPATH=/app

EXPOSE 8000

# Default command if not overridden by docker-compose
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]