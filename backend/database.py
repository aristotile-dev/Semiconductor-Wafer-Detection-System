import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# Use HF persistent storage if available, else local
DATA_DIR     = "/data" if os.path.isdir("/data") else "."
DATABASE_URL = f"sqlite:///{DATA_DIR}/wafer.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, unique=True, index=True, nullable=False)
    name       = Column(String, nullable=False)
    password   = Column(String, nullable=False)
    role       = Column(String, default="user")  # "admin" or "user"
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("PredictionHistory", back_populates="user", cascade="all, delete")


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    wafer_id     = Column(String, nullable=False)
    defect_type  = Column(String, nullable=False)
    confidence   = Column(Float, nullable=False)
    yield_pct    = Column(Float, nullable=False)
    decision     = Column(String, nullable=False)
    defect_ratio = Column(Float, nullable=False)
    timestamp    = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="predictions")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        import bcrypt
        admin = db.query(User).filter(User.email == "admin@wafer.com").first()
        if not admin:
            hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
            admin_user = User(
                email    = "admin@wafer.com",
                name     = "Admin",
                password = hashed,
                role     = "admin"
            )
            db.add(admin_user)
            db.commit()
            print("[DB] Default admin created: admin@wafer.com / admin123")
    finally:
        db.close()
