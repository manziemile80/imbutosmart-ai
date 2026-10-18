FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Train at build time if the CSV is present and models are missing.
RUN if [ -f nisr_real_data.csv ] && [ ! -f models/classifier.joblib ]; then python ml_pipeline.py; fi
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
