from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.db.session import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='student')
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship('Submission', back_populates='student')


class Assignment(Base):
    __tablename__ = 'assignments'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    language = Column(String(50), nullable=False)
    is_approved = Column(Boolean, default=False)
    draft_tests = Column(JSON, default=[])
    draft_viva = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    test_cases = relationship('TestCase', back_populates='assignment')
    viva_questions = relationship('VivaQuestion', back_populates='assignment')
    submissions = relationship('Submission', back_populates='assignment')


class TestCase(Base):
    __tablename__ = 'test_cases'

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=False)
    input_data = Column(Text)
    expected_output = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship('Assignment', back_populates='test_cases')


class VivaQuestion(Base):
    __tablename__ = 'viva_questions'

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=False)
    prompt = Column(Text)
    expected_concepts = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship('Assignment', back_populates='viva_questions')


class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    source_code = Column(Text)
    language = Column(String(50), nullable=False)
    status = Column(String(50), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship('Assignment', back_populates='submissions')
    student = relationship('User', back_populates='submissions')
    report = relationship('Report', uselist=False, back_populates='submission')


class Report(Base):
    __tablename__ = 'reports'

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey('submissions.id'), nullable=False)
    aggregated_output = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship('Submission', back_populates='report')
