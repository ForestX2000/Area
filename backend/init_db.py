from app.database.database import Base, engine


def init_db():
    from app.models.project import Project  

    Base.metadata.create_all(bind=engine)
    print("Таблицы базы данных успешно созданы.")


if __name__ == "__main__":
    init_db()
