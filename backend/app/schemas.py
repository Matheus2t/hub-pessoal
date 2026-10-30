from decimal import Decimal
from pydantic import BaseModel,Field,ConfigDict
class CalculationInput(BaseModel):
    initial_capital:Decimal=Field(ge=0);monthly_contribution:Decimal=Field(ge=0);monthly_rate:Decimal=Field(ge=0);months:int=Field(ge=1,le=600)
class EvolutionRow(BaseModel):
    month:int;interest:Decimal;deposit:Decimal;balance:Decimal;invested:Decimal
class CalculationResult(BaseModel):
    total_invested:Decimal;total_interest:Decimal;final_amount:Decimal;evolution:list[EvolutionRow]
class HistoryItem(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:int;initial_capital:Decimal;monthly_contribution:Decimal;monthly_rate:Decimal;months:int;final_amount:Decimal;created_at:str
