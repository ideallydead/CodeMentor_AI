"""
Database Truncation & Reset Utility for CodeMentor AI.
Wipes all tables in dependency order and re-seeds default development users (faculty & student).
Supports both local SQLite (codementor.db) and Docker PostgreSQL.

Usage:
    python -m backend.reset_db
"""

import sys
import backend.db.session as session_module
from backend.db import models
from backend.core.config import settings


def reset_database():
    print(f"Connecting to database: {settings.database_url}")
    session_module.init_db(settings.database_url)
    db = session_module.SessionLocal()

    tables_to_clear = [
        models.Report,
        models.Submission,
        models.VivaQuestion,
        models.TestCase,
        models.Assignment,
        models.User,
    ]

    try:
        print("Truncating all records in dependency order...")
        for model in tables_to_clear:
            count = db.query(model).delete()
            print(f"  - Deleted {count} records from '{model.__tablename__}'")

        db.commit()
        print("[OK] All application data truncated.")

        # Reset primary key sequences so next IDs start fresh at 1
        try:
            bind = db.get_bind()
            dialect = bind.dialect.name
            from sqlalchemy import text
            if dialect == 'postgresql':
                with bind.connect() as conn:
                    conn.execute(text("""
                        ALTER SEQUENCE assignments_id_seq RESTART WITH 1;
                        ALTER SEQUENCE test_cases_id_seq RESTART WITH 1;
                        ALTER SEQUENCE submissions_id_seq RESTART WITH 1;
                        ALTER SEQUENCE reports_id_seq RESTART WITH 1;
                        ALTER SEQUENCE viva_questions_id_seq RESTART WITH 1;
                    """))
                    conn.commit()
                print("[OK] PostgreSQL sequences reset to 1.")
            elif dialect == 'sqlite':
                with bind.connect() as conn:
                    conn.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('reports', 'submissions', 'viva_questions', 'test_cases', 'assignments');"))
                    conn.commit()
                print("[OK] SQLite sequence counters reset to 1.")
        except Exception as seq_err:
            print(f"[WARN] Could not reset sequences: {seq_err}")

        print("Re-seeding initial development users (student101 and faculty)...")
        session_module._seed_initial_data(db.get_bind())
        print("[OK] Default users re-seeded.")

        counts = {
            "Users (login accounts)": db.query(models.User).count(),
            "Assignments": db.query(models.Assignment).count(),
            "Submissions": db.query(models.Submission).count(),
            "Reports": db.query(models.Report).count(),
            "Test Cases": db.query(models.TestCase).count(),
            "Viva Questions": db.query(models.VivaQuestion).count(),
        }
        db.close()

        # Vacuum SQLite database to reclaim disk space
        if settings.database_url.startswith("sqlite"):
            import sqlalchemy
            print("Vacuuming SQLite database file...")
            engine = sqlalchemy.create_engine(settings.database_url)
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                conn.execute(sqlalchemy.text("VACUUM"))
            print("[OK] SQLite database vacuumed.")

        print("\nFinal Database Record Counts:")
        for tbl, cnt in counts.items():
            print(f"  - {tbl:<24}: {cnt}")

        print("\n[OK] Database reset complete and ready for use!")



    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Database reset failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        try:
            db.close()
        except Exception:
            pass


if __name__ == "__main__":
    reset_database()

