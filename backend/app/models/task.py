from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean
)

from app.database import Base


class Task(Base):

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    assigned_to = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    priority = Column(
        String(20),
        default="Medium",
        index=True
    )

    status = Column(
        String(20),
        default="Pending",
        index=True
    )

    due_date = Column(
        DateTime,
        nullable=False,
        index=True
    )

    is_deleted = Column(
        Boolean,
        default=False,
        index=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )