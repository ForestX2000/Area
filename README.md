 
# Area

Интерактивные карты помещений с привязкой 360°-панорам (MVP).

## Стек

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, react-router-dom v7
- **Backend:** Python + FastAPI
- **Хранение:** проекты — JSON-файлы; планы и панорамы — локальные папки
- **Карта:** SVG · **Панорамы:** Pannellum · **Офлайн:** Service Worker + Cache Storage + IndexedDB
- SQL-базы не используются

## Структура репозитория

```
/                       корень репозитория
├── .gitignore          gitignore (в т.ч. *.pdf — кейсы не храним в Git)
├── docker-compose.yaml сборка фронтенда + бэкенда
├── .env.example        пример переменных окружения
├── backend/            FastAPI-приложение
│   ├── Dockerfile      сборка бэкенда (python:3.11-slim)
│   ├── main.py         точка входа FastAPI
│   ├── requirements.txt зависимости Python
│   ├── app/            исходный код бэкенда (api, database, repositories, schemas, services)
│   └── tests/          тесты API
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

## Запуск всего стека через Docker

```bash
# Скопируйте пример переменных
cp .env.example .env

# Собрать и поднять фронтенд + бэкенд
docker compose up --build -d

# Фронтенд: http://localhost:3000
# Бэкенд API: http://localhost:8000
# Прокси через nginx: http://localhost:3000/api/...
```

Остановить:
```bash
docker compose down
```

## Запуск фронтенда (разработка, без Docker)

```bash
cd frontend
npm install          # один раз
npm run dev          # http://localhost:5173
npm run build        # сборка в dist/
npm run preview      # предпросмотр сборки
npm run lint         # ESLint
```

## Запуск бэкенда (разработка, без Docker)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API-контракт

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/projects` | Список проектов |
| POST | `/api/projects` | Создать проект |
| GET | `/api/projects/{id}` | Загрузить проект |
| PUT | `/api/projects/{id}` | Сохранить проект |
| DELETE | `/api/projects/{id}` | Удалить проект |
| POST | `/api/projects/{id}/files` | Загрузить план или панораму (в разработке) |
| GET | `/api/projects/{id}/files` | Список файлов проекта (в разработке) |
| GET | `/api/files/{file_id}` | Скачать файл (в разработке) |

## Авторизация (MVP, без бэкенда)

- `/auth` — вход / регистрация (данные хранятся в `localStorage`)
- `/profile` — профиль пользователя (доступен после входа)
- Пароль минимум 6 символов, email с `@`

## Что сделано (фронт)

1. ✅ `.gitignore`: `*.pdf` и кейс-инфа.pdf исключены из Git
2. ✅ Страница проектов: карандаш ✏️ рядом с каждым проектом (редактирование названия/описания), удаление, создание, пустое состояние, оформление карточек
3. ✅ Страница входа/регистрации (`/auth`)
4. ✅ Профиль пользователя (`/profile`): имя, email, аватара, счетчик проектов, выход
5. ✅ Docker: `frontend/Dockerfile`, `backend/Dockerfile`, `nginx.conf`, `docker-compose.yaml`, `.env.example`
6. ✅ `api.ts` — единый модуль API по контракту, готов к переключению на `fetch`
7. ✅ Бэкенд подключён к compose, прокси `/api` через nginx на `backend:8000`

## Что осталось (бэкенд)

- Реализовать загрузку и выдачу файлов (планы/панорамы): `POST/GET /api/projects/{id}/files`, `GET /api/files/{file_id}`
- Сохранять файлы в локальные папки `data/media/plans` и `data/media/panoramas`
- Проверить сохранение и повторную загрузку проектов

После готовности бэкенда — слияние веток и запуск через `docker compose up --build`.
