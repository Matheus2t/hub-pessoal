import io
import json
from decimal import Decimal
from pathlib import Path
import zipfile
import pytest
from scripts.cvm_financials import money, ratio, growth, select_rows, prepare, verify_identity, ISSUERS
from scripts import cvm_financials

def row(code='3.01', value='100', **kwargs):
    return dict(CD_CONTA=code, VL_CONTA=value, MOEDA='REAL', ESCALA_MOEDA='MIL', VERSAO='1',
                ORDEM_EXERC='ÚLTIMO', DT_INI_EXERC='2025-01-01', DT_FIM_EXERC='2025-12-31',
                DS_CONTA='Receita de Venda', _statement='DRE', _scope='con', **kwargs)

def changed(r, **kwargs): return dict(r, **kwargs)

@pytest.mark.parametrize('raw,scale,expected',[('-1.23','MIL','-1230'),('0','MIL','0'),('12.34','UNIDADE','12.34')])
def test_money(raw,scale,expected): assert money(changed(row(),VL_CONTA=raw,ESCALA_MOEDA=scale))==Decimal(expected)

@pytest.mark.parametrize('patch',[{'MOEDA':'DOLAR'},{'ESCALA_MOEDA':'DESCONHECIDA'},{'VL_CONTA':'NaN'}])
def test_invalid_money(patch):
    with pytest.raises(ValueError): money(changed(row(),**patch))

def test_selection_does_not_mix_versions_scopes_and_deduplicates():
    base=row(); newer=changed(base,VERSAO='2',VL_CONTA='120')
    selected,version,scope=select_rows([base,newer,newer,changed(newer,_scope='ind',VL_CONTA='90')])
    assert version==2 and scope=='con' and len(selected)==1 and money(selected[0])==120000
    assert select_rows([changed(base,_scope='ind')])[2]=='ind'
    with pytest.raises(ValueError):select_rows([base,changed(base,VL_CONTA='101')])

def test_explicit_quarter_does_not_use_year_to_date_or_sum_balance():
    rows=[row(value='900'),changed(row(value='300'),DT_INI_EXERC='2025-10-01'),changed(row('1','2000'),_statement='BPA')]
    result=prepare(rows,False,'2025-12-31','2025-10-01','quarter')
    assert result['values']['revenue']==300000
    assert result['values']['assets']==2000000
    assert result['values']['roe'] is None and result['values']['profit'] is None

def test_bank_chart_accounts_and_incompatible_metrics():
    rows=[row(),row('3.09','10'),changed(row('2.08','200'),_statement='BPP'),changed(row('1','1000'),_statement='BPA')]
    result=prepare(rows,True,'2025-12-31','2025-01-01','annual')['values']
    assert result['profit']==10000 and result['equity']==200000
    assert result['liabilities']==800000 and result['revenue'] is None
    assert result['net_margin'] is None and result['net_debt'] is None

def test_denominators_and_loss_growth():
    assert ratio(Decimal('-10'),Decimal('100'))==-10
    for d in [None,Decimal('0'),Decimal('-1')]: assert ratio(10,d) is None and growth(10,d) is None
    assert growth(Decimal('-10'),Decimal('100'))==-110

def test_failed_refresh_preserves_last_manifest(tmp_path,monkeypatch):
    output=tmp_path/'public';output.mkdir();original=b'{"snapshot":"last-valid"}'
    (output/'manifest.json').write_bytes(original)
    def fail(*args,**kwargs): raise OSError('CVM unavailable')
    monkeypatch.setattr(cvm_financials,'download',fail)
    with pytest.raises(OSError):cvm_financials.build(tmp_path,output,True)
    assert (output/'manifest.json').read_bytes()==original

def test_annual_return_uses_comparative_opening_equity():
    rows=[row('3.11','20'),changed(row('2.03','120'),_statement='BPP'),changed(row('2.03','80'),_statement='BPP',ORDEM_EXERC='PENÚLTIMO',DT_FIM_EXERC='2024-12-31')]
    v=prepare(rows,False,'2025-12-31','2025-01-01','annual')['values']
    assert v['roe']==20 and v['equity_growth']==50

def test_verified_mapping_rejects_ticker_fca_mismatch():
    data=io.BytesIO()
    with zipfile.ZipFile(data,'w') as z:
        z.writestr('fca_cia_aberta_geral_2026.csv','CNPJ_Companhia;Data_Referencia;Versao;Codigo_CVM;ID_Documento\nX;2026-01-01;1;1;2')
        z.writestr('fca_cia_aberta_valor_mobiliario_2026.csv','CNPJ_Companhia;ID_Documento;Codigo_Negociacao;Data_Fim_Negociacao\nX;2;WRONG3;')
    cad=b'CNPJ_CIA;CD_CVM;SIT\nX;1;ATIVO'
    with pytest.raises(ValueError,match='ticker'):verify_identity(zipfile.ZipFile(data),cad,'TEST3',('X',1,False))

@pytest.mark.parametrize('symbol,profit,equity',[('PETR4',110605000000,417587000000),('VALE3',11811000000,188926000000),('WEGE3',6775958000,18553364000),('TOTS3',920742000,5443457000),('ITUB4',45849000000,215076000000)])
def test_official_dfp_2025_audit_samples(symbol,profit,equity):
    root=Path(__file__).resolve().parents[2]/'frontend/public/financials'
    manifest=json.loads((root/'manifest.json').read_text(encoding='utf8'))
    document=json.loads((root/manifest['companies'][symbol]['path']).read_text(encoding='utf8'))
    period=next(p for p in document['periods'] if p['kind']=='annual' and p['end']=='2025-12-31')
    # Independently transcribed from official DRE/BPP consolidated CSV rows (MIL).
    assert period['values']['profit']==profit and period['values']['equity']==equity
    assert document['issuer']['cnpj']==ISSUERS[symbol][0]
    assert period['document']['scope']=='con'
