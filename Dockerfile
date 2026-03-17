FROM python:3.10-slim

# Set the working directory to /app
WORKDIR /app

# Copy requirements from the backend folder and install them
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend folder into /app/backend
COPY backend/ backend/

# Expose the API port
EXPOSE 7860 
# Note: Hugging Face Spaces expects port 7860, not 8000!

# Critical: Add /app to PYTHONPATH so Python can find the 'backend' module
ENV PYTHONPATH=/app

# Start the application using the correct module path
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]