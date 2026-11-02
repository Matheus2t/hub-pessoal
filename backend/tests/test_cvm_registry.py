from scripts.cvm_registry import reconcile
import pytest


def data():
    g = dict(CNPJ_Companhia='a', Codigo_CVM='1', Data_Referencia='2026-01-01', Versao='2', ID_Documento='new', Nome_Empresarial='Issuer', Setor_Atividade='Industry')
    s = dict(CNPJ_Companhia='a', Codigo_Negociacao='ABCD3', Data_Fim_Negociacao='', ID_Documento='new')
    c = dict(CNPJ_CIA='a', CD_CVM='1', SIT='ATIVO')
    return g,s,c


def test_classes_share_one_issuer():
    g,s,c=data()
    result=reconcile(['ABCD3','ABCD4'],[g],[s,dict(s,Codigo_Negociacao='ABCD4')],[c])
    assert len(result['issuers'])==1
    assert result['issuers'][0]['symbols']==['ABCD3','ABCD4']


@pytest.mark.parametrize('patch',[{'ID_Documento':'old'},{'Data_Fim_Negociacao':'2025-12-31'}])
def test_old_or_closed_security_is_not_current(patch):
    g,s,c=data()
    assert not reconcile(['ABCD3'],[g],[dict(s,**patch)],[c])['issuers']


def test_inactive_and_missing_are_unresolved():
    g,s,c=data()
    result=reconcile(['ABCD3','ZZZZ3'],[g],[s],[dict(c,SIT='CANCELADO')])
    assert len(result['unresolved'])==2


def test_conflicting_latest_identity_rejected():
    g,s,c=data()
    with pytest.raises(ValueError):
        reconcile(['ABCD3'],[g,dict(g,Codigo_CVM='2')],[s],[c])


def test_ambiguous_ticker_never_guessed():
    g,s,c=data()
    result=reconcile(['ABCD3'],[g,dict(g,CNPJ_Companhia='b',Codigo_CVM='2')],[s,dict(s,CNPJ_Companhia='b')],[c,dict(c,CNPJ_CIA='b',CD_CVM='2')])
    assert result['unresolved'][0]['candidates']==2


def test_duplicate_catalog_rejected():
    with pytest.raises(ValueError): reconcile(['A','A'],[],[],[])
