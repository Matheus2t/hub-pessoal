from decimal import Decimal
from app.calculator import calculate_compound
def test_zero_rate_adds_contributions():
    result=calculate_compound(Decimal('1000'),Decimal('100'),Decimal('0'),3);assert result['final_amount']==Decimal('1300.00');assert result['total_interest']==Decimal('0.00')
def test_contributions_happen_after_interest():
    result=calculate_compound(Decimal('1000'),Decimal('100'),Decimal('10'),1);assert result['evolution'][0]['interest']==Decimal('100.00');assert result['final_amount']==Decimal('1200.00')
def test_initial_and_contribution_can_be_zero():
    assert calculate_compound(Decimal('0'),Decimal('0'),Decimal('5'),2)['final_amount']==Decimal('0.00')
