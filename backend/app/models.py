from datetime import datetime,timezone
from sqlalchemy import DateTime,Integer,Numeric
from sqlalchemy.orm import Mapped,mapped_column
from .db import Base
class Simulation(Base):
    __tablename__='simulations'
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    initial_capital:Mapped[float]=mapped_column(Numeric(15,2),nullable=False)
    monthly_contribution:Mapped[float]=mapped_column(Numeric(15,2),nullable=False)
    monthly_rate:Mapped[float]=mapped_column(Numeric(8,4),nullable=False)
    months:Mapped[int]=mapped_column(Integer,nullable=False)
    final_amount:Mapped[float]=mapped_column(Numeric(15,2),nullable=False)
    created_at:Mapped[datetime]=mapped_column(DateTime,default=lambda:datetime.now(timezone.utc),nullable=False)
