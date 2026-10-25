
# ============================================================
# Фронтенд: React + TypeScript + Vite
# Сборка: node -> статику отдаёт nginx
# ============================================================

# Этап 1: сборка приложения
FROM node:20-alpine AS builder

WORKDIR /app

# Ставим зависимости (кешируются отдельным слоем)
COPY package.json package-lock.json ./
RUN npm ci

# Копируем исходники и собираем
COPY . .
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Этап 2: отдача статики через nginx
FROM nginx:alpine AS runner

WORKDIR /usr/share/nginx/html

# Удаляем дефолтный конфиг и ставим свой (роутинг React + прокси /api)
COPY --from=builder /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
