
# ZavoznoyRepo

Интерактивные карты помещений с привязкой 360°-панорам (MVP).

## Стек

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, react-router-dom v7
- **Backend:** Python + FastAPI (планируется)
- **Хранение:** проекты — JSON-файлы; планы и панорамы — локальные папки
- **Карта:** SVG · **Панорамы:** Pannellum · **Офлайн:** Service Worker + Cache Storage + IndexedDB
- SQL-базы не используются

## Структура репозитория

```
/                       корень репозитория
├── .gitignore          gitignore (в т.ч. *.pdf — кейсы не храним в Git)
├── docker-compose.yaml сборка фронтенда + заглушка бэкенда
├── .env.example        пример переменных окружения
├── frontend/           React-приложение (Vite)
│   ├── Dockerfile      многоэтапная сборка (node → nginx)
│   ├── nginx.conf      роутинг SPA + прокси /api на бэкенд
│   ├── src/
│   │   ├── pages/      страница проектов, проект, карта, вход, профиль
│   │   ├── components/ карточка проекта, шапка, просмотр панорамы
│   │   ├── contexts/   AuthContext (авторизация, мок)
│   │   ├── utils/      api.ts (единый модуль API), хранилища, авторизация
│   │   ├── types/      Project, MapPoint
│   │   └── layouts/    MainLayout
│   └── public/         статика (favicon, иконки)
└── кейс инфа.pdf       не отслеживается Git
```

## Запуск фронтенда (разработка)

```bash
cd frontend
npm install          # один раз
npm run dev          # http://localhost:5173
npm run build        # сборка в dist/
npm run preview      #-preview сборки
npm run lint         # ESLint
```

## Запуск через Docker

```bash
# Скопируйте пример переменных
cp .env.example .env

# Собрать и поднять фронтенд
docker compose up --build -d

# Фронтенд: http://localhost:3000
# Бэкенд: пока заглушка в docker-compose.yaml — добавить ./backend при готовности
```

## Авторизация (MVP, без бэкенда)

- `/auth` — вход / регистрация (данные хранятся в `localStorage`)
- `/profile` — профиль пользователя (доступен после входа)
- Пароль минимум 6 символов, email с `@`

## Что сделано (фронт)

1. ✅ `.gitignore`: `*.pdf` и кейс-инфа.pdf исключены из Git
2. ✅ Страница проектов: карандаш ✏️ рядом с каждым проектом (редактирование названия/описания), удаление, создание, пустое состояние, оформление карточек
3. ✅ Страница входа/регистрации (`/auth`)
4. ✅ Профиль пользователя (`/profile`): имя, email, аватара, счетчик проектов, выход
5. ✅ Docker: `frontend/Dockerfile`, `nginx.conf`, `docker-compose.yaml`, `.env.example`
6. ✅ `api.ts` — единый модуль API по контракту, готов к переключению на `fetch`

## Этап 2 (план)

Соединить фронт с реальным FastAPI по контракту:

- `GET/POST/PUT/DELETE /api/projects{/{id}}`
- `POST/GET /api/projects/{id}/files`
- `GET /api/files/{file_id}`

После готовности бэкенда — слияние веток и запуск через `docker compose up`.
