from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from sqlalchemy import BigInteger
from app.database import Base
from sqlalchemy.orm import relationship

class TaskFile(Base):

    __tablename__ = "task_files"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    task_id = Column(
        Integer,
        ForeignKey("tasks.id"),
        nullable=False
    )


    original_file_name = Column(
        String(255),
        nullable=False
    )


    stored_file_name = Column(
    String(255),
    nullable=False,
    unique=True
    )


    content_type = Column(
        String(100),
        nullable=False
    )


    file_size = Column(
    BigInteger,
    nullable=False
    )


    file_path = Column(
        String(500),
        nullable=False
    )


    uploaded_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )


    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    task = relationship("Task")
    uploader = relationship("User")