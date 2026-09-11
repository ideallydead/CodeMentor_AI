from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()
SessionLocal = None


def _apply_db_migrations(engine):
    """Automatically add new columns to existing tables if missing (for both Postgres & SQLite)."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if 'submissions' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('submissions')]
        with engine.begin() as conn:
            if 'final_grade' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN final_grade VARCHAR(50)"))
            if 'faculty_score' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN faculty_score INTEGER"))
            if 'faculty_notes' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN faculty_notes TEXT"))
            if 'viva_answers' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN viva_answers JSON"))
            if 'viva_verified' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN viva_verified BOOLEAN DEFAULT FALSE"))
            if 'viva_score' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN viva_score INTEGER"))
            if 'viva_feedback' not in columns:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN viva_feedback TEXT"))



def _seed_initial_data(engine):
    """Seed initial default users (faculty, TAs, and students) if not present to satisfy FK constraints."""
    from backend.db import models
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        users_to_seed = [
            # Faculty & Academic Staff
            {"id": 1, "email": "faculty@codementor.edu", "role": "faculty", "password": "faculty123"},
            {"id": 2, "email": "prof.ada@codementor.edu", "role": "faculty", "password": "faculty123"},
            {"id": 3, "email": "ta.hopper@codementor.edu", "role": "faculty", "password": "ta123"},

            # Students
            {"id": 101, "email": "student101@codementor.edu", "role": "student", "password": "student123"},
            {"id": 102, "email": "student102@codementor.edu", "role": "student", "password": "student123"},
            {"id": 103, "email": "student103@codementor.edu", "role": "student", "password": "student123"},
            {"id": 104, "email": "student104@codementor.edu", "role": "student", "password": "student123"},
            {"id": 105, "email": "student105@codementor.edu", "role": "student", "password": "student123"},
        ]

        for u in users_to_seed:
            existing = db.query(models.User).filter_by(id=u["id"]).first()
            if not existing:
                new_user = models.User(
                    id=u["id"],
                    email=u["email"],
                    hashed_password=u["password"],
                    role=u["role"]
                )
                db.add(new_user)

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def init_db(database_url: str):
    global SessionLocal
    is_sqlite = database_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    pool_kwargs = {} if is_sqlite else {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}

    try:
        engine = create_engine(database_url, connect_args=connect_args, echo=False, future=True, **pool_kwargs)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        from backend.db.models import Base as ModelsBase
        ModelsBase.metadata.create_all(bind=engine)
        _seed_initial_data(engine)
        _apply_db_migrations(engine)
    except Exception as exc:
        if not database_url.startswith("sqlite"):
            print(f"[Notice] Could not connect to PostgreSQL ({database_url}). Falling back to local SQLite DB (sqlite:///./codementor.db)...")
            fallback_url = "sqlite:///./codementor.db"
            engine = create_engine(fallback_url, connect_args={"check_same_thread": False}, echo=False, future=True)
            SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
            from backend.db.models import Base as ModelsBase
            ModelsBase.metadata.create_all(bind=engine)
            _seed_initial_data(engine)
            _apply_db_migrations(engine)
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
