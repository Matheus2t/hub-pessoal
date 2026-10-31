from pathlib import Path
from decimal import Decimal, InvalidOperation, localcontext
from fastapi import Depends,FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .calculator import calculate_compound
from .config import settings
from .db import SessionLocal,get_db
from .models import Simulation
from .schemas import CalculationInput,CalculationResult,HistoryItem
from .finance import router as finance_router
from .market import router as market_router
from .sports import router as sports_router
app=FastAPI(title='Hub Pessoal API',version='1.0.0')
app.include_router(finance_router)
app.include_router(market_router)
app.include_router(sports_router)
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.api_cors_origins.split(',')],allow_methods=['*'],allow_headers=['*'])
@app.get('/api/health')
def health():return {'status':'ok'}
@app.post('/api/calculations',response_model=CalculationResult)
def calculate(data:CalculationInput,db:Session|None=Depends(get_db)):
    months = data.months * (12 if data.period_unit == 'years' else 1)
    if months > 600:
        raise HTTPException(422, 'O prazo máximo é de 600 meses (50 anos).')
    with localcontext() as ctx:
        ctx.prec = 40
        rate = data.monthly_rate if data.rate_unit == 'monthly' else ((1 + data.monthly_rate / 100) ** (Decimal(1) / 12) - 1) * 100
        try:
            result=calculate_compound(data.initial_capital,data.monthly_contribution,rate,months)
        except (InvalidOperation, OverflowError):
            raise HTTPException(422, 'Os valores excedem o limite de cálculo. Reduza a taxa ou o prazo.')
    if db is None:
        return result
    try:
        db.add(Simulation(initial_capital=data.initial_capital,monthly_contribution=data.monthly_contribution,monthly_rate=rate,months=months,final_amount=result['final_amount']));db.commit()
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
frontend_dir=Path(__file__).resolve().parents[2]/'dist'
if frontend_dir.is_dir():app.mount('/',StaticFiles(directory=frontend_dir,html=True),name='frontend')
