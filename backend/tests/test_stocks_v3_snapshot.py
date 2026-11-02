"""Published snapshot checks independent of the normalizer's account selection."""
import json
from pathlib import Path
from decimal import Decimal
import pytest

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'frontend/public/financials'
MANIFEST=json.loads((BASE/'manifest.json').read_text(encoding='utf8'))

@pytest.mark.parametrize('symbol',list(MANIFEST['companies']))
def test_snapshot_accounting_evidence_and_ratios(symbol):
    doc=json.loads((BASE/MANIFEST['companies'][symbol]['path']).read_text(encoding='utf8'))
    assert doc['issuer']['cvm']>0
    annual=[p for p in doc['periods'] if p['kind']=='annual']
    assert len(annual)>=3
    for p in doc['periods']:
        assert p['document']['scope'] in ('con','ind')
        assert p['document']['dataset'].startswith('https://dados.cvm.gov.br/')
        assert p['start']<=p['end']
        for k,e in p['evidence'].items():
            factor={'MIL':1000,'UNIDADE':1}[e['scale']]
            assert float(Decimal(e['raw'])*factor)==e['value']
            if k in p['values']: assert p['values'][k]==e['value']
        v=p['values']
        if v['roe'] is not None:
            opening=p['evidence']['opening_equity']['value']
            assert v['roe']==pytest.approx(v['profit']/((opening+v['equity'])/2)*100)
        if doc['issuer']['bank']: assert v['net_margin'] is None
        if p['kind']=='quarter':
            assert (p['start'][5:],p['end'][5:]) in [('01-01','03-31'),('04-01','06-30'),('07-01','09-30'),('10-01','12-31')]
