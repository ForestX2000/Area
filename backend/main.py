
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, projects


app = FastAPI(
    title="Area API",
    description="API для сервиса интерактивных карт помещений",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Подключаем маршруты
app.include_router(health.router)
app.include_router(projects.router)


@app.get("/")
def root():
    return {
        "message": "Area API is running",
    }
