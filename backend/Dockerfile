FROM python:3.11-slim

# Install system dependencies for OpenCV and PyMuPDF/Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces expects a non-root user (UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code with proper ownership
COPY --chown=user:user . $HOME/app

# Create necessary directories and ensure proper permissions
RUN mkdir -p uploads heatmaps && chown -R user:user uploads heatmaps

# Switch to the non-root user
USER user

# Expose port (Hugging Face Spaces defaults to 7860)
EXPOSE 7860

# Start FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
