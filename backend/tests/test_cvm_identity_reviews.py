import copy
import json
from pathlib import Path
import pytest
from scripts.cvm_identity_reviews import REVIEWS,reviewed_link
from scripts.cvm_financials import select_rows
from scripts.cvm_distributions import target_class

BASE=Path(__file__).resolve().parents[2]/'frontend/public/financials'


@pytest.mark.parametrize('symbol',list(REVIEWS))
def test_actual_reviewed_links_are_in_financial_snapshots(symbol):
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf8'))
    d=json.loads((BASE/m['companies'][symbol]['path']).read_text(encoding='utf8'))
    review=REVIEWS[symbol];i=d['issuer']
    assert i['identity_review']==review
    assert (i['cnpj'],i['cvm'])==(review['cnpj'],review['cvm'])
    assert len([p for p in d['periods'] if p['kind']=='annual'])==5
    assert review['sources'] and review['finding']
    latest={'ID_Documento':review['fca_document'],'Data_Referencia':review['fca_reference'],'Versao':str(review['fca_version'])}
    assert reviewed_link(symbol,i['cnpj'],i['cvm'],latest,[])==review
    assert reviewed_link(symbol,i['cnpj'],i['cvm'],dict(latest,ID_Documento='future-unreviewed'),[]) is None
    assert reviewed_link(symbol,'wrong-CNPJ',i['cvm'],latest,[]) is None
    with pytest.raises(ValueError):reviewed_link(symbol,i['cnpj'],i['cvm'],latest,[{'Codigo_Negociacao':symbol,'Data_Fim_Negociacao':'','CNPJ_Companhia':'other'}])


def test_tims_individual_is_explicit_and_matches_real_reference():
    m=json.loads((BASE/'manifest.json').read_text(encoding='utf8'))
    d=json.loads((BASE/m['companies']['TIMS3']['path']).read_text(encoding='utf8'))
    assert d['issuer']['scope_review']['scope']=='ind'
    assert all(p['document']['scope']=='ind' for p in d['periods'])
    p=next(p for p in d['periods'] if p['kind']=='annual' and p['end']=='2025-12-31')
    assert p['values']['revenue']==26624721000
    assert p['values']['profit']==4311984000
    assert p['document']['id']=='154688' and p['document']['version']==1


def test_preferred_scope_never_falls_back_to_older_or_mixed_document():
    row={'VERSAO':'1','_scope':'ind','_statement':'DRE','ORDEM_EXERC':'ÚLTIMO','DT_INI_EXERC':'2025-01-01','DT_FIM_EXERC':'2025-12-31','CD_CONTA':'3.11','MOEDA':'REAL','ESCALA_MOEDA':'MIL','VL_CONTA':'1'}
    assert select_rows([row,dict(row,_scope='con')],'ind')[2]=='ind'
    with pytest.raises(ValueError):select_rows([row,dict(row,VERSAO='2',_scope='con')],'ind')


def test_distribution_class_never_inferred_from_ticker_suffix():
    i={'cnpj':'a','fca_document':'latest','symbol':'ABCD4'}
    r={'CNPJ_Companhia':'a','ID_Documento':'latest','Codigo_Negociacao':'ABCD4','Data_Fim_Negociacao':'','Valor_Mobiliario':'Ações Preferenciais','Sigla_Classe_Acao_Preferencial':'PNA'}
    assert target_class(i,[r]) is None
    assert target_class(i,[dict(r,Sigla_Classe_Acao_Preferencial='')])=='Preferencial'
    assert target_class(i,[dict(r,Valor_Mobiliario='Units')]) is None
