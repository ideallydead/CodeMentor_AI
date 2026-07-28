from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()
SessionLocal = None


def init_db(database_url: str):
    global SessionLocal
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    try:
        engine = create_engine(database_url, connect_args=connect_args, echo=False, future=True)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        from backend.db.models import Base as ModelsBase
        ModelsBase.metadata.create_all(bind=engine)
    except Exception as exc:
        if not database_url.startswith("sqlite"):
            print(f"[Notice] Could not connect to PostgreSQL ({database_url}). Falling back to local SQLite DB (sqlite:///./codementor.db)...")
            fallback_url = "sqlite:///./codementor.db"
            engine = create_engine(fallback_url, connect_args={"check_same_thread": False}, echo=False, future=True)
            SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
            from backend.db.models import Base as ModelsBase
            ModelsBase.metadata.create_all(bind=engine)
        else:
            raise exc


def get_db():
    if SessionLocal is None:
        raise RuntimeError('Database has not been initialized')
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
