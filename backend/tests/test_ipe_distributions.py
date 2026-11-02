import json
from decimal import Decimal
from pathlib import Path
from scripts.ipe_distributions import build
ROOT=Path(__file__).resolve().parents[2]
def test_reviewed_ipe_facts_and_metadata_are_linked():
 records=json.loads((ROOT/'scripts/data/ipe-reviewed-distributions.json').read_text(encoding='utf8'))['events']
 assert len(records)==7 and len({e['cnpj'] for e in records})==5
 for e in records:
  assert e['cnpj']==e['source']['ipe_metadata']['CNPJ_Companhia']
  assert e['source']['page']==1 and len(e['source']['sha256'])==64
  assert e['status']=='scheduled' and e['record_date'] is not None
  assert e['amount']==e['gross_per_share']
 petr=[e for e in records if e['symbol']=='PETR4']
 assert sum(Decimal(e['amount']) for e in petr)==Decimal('1.34814262')
 assert next(e for e in records if e['symbol']=='WEGE3')['payment_date']=='2027-03-10'
 assert next(e for e in records if e['symbol']=='VALE3')['ex_date'] is None
