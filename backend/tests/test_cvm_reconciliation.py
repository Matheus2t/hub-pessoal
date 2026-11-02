import copy
import json
from pathlib import Path
import pytest
from scripts.cvm_reconciliation import integrate_reported_quarters
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'frontend/public/financials/snapshots/dce27807f46d3059/PETR4.json'


def source(): return json.loads(SOURCE.read_text(encoding='utf8'))


def test_real_reported_quarter_reconciliation():
    d=source();result=integrate_reported_quarters(d['issuer']['cnpj'],d['periods'])
    assert result
    for r in result:
        control=next(p for p in d['periods'] if p['kind']=='quarter' and p['start']==r['start'] and p['end']==r['end'])
        for k,v in r['values'].items():
            assert float(v)==control['values'][k]
            assert len(r['evidence'][k]['operands'])==2
            assert r['evidence'][k]['validation']['reported_control_document']['id']==control['document']['id']


@pytest.mark.parametrize('field,value',[('scale','UNIDADE'),('label','Different accounting concept'),('account','3.99'),('raw','999999999'),('exercise','PENÚLTIMO')])
def test_real_data_incompatible_account_rejected(field,value):
    d=source();original=integrate_reported_quarters(d['issuer']['cnpj'],d['periods']);target=next(r for r in original if 'profit' in r['values'])
    current=next(p for p in d['periods'] if p['kind']=='ytd' and p['end']==target['end'])
    current['evidence']['profit'][field]=value
    altered=integrate_reported_quarters(d['issuer']['cnpj'],d['periods'])
    assert not any(r['end']==target['end'] and 'profit' in r['values'] for r in altered)


def test_no_independent_control_no_derivation():
    d=source();assert not integrate_reported_quarters(d['issuer']['cnpj'],[p for p in d['periods'] if p['kind']!='quarter'])


def test_snapshots_keep_original_periods_and_serializable_audit():
    d=source();base=ROOT/'frontend/public/financials';m=json.loads((base/'manifest.json').read_text(encoding='utf8'));published=json.loads((base/m['companies']['PETR4']['path']).read_text(encoding='utf8'))
    assert published['periods']==d['periods']
    assert published['derived_periods']
    assert m['derived_coverage']['PETR4']==len(published['derived_periods'])
