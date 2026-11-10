import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# DATABASE_URL points at a hosted Postgres (Neon) so accounts survive restarts of the free Space.
# Without it the app falls back to a local SQLite file, which is fine for development.
_url = os.getenv("DATABASE_URL", "").strip()
if _url.startswith("postgres://"):
    _url = "postgresql://" + _url[len("postgres://"):]
if _url.startswith("postgresql://"):
    _url = "postgresql+psycopg2://" + _url[len("postgresql://"):]

if _url:
    DATABASE_URL = _url
    # Neon puts idle compute to sleep; pre-ping and recycling reconnect transparently after a wake-up.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=240, pool_size=5, max_overflow=5)
else:
    DATA_DIR = "/data" if os.path.isdir("/data") else "."
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


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, index=True, nullable=False)
    name       = Column(String, nullable=False)
    reason     = Column(String, default="")
    status     = Column(String, default="pending", index=True)  # pending | approved | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)


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
        if db.query(User).filter(User.role == "admin").first():
            return
        email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        password = os.getenv("ADMIN_PASSWORD", "")
        if not email or not password:
            if _url:
                print("[DB] No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD as secrets to create one.")
                return
            email, password = "admin@wafer.com", "admin123"  # local development only
            print("[DB] Development admin created: admin@wafer.com / admin123")
        db.add(User(email=email, name="Admin", password=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(), role="admin"))
        db.commit()
        print(f"[DB] Admin created: {email}")
    finally:
        db.close()
