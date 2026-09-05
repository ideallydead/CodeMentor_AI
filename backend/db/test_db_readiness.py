import pytest
from backend.db import session
from backend.db.models import Base, User, Assignment, TestCase, VivaQuestion, Submission, Report


def test_init_db_postgres_fallback_to_sqlite():
    # Pass unreachable PostgreSQL URL -> Should catch exception and initialize SQLite fallback without crashing
    invalid_pg_url = "postgresql+psycopg2://invalid_user:invalid_pass@127.0.0.1:59999/non_existent_db"
    session.init_db(invalid_pg_url)
    assert session.SessionLocal is not None

    db = session.SessionLocal()
    assert db is not None
    db.close()


def test_database_models_metadata_completeness():
    tables = Base.metadata.tables
    expected_tables = {'users', 'assignments', 'test_cases', 'viva_questions', 'submissions', 'reports'}
    assert expected_tables.issubset(set(tables.keys()))

    # Verify Submission columns
    sub_table = tables['submissions']
    sub_columns = {c.name for c in sub_table.columns}
    assert {'id', 'assignment_id', 'student_id', 'source_code', 'language', 'status', 'final_grade', 'faculty_score', 'faculty_notes'}.issubset(sub_columns)


def test_alembic_config_imports():
    from alembic.config import Config
    alembic_cfg = Config("alembic.ini")
    assert alembic_cfg.get_main_option("script_location") == "alembic"
