from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.finance import FinanceInput, compute
from app.main import app, calculate
from app.schemas import CalculationInput

client = TestClient(app)

def data(**kwargs):
    return FinanceInput(**(dict(capital='1000', rate='1', periods=3) | kwargs))

def test_simple_independent_formula():
    result = compute('simple', data())
    assert result['final_amount'] == Decimal('1030.00')
    assert result['total_interest'] == 30
    assert sum(row['interest'] for row in result['evolution']) == 30

@pytest.mark.parametrize('kind,total,payments', [
    ('price', '1020.07', ['340.02', '340.02', '340.03']),
    ('sac', '1020.00', ['343.33', '340.00', '336.67']),
])
def test_loan_reference_and_accounting(kind, total, payments):
    result = compute(kind, data())
    assert result['total_paid'] == Decimal(total)
    assert [row['payment'] for row in result['schedule']] == list(map(Decimal, payments))
    assert sum(row['amortization'] for row in result['schedule']) == 1000
    assert result['schedule'][-1]['balance'] == 0

@pytest.mark.parametrize('kind', ['simple', 'price', 'sac'])
@pytest.mark.parametrize('capital,rate,periods', [('0.01', '0', 600), ('1000000000', '100', 600), ('1000', '0', 1)])
def test_extremes(kind, capital, rate, periods):
    result = compute(kind, data(capital=capital, rate=rate, periods=periods))
    if kind != 'simple':
        assert result['schedule'][-1]['balance'] == 0
        assert all(row['amortization'] >= 0 and row['balance'] >= 0 for row in result['schedule'])
        assert sum(row['payment'] for row in result['schedule']) == result['total_paid']

def test_annual_simple_proportional_and_compound_effective():
    assert compute('simple', data(rate=12, periods=1, period_unit='years', rate_unit='annual'))['final_amount'] == 1120
    annual = compute('price', data(rate='12.6825030131969720661201', periods=12, rate_unit='annual'))
    monthly = compute('price', data(rate=1, periods=12))
    assert annual['total_paid'] == monthly['total_paid']
    result = calculate(CalculationInput(initial_capital=1000, monthly_contribution=0, monthly_rate='12.6825030131969720661201', months=1, rate_unit='annual', period_unit='years'), None)
    assert result['final_amount'] == Decimal('1126.84')

@pytest.mark.parametrize('updates', [dict(capital=0), dict(rate=-1), dict(periods=0), dict(periods=601), dict(periods=51, period_unit='years'), dict(capital='NaN'), dict(capital='0.001'), dict(rate_unit='daily')])
def test_invalid_input(updates):
    response = client.post('/api/finance/price', json=dict(capital=1000, rate=1, periods=3) | updates)
    assert response.status_code == 422

@pytest.mark.parametrize('kind', ['simple', 'price', 'sac'])
def test_public_api_no_db(kind):
    response = client.post('/api/finance/' + kind, json=dict(capital=1000, rate=1, periods=3))
    assert response.status_code == 200
