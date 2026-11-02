import copy,json
from pathlib import Path
import pytest
from scripts.cvm_distributions import validate_records,publish
BASE=Path(__file__).resolve().parents[2]/'frontend/public/financials/distributions'
def payload():
 m=json.loads((BASE/'manifest.json').read_text(encoding='utf8'));return json.loads((BASE/m['path']).read_text(encoding='utf8'))
def test_actual_cvm_records_not_unit_amounts():
 d=payload();assert len(d['events'])==28;assert len({e['cnpj'] for e in d['events']})==5
 assert sum(e['kind']=='dividend' for e in d['events'])==17
 for e in d['events']:
  assert e['amount_basis']=='class_total' and e['gross_per_share'] is None
  assert e['amount']==e['source']['raw']['Montante']
  assert e['payment_date']==e['source']['raw']['Data_Pagamento_Dividendo']
  assert e['status']=='reported' and e['record_date'] is None
 # Independent literal reference from the CVM FRE 2022 PN row for PETR4.
 assert any(e['symbol']=='PETR4' and e['payment_date']=='2021-04-29' and e['amount']=='4411248773.34' for e in d['events'])
def test_duplicate_import_is_idempotent_but_conflict_rejected():
 e=payload()['events'][0];assert len(validate_records([e,e]))==1
 with pytest.raises(ValueError):validate_records([e,dict(e,amount='999')])
@pytest.mark.parametrize('patch',[{'amount':'-1'},{'amount':'NaN'},{'payment_date':'2021-02-30'},{'currency':'USD'},{'gross_per_share':'1'},{'class_name':''}])
def test_invalid_records(patch):
 e=copy.deepcopy(payload()['events'][0]);e.update(patch)
 with pytest.raises(ValueError):validate_records([e])
def test_snapshot_failure_preserves_valid_data(tmp_path):
 d=payload();m=publish(d['events'],tmp_path,d['coverage']);before=(tmp_path/'manifest.json').read_bytes();assert publish(d['events'],tmp_path,d['coverage'])==m
 with pytest.raises(ValueError):publish([],tmp_path,d['coverage'])
 with pytest.raises(ValueError):publish(d['events'][1:],tmp_path,d['coverage'])
 assert (tmp_path/'manifest.json').read_bytes()==before

def test_explicit_document_revision_keeps_old_event_and_replay(tmp_path):
    d=payload();e=copy.deepcopy(d['events'][0]);publish([e],tmp_path,d['coverage'])
    new=copy.deepcopy(e);new['id']='official-revision';new['amount']='100';new['revision']+=1;new['source']['document']='new-document';new['source']['raw']['Montante']='100'
    with pytest.raises(ValueError):publish([new],tmp_path,d['coverage'])
    m=publish([new],tmp_path,d['coverage'],{e['id']:{'new_id':new['id'],'reason':'Documento oficial retificador revisado'}})
    corrected=json.loads((tmp_path/m['path']).read_text(encoding='utf8'))['events'][0]
    assert corrected['corrections'][0]['previous']==e
    # A normal re-import must retain the correction ledger, not delete its history.
    new['corrections']=[]
    assert publish([new],tmp_path,d['coverage'])==m
