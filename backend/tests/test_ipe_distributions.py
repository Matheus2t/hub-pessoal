import json
from decimal import Decimal
from pathlib import Path
from scripts.ipe_distributions import build
from scripts.cvm_distributions import validate_records
import copy
import pytest
ROOT=Path(__file__).resolve().parents[2]
def test_reviewed_ipe_facts_and_metadata_are_linked():
 records=json.loads((ROOT/'scripts/data/ipe-reviewed-distributions.json').read_text(encoding='utf8'))['events']
 assert len(records)==26 and len({e['cnpj'] for e in records})==22
 for e in records:
  assert e['cnpj']==e['source']['ipe_metadata']['CNPJ_Companhia']
  assert e['source']['page']==1 and len(e['source']['sha256'])==64
  assert e['status']=='scheduled'
  assert e['amount']==e['gross_per_share']
 petr=[e for e in records if e['symbol']=='PETR4']
 assert sum(Decimal(e['amount']) for e in petr)==Decimal('1.34814262')
 assert next(e for e in records if e['symbol']=='WEGE3')['payment_date']=='2027-03-10'
 assert next(e for e in records if e['symbol']=='VALE3')['ex_date'] is None

def test_new_real_facts_keep_boundaries_components_and_unknowns():
 data=json.loads((ROOT/'scripts/data/ipe-reviewed-distributions.json').read_text(encoding='utf8'));records=data['events']
 by=lambda s:[e for e in records if e['symbol']==s]
 assert sum(Decimal(e['amount']) for e in by('B3SA3'))==Decimal('0.22663462787')
 assert sum(Decimal(e['amount']) for e in by('GRND3'))==Decimal('0.06495')
 assert len(by('GRND3'))==2 # Do not add the combined total as a third distribution.
 assert by('GGBR3')[0]['amount']=='0.34' and by('GGBR3')[0]['payment_date']=='2026-12-15'
 assert by('FLRY3')[0]['payment_date']=='2026-09-28'
 assert by('FLRY3')[0]['source']['raw']['previous_payment_date']=='2026-10-02'
 assert by('CPFE3')[0]['amount']=='3.731536204'
 assert by('CPFE3')[0]['payment_date'] is None and by('CPFE3')[0]['payment_deadline']=='2026-12-31'
 assert by('VIVT3')[0]['ex_date'] is None
 assert by('LREN3')[0]['payment_date_precision']=='from'
 assert not by('TIMS3') and not by('EMBJ3') and not by('ALLD3')
 excluded={e['ipe_metadata']['Protocolo_Entrega'] for e in data['exclusions']}
 assert not any(e['source']['document'] in excluded for e in records)

def test_seven_original_unit_records_unchanged():
 base=ROOT/'frontend/public/financials/distributions-unit'
 old=json.loads((base/'snapshots/91aa015b482582eb.json').read_text(encoding='utf8'))
 current=json.loads((ROOT/'scripts/data/ipe-reviewed-distributions.json').read_text(encoding='utf8'))
 index={e['id']:e for e in current['events']}
 assert all(index[e['id']]==e for e in old['events'])

@pytest.mark.parametrize('patch',[
 {'payment_date_precision':'unknown'},
 {'payment_date_precision':'unverified'},
 {'payment_deadline':'2026-12-31'},
 {'payment_date':None,'payment_date_precision':'exact'},
])
def test_conflicting_date_qualifiers_rejected(patch):
 e=copy.deepcopy(json.loads((ROOT/'scripts/data/ipe-reviewed-distributions.json').read_text(encoding='utf8'))['events'][0]);e.update(patch)
 with pytest.raises(ValueError):validate_records([e])
