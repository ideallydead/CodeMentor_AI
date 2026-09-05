"""Initial database schema migration for CodeMentor AI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-07-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='student'),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )

    # 2. Create assignments table
    op.create_table(
        'assignments',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('is_approved', sa.Boolean(), server_default='false'),
        sa.Column('draft_tests', sa.JSON(), nullable=True),
        sa.Column('draft_viva', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )

    # 3. Create test_cases table
    op.create_table(
        'test_cases',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('assignments.id'), nullable=False),
        sa.Column('input_data', sa.Text(), nullable=True),
        sa.Column('expected_output', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )

    # 4. Create viva_questions table
    op.create_table(
        'viva_questions',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('assignments.id'), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=True),
        sa.Column('expected_concepts', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )

    # 5. Create submissions table
    op.create_table(
        'submissions',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('assignments.id'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('source_code', sa.Text(), nullable=True),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='pending'),
        sa.Column('final_grade', sa.String(length=50), nullable=True),
        sa.Column('faculty_score', sa.Integer(), nullable=True),
        sa.Column('faculty_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )

    # 6. Create reports table
    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('submission_id', sa.Integer(), sa.ForeignKey('submissions.id'), nullable=False),
        sa.Column('aggregated_output', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_table('reports')
    op.drop_table('submissions')
    op.drop_table('viva_questions')
    op.drop_table('test_cases')
    op.drop_table('assignments')
    op.drop_table('users')
