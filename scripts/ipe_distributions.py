"""Publish reviewed factual records from official IPE notices, never the PDFs.
Amounts/dates were checked against page 1 and identified by the PDF SHA-256.
"""
import json
from pathlib import Path
try:
    from scripts.cvm_distributions import publish,ROOT,ISSUERS
except ModuleNotFoundError:
    from cvm_distributions import publish,ROOT,ISSUERS

def build():
    data=json.loads((ROOT/'scripts/data/ipe-reviewed-distributions.json').read_text(encoding='utf8'))
    for e in data['events']:
        m=e['source']['ipe_metadata']
        if (e['cnpj'],e['cvm'])!=ISSUERS[e['symbol']][:2]:raise ValueError('Ticker/issuer mapping mismatch')
        if e['class_name']!=('PN' if e['symbol'] in ('PETR4','ITUB4') else 'ON'):raise ValueError('Unreviewed share class')
        if e['cnpj']!=m['CNPJ_Companhia'] or e['cvm']!=int(m['Codigo_CVM']) or e['source']['url']!=m['Link_Download'] or e['source']['document']!=m['Protocolo_Entrega'] or e['revision']!=int(m['Versao']):raise ValueError('IPE identity/version mismatch')
        if e['amount']!=e['gross_per_share'] or e['amount']!=e['source']['raw']['gross_per_share']:raise ValueError('Unit amount mismatch')
        if e['status']!='scheduled':raise ValueError('No independent settlement confirmation available')
    return publish(data['events'],ROOT/'frontend/public/financials/distributions-unit',{'state':'partial','description':'Fatos de sete parcelas anunciadas em avisos IPE de cinco emissores. Valores brutos por ação B3; série parcial. Programação não comprova liquidação. Sem ADRs/Units, imposto estimado ou reinvestimento.','unit_amounts':True,'attribution':'CVM IPE / avisos oficiais dos emissores; extração factual 2T','document_rights':'PDFs/textos e marcas não redistribuídos. A ODbL cobre os metadados/base estruturada, não é atribuída aos documentos.'})
if __name__=='__main__':print(json.dumps(build(),ensure_ascii=True,indent=2))
