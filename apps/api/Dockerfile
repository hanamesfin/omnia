FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2, sentence-transformers, etc.
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download the sentence-transformer model at build time
# so the container is fully offline-capable (§11.2)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 8000
