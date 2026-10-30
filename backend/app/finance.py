"""Database-independent financial calculations; see docs/finance.md."""
from decimal import Decimal, localcontext
from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel, Field
from .calculator import money

router = APIRouter(prefix='/api/finance')

class FinanceInput(BaseModel):
    capital: Decimal = Field(gt=0, le=1_000_000_000, max_digits=12, decimal_places=2)
    rate: Decimal = Field(ge=0, le=100)
    periods: int = Field(ge=1, le=600)
    period_unit: Literal['months', 'years'] = 'months'
    rate_unit: Literal['monthly', 'annual'] = 'monthly'

def normalized(data: FinanceInput, simple=False):
    n = data.periods * (12 if data.period_unit == 'years' else 1)
    if n > 600:
        from fastapi import HTTPException
        raise HTTPException(422, 'O prazo máximo é de 600 meses (50 anos).')
    rate = data.rate / 100
    if data.rate_unit == 'annual':
        rate = rate / 12 if simple else (1 + rate) ** (Decimal(1) / 12) - 1
    return n, rate

def compute(kind: str, data: FinanceInput):
    with localcontext() as ctx:
        ctx.prec = 40
        n, rate = normalized(data, kind == 'simple')
        capital = money(data.capital)
        rows = []
        if kind == 'simple':
            previous = Decimal(0)
            for month in range(1, n + 1):
                total = money(capital * rate * month)
                rows.append(dict(month=month, interest=money(total-previous), deposit=Decimal(0), invested=capital, balance=capital+total))
                previous = total
            return dict(final_amount=capital+previous, total_invested=capital, total_interest=previous, evolution=rows)
        payment = money(capital / n if rate == 0 else capital * rate / (1 - (1 + rate) ** -n))
        balance = capital
        total_interest = Decimal(0)
        for month in range(1, n + 1):
            interest = money(balance * rate)
            amortization = money(capital / n) if kind == 'sac' else payment - interest
            amortization = balance if month == n else min(balance, amortization)
            balance = money(balance - amortization)
            total_interest += interest
            rows.append(dict(month=month, payment=money(amortization+interest), amortization=amortization, interest=interest, balance=balance))
        return dict(total_paid=money(capital+total_interest), total_interest=money(total_interest), first_payment=rows[0]['payment'], last_payment=rows[-1]['payment'], schedule=rows)

@router.post('/{kind}')
def finance(kind: Literal['simple', 'price', 'sac'], data: FinanceInput):
    return compute(kind, data)
