from fastapi import Depends,FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .calculator import calculate_compound
from .config import settings
from .db import get_db
from .models import Simulation
from .schemas import CalculationInput,CalculationResult,HistoryItem
app=FastAPI(title='Hub Pessoal API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.api_cors_origins.split(',')],allow_methods=['*'],allow_headers=['*'])
@app.get('/api/health')
def health():return {'status':'ok'}
@app.post('/api/calculations',response_model=CalculationResult)
def calculate(data:CalculationInput,db:Session=Depends(get_db)):
    result=calculate_compound(data.initial_capital,data.monthly_contribution,data.monthly_rate,data.months);db.add(Simulation(initial_capital=data.initial_capital,monthly_contribution=data.monthly_contribution,monthly_rate=data.monthly_rate,months=data.months,final_amount=result['final_amount']));db.commit();return result
@app.get('/api/calculations/history',response_model=list[HistoryItem])
def history(db:Session=Depends(get_db)):return db.query(Simulation).order_by(Simulation.created_at.desc()).limit(10).all()
