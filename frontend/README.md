# Frontend Area

Клиент приложения Area на React, TypeScript, Vite и Tailwind CSS. Чертежи отображаются в SVG, панорамы 360° — через Pannellum.

Описание возможностей, запуск через Docker, аккаунты и хранение данных приведены в [основном README](../README.md).

## Запуск

Требуется Node.js 22.12 или новее. Команды выполняются из каталога `frontend`:

```bash
npm ci
npm run dev
```

Клиент доступен на `http://localhost:5173`. Backend должен работать на `http://127.0.0.1:8000`; Vite проксирует к нему запросы `/api`.

Адрес API для сборки задаётся переменной `VITE_API_URL` в `frontend/.env.local`. Стандартное значение — `/api`.

## Проверки

```bash
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
```

`npm run build` создаёт сборку в `dist`. Playwright запускает сервер разработки автоматически.

Для использования установленного Microsoft Edge в PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm.cmd run test:e2e
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Проверка публичной ссылки с работающим backend:

```powershell
$env:PLAYWRIGHT_LIVE_API = '1'
npx.cmd playwright test tests/sharing-live.spec.ts
Remove-Item Env:PLAYWRIGHT_LIVE_API
```

В PowerShell при ограничении выполнения `.ps1` используйте `npm.cmd` и `npx.cmd`.

## Организация кода

- `src/pages` — страницы проектов, карты, редактора, Workspace, профиля и статистики.
- `src/components/editor` — холст, фигуры, инструменты, свойства и обучение.
- `src/components/workspace` — общий холст карт и группировка.
- `src/components/route` — выбор точек и отображение маршрутов.
- `src/contexts` — состояние аккаунта и подтверждения действий.
- `src/utils` — локальные хранилища, API, маршрутизация и публичные снимки.
- `src/types` — типы проектов, этажей, чертежей и точек.
- `tests` — браузерные проверки.

Публичный маршрут `/share/:shareId` доступен независимо от сессии. Страницы редактирования и управления находятся внутри маршрутов с проверкой роли.

Цвета и темы определены переменными в `src/index.css`. Светлая и тёмная версии используют общие семантические классы; выбор темы сохраняется в браузере.
