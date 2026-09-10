# Imagen del backend de Estada (FastAPI + Uvicorn).
FROM python:3.11-slim

WORKDIR /app

# Dependencias Python. psycopg2-binary incluye libpq, no requiere compilación.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código de la aplicación.
COPY app ./app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
