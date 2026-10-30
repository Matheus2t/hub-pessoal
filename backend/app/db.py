from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase,sessionmaker
from .config import settings
engine=create_engine(settings.database_url,pool_pre_ping=True) if settings.database_url else None
SessionLocal=sessionmaker(bind=engine,autocommit=False,autoflush=False) if engine else None
class Base(DeclarativeBase):pass
def get_db():
    if SessionLocal is None:
        yield None
        return
    db=SessionLocal()
    try:yield db
    finally:db.close()
