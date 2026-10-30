from decimal import Decimal, ROUND_HALF_UP
CENT=Decimal('0.01')
def money(value:Decimal)->Decimal:return value.quantize(CENT,rounding=ROUND_HALF_UP)
def calculate_compound(initial_capital:Decimal,monthly_contribution:Decimal,monthly_rate:Decimal,months:int):
    balance=money(initial_capital);invested=money(initial_capital);evolution=[];rate=monthly_rate/Decimal('100')
    for month in range(1,months+1):
        interest=money(balance*rate);balance=money(balance+interest+monthly_contribution);invested=money(invested+monthly_contribution)
        evolution.append({'month':month,'interest':interest,'deposit':monthly_contribution,'balance':balance,'invested':invested})
    return {'total_invested':invested,'total_interest':money(balance-invested),'final_amount':balance,'evolution':evolution}
