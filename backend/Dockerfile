
FROM python:3.11-slim

WORKDIR /app

# Зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Код приложения
COPY . .

# Порт приложения
EXPOSE 8000

# Запуск uvicorn из папки backend (точка входа main:app)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
