from datetime import date
from decimal import Decimal
from dataclasses import replace
import pytest
from scripts.cvm_periods import Flow,derive_quarter,trailing_twelve_months


def flow(start,end,value):
    return Flow('issuer','3.11','DRE','con',date.fromisoformat(start),date.fromisoformat(end),Decimal(value),'official-document',1,'review-specific-basis')

@pytest.mark.parametrize('end,prior,value',[('2025-06-30','2025-03-31','20'),('2025-09-30','2025-06-30','-5'),('2025-12-31','2025-09-30','0')])
def test_derivation(end,prior,value):
    c=flow('2025-01-01',end,value);p=flow('2025-01-01',prior,'10')
    r=derive_quarter(c,p);assert r['value']==Decimal(value)-10;assert r['operands']==[c,p]

@pytest.mark.parametrize('patch',[{'scope':'ind'},{'scale':'MIL'},{'issuer':'other'},{'basis_review':''},{'account':'3.01'},{'statement':'BPA'}])
def test_reject_incompatible(patch):
    a=flow('2025-01-01','2025-06-30','30');b=replace(flow('2025-01-01','2025-03-31','10'),**patch)
    with pytest.raises(ValueError):derive_quarter(a,b)


def quarters():
    return [flow('2024-10-01','2024-12-31','-5'),flow('2025-01-01','2025-03-31','10'),flow('2025-04-01','2025-06-30','20'),flow('2025-07-01','2025-09-30','30')]


def test_ttm_cross_year():
    r=trailing_twelve_months(quarters());assert r['value']==55;assert r['start']=='2024-10-01';assert r['end']=='2025-09-30'


def test_incomplete_or_gap():
    q=quarters()
    with pytest.raises(ValueError):trailing_twelve_months(q[:3])
    with pytest.raises(ValueError):trailing_twelve_months([q[0],q[0],q[2],q[3]])
