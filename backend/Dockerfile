FROM python:3.12-slim

WORKDIR /app

# Install system deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-create both cache directories. Named volumes shadow image layers at
# runtime but the app also calls os.makedirs(); this is belt-and-suspenders.
RUN mkdir -p /app/cache/gallery /app/.cache/huggingface

# Explicit HuggingFace cache path — user-independent so it works whether the
# container runs as root or a non-root user.
ENV HF_HOME=/app/.cache/huggingface

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
