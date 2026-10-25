
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import files, health, panoramas, projects


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
    expose_headers=panoramas.STITCH_HEADERS,
)


# Подключаем маршруты
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(panoramas.router)


@app.get("/")
def root():
    return {
        "message": "Area API is running",
    }
