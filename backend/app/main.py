from fastapi import Depends,FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .calculator import calculate_compound
from .config import settings
from .db import SessionLocal,get_db
from .models import Simulation
from .schemas import CalculationInput,CalculationResult,HistoryItem
app=FastAPI(title='Hub Pessoal API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.api_cors_origins.split(',')],allow_methods=['*'],allow_headers=['*'])
@app.get('/api/health')
def health():return {'status':'ok'}
@app.post('/api/calculations',response_model=CalculationResult)
def calculate(data:CalculationInput,db:Session|None=Depends(get_db)):
    result=calculate_compound(data.initial_capital,data.monthly_contribution,data.monthly_rate,data.months)
    if db is None:
        return result
    try:
        db.add(Simulation(initial_capital=data.initial_capital,monthly_contribution=data.monthly_contribution,monthly_rate=data.monthly_rate,months=data.months,final_amount=result['final_amount']));db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail='Banco de dados indisponível ou DATABASE_URL não configurada.') from exc
    return result
@app.get('/api/calculations/history',response_model=list[HistoryItem])
def history():
    if not settings.public_history_enabled:
        raise HTTPException(status_code=404, detail='Histórico público desativado neste ambiente.')
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail='Histórico indisponível sem DATABASE_URL configurada.')
    db=SessionLocal()
    try:return db.query(Simulation).order_by(Simulation.created_at.desc()).limit(10).all()
    except SQLAlchemyError as exc: raise HTTPException(status_code=503, detail='Banco de dados indisponível ou DATABASE_URL não configurada.') from exc
    finally:db.close()
