"""Real DFP/ITR inputs and independently reviewed IPE release, page 7.

Expected amounts are literal controls, not obtained from the implementation.
PDF is not redistributed; source URL, metadata, SHA and extracted facts are.
"""
import copy
import json
from decimal import Decimal
from pathlib import Path
import pytest
from scripts.cvm_reconciliation import integrate_verified_ttm

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'frontend/public/financials'


def inputs():
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf8'))
    d=json.loads((BASE/m['companies']['PETR4']['path']).read_text(encoding='utf8'))
    c=json.loads((ROOT/'scripts/data/petr4-quarter-control.json').read_text(encoding='utf8'))
    return d['issuer'],d['periods'],d['comparative_evidence'],c


def test_petr4_real_release_and_three_complete_windows():
    args=inputs();before=copy.deepcopy(args)
    quarters,ttm=integrate_verified_ttm(*args)
    assert args==before
    assert len(quarters)==1
    assert quarters[0]['values']['profit']==Decimal('15653000000')
    assert [(r['start'],r['end'],r['values']['profit']) for r in ttm]==[
        ('2025-01-01','2025-12-31',Decimal('110605000000')),
        ('2025-04-01','2026-03-31',Decimal('108035000000')),
        ('2025-07-01','2026-06-30',Decimal('133756000000'))]
    for r in ttm:
        e=r['evidence']['profit']
        assert len(e['operands'])==4
        assert len(e['review_sha256'])==64
        assert all(v is None for k,v in r['values'].items() if k!='profit')
        assert e['validation']['release_control']['sha256']=='2373f1ea0e5e4bf31628cb7dd31eb46219b486b9ae29b19b985e4df97605790f'
        assert e['validation']['release_control']['page']==7
        assert all('rad.cvm.gov.br/' in x['document']['url'] for x in e['validation']['source_periods'])


@pytest.mark.parametrize('key,value',[
    ('q4_profit','15563'), # profit attributable to parent, wrong scope
    ('annual_profit','110129'),('q3_profit','32705'),
    ('scope','ind'),('factor',1000),('currency','USD'),('account','3.11.01'),
    ('q4_start','2025-09-01'),('reported_scale','MIL')])
def test_incompatible_release_rejects_all(key,value):
    a,b,c,d=inputs();d[key]=value
    assert integrate_verified_ttm(a,b,c,d)==([],[])


def test_missing_comparatives_allows_only_annual_window():
    a,b,_,d=inputs();q,t=integrate_verified_ttm(a,b,[],d)
    assert len(q)==1 and [r['end'] for r in t]==['2025-12-31']


@pytest.mark.parametrize('key,value',[('scale','UNIDADE'),('exercise','ÚLTIMO'),('raw','0'),('currency','USD')])
def test_incompatible_comparative_does_not_create_rolling_windows(key,value):
    a,b,c,d=inputs()
    for item in c:item[key]=value
    assert len(integrate_verified_ttm(a,b,c,d)[1])==1


def test_restatement_version_must_match_current_itr():
    a,b,c,d=inputs()
    for item in c:item['document']['version']+=1
    assert len(integrate_verified_ttm(a,b,c,d)[1])==1


def test_no_gap_or_wrong_ytd_scale():
    a,b,c,d=inputs()
    missing=[p for p in b if not(p['kind']=='quarter' and p['start']=='2025-07-01')]
    assert integrate_verified_ttm(a,missing,c,d)==([],[])
    next(p for p in b if p['kind']=='ytd' and p['end']=='2026-06-30')['evidence']['profit']['scale']='UNIDADE'
    assert len(integrate_verified_ttm(a,b,c,d)[1])==2
