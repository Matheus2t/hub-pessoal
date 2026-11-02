"""Offline distributions publisher. FRE amounts are CLASS TOTALS, never per share.
Source: CVM FRE 2022 (ODbL-1.0). All public records retain raw rows and hashes.
"""
import argparse
from collections import Counter
from datetime import date, datetime, timezone
from decimal import Decimal
import hashlib
import io
import json
import os
from pathlib import Path
import zipfile
try:
    from scripts.cvm_financials import BASE,ROOT,ISSUERS,download,read_csv,json_bytes,verify_identity
except ModuleNotFoundError:
    from cvm_financials import BASE,ROOT,ISSUERS,download,read_csv,json_bytes,verify_identity

TARGETS={'PETR4':'Preferencial','ITUB4':'Preferencial','VALE3':'Ordinária','ABEV3':'Ordinária','WEGE3':'Ordinária'}
TYPE={'Dividendo Obrigatório':'dividend','Dividendo Complementar':'dividend','Dividendo Prioritário Mínimo':'dividend','Dividendo Prioritário Fixo':'dividend','Juros Sobre Capital Próprio':'jcp'}


def validate_records(records):
    seen={}
    for e in records:
        if e['id'] in seen:
            if e!=seen[e['id']]:raise ValueError('Conflicting event revision: explicit review required')
            continue
        if e['kind'] not in ('dividend','jcp') or e['currency']!='BRL':raise ValueError('Unsupported distribution')
        if e['status'] not in ('reported','scheduled','paid','cancelled'):raise ValueError('Unsupported status')
        if e['amount_basis'] not in ('class_total','per_share'):raise ValueError('Unknown amount basis')
        amount=Decimal(e['amount'])
        if not amount.is_finite() or amount<=0:raise ValueError('Invalid distribution amount')
        for key in ('payment_date','record_date','ex_date','declared_date'):
            if e.get(key):date.fromisoformat(e[key])
        if e.get('record_date') and e.get('ex_date') and e['record_date']>=e['ex_date']:raise ValueError('Inconsistent entitlement dates')
        if not e['source']['url'].startswith(('https://dados.cvm.gov.br/','http://www.rad.cvm.gov.br/','https://www.rad.cvm.gov.br/')):raise ValueError('Unapproved source')
        if not e['source'].get('sha256') or not e['source'].get('raw') or not e.get('class_name'):raise ValueError('Missing provenance')
        if e['amount_basis']=='class_total' and e.get('gross_per_share') is not None:raise ValueError('Class amount is not a per-share value')
        seen[e['id']]=e
    return sorted(seen.values(),key=lambda e:(e.get('payment_date') or '9999',e['symbol'],e['id']))


def publish(records,output,coverage,approved_revisions=None):
    records=validate_records(records)
    if not records:raise ValueError('Empty snapshot would destroy coverage')
    old=output/'manifest.json'
    if old.exists():
        previous=json.loads(old.read_text(encoding='utf8'))
        previous_rows=json.loads((output/previous['path']).read_text(encoding='utf8'))['events']
        index={e['id']:e for e in records}
        used_replacements=set()
        for old_event in previous_rows:
            if old_event['id'] in index:
                incoming=index[old_event['id']]
                if not incoming.get('corrections') and {k:v for k,v in incoming.items() if k!='corrections'}=={k:v for k,v in old_event.items() if k!='corrections'}:incoming['corrections']=old_event.get('corrections',[])
                if index[old_event['id']]!=old_event:raise ValueError('Existing event changed without revision')
                continue
            review=(approved_revisions or {}).get(old_event['id'])
            replacement=index.get(review.get('new_id')) if review else None
            if replacement and replacement['id'] in used_replacements:raise ValueError('Correction cannot merge separate events')
            if replacement:used_replacements.add(replacement['id'])
            if not replacement or not review.get('reason'):raise ValueError('Removal or correction requires explicit reviewed migration; previous snapshot preserved')
            if any(replacement[k]!=old_event[k] for k in ('cnpj','cvm','symbol','class_name','kind','amount_basis','currency')) or replacement['revision']<=old_event['revision']:raise ValueError('Incompatible or older correction')
            if replacement['source']['document']==old_event['source']['document']:raise ValueError('Correction requires a new official document')
            replacement['corrections']=[*old_event.get('corrections',[]),{'previous':old_event,'review':review}]
        records=sorted(index.values(),key=lambda e:(e.get('payment_date') or '9999',e['symbol'],e['id']))
    payload={'schema_version':1,'license':'ODbL-1.0','attribution':coverage.get('attribution','CVM — Formulário de Referência'),'coverage':coverage,'events':records}
    blob=json_bytes(payload);digest=hashlib.sha256(blob).hexdigest()[:16]
    target=output/'snapshots'/f'{digest}.json';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(blob)
    manifest={'schema_version':1,'snapshot':digest,'path':f'snapshots/{digest}.json','license':'ODbL-1.0','events':len(records),'companies':sorted({e['symbol'] for e in records}),'counts':dict(Counter(e['kind'] for e in records)),'coverage':coverage}
    if old.exists():
        prior=json.loads(old.read_text(encoding='utf8'))
        if prior.get('processed_at') and {k:v for k,v in prior.items() if k!='processed_at'}==manifest:return prior
    manifest['processed_at']=datetime.now(timezone.utc).isoformat()
    temp=output/'manifest.tmp';temp.write_bytes(json_bytes(manifest));os.replace(temp,old)
    return manifest


def target_class(identity,securities):
    """Only unambiguous ON or unlettered PN; never infer from ticker suffix."""
    review=identity.get('identity_review')
    if review and review['class_name']=='ON':return 'Ordinária'
    rows=[r for r in securities if r['CNPJ_Companhia']==identity['cnpj'] and r['ID_Documento']==identity['fca_document'] and r['Codigo_Negociacao']==identity['symbol'] and not r['Data_Fim_Negociacao']]
    classes=set()
    for r in rows:
        if r['Valor_Mobiliario']=='Ações Ordinárias':classes.add('Ordinária')
        elif r['Valor_Mobiliario']=='Ações Preferenciais' and r['Sigla_Classe_Acao_Preferencial'] in ('','PN'):classes.add('Preferencial')
        else:return None
    return next(iter(classes)) if len(classes)==1 else None


def build(cache,output,refresh=False,approved_revisions=None):
    url=BASE+'DOC/FRE/DADOS/fre_cia_aberta_2022.zip';blob=download(url,cache,refresh);digest=hashlib.sha256(blob).hexdigest();archive=zipfile.ZipFile(io.BytesIO(blob))
    metadata=list(read_csv(archive.read('fre_cia_aberta_2022.csv')))
    fca=zipfile.ZipFile(io.BytesIO(download(BASE+'DOC/FCA/DADOS/fca_cia_aberta_2026.zip',cache,refresh)))
    cad=download(BASE+'CAD/DADOS/cad_cia_aberta.csv',cache,refresh)
    rows=list(read_csv(archive.read('fre_cia_aberta_distribuicao_dividendos_classe_acao_2022.csv')))
    identities={s:verify_identity(fca,cad,s,i) for s,i in ISSUERS.items()}
    securities=list(read_csv(fca.read('fca_cia_aberta_valor_mobiliario_2026.csv')))
    records=[];excluded=[]
    for symbol,identity in identities.items():
        species=target_class(identity,securities);cnpj=identity['cnpj']
        available=[r for r in metadata if r['CNPJ_CIA']==cnpj]
        if not species or not available:
            excluded.append({'symbol':symbol,'reason':'Espécie/classe atual não conciliada ou FRE 2022 ausente'});continue
        m=max(available,key=lambda r:(r['DT_REFER'],int(r['VERSAO'])))
        for r in rows:
            if r['CNPJ_Companhia']!=cnpj or r['ID_Documento']!=m['ID_DOC'] or r['Especie_Acao']!=species or r['Classe_Acao']:continue
            if r['Dividendo_Distribuido'] not in TYPE:
                excluded.append({'symbol':symbol,'reason':'Tipo não conciliado como dividendo/JCP','raw':r});continue
            raw_amount=Decimal(r['Montante'])
            if raw_amount==0:continue
            payment=r['Data_Pagamento_Dividendo'] or None
            if payment and payment<'2021-01-01':continue
            eid=hashlib.sha256(json_bytes(r)).hexdigest()[:24]
            records.append({'id':eid,'issuer':identity['name'],'cvm':identity['cvm'],'cnpj':cnpj,'symbol':symbol,'class_name':'PN' if species=='Preferencial' else 'ON','kind':TYPE[r['Dividendo_Distribuido']],'amount':str(raw_amount),'amount_basis':'class_total','gross_per_share':None,'currency':'BRL','payment_date':payment,'record_date':None,'ex_date':None,'declared_date':None,'status':'reported','fiscal_start':r['Data_Inicio_Exercicio_Social'],'fiscal_end':r['Data_Fim_Exercicio_Social'],'revision':int(m['VERSAO']),'corrections':[],'source':{'url':m['LINK_DOC'],'dataset':url,'file':'fre_cia_aberta_distribuicao_dividendos_classe_acao_2022.csv','document':m['ID_DOC'],'reference':m['DT_REFER'],'received':m['DT_RECEB'],'sha256':digest,'raw':r,'method':'structured-CVM-CSV','license_url':'https://dados.cvm.gov.br/dataset/cia_aberta-doc-fre'}})
    return publish(records,output,{'state':'partial','source_year':2022,'description':'Registros históricos do FRE 2022. Montantes da classe, não valores por ação. Datas-com/ex não fornecidas. Datas de pagamento informadas, sem confirmação independente de liquidação. Nenhuma cobertura integral de ano é afirmada.','unit_amounts':False,'excluded':excluded},approved_revisions)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--refresh',action='store_true');p.add_argument('--approve-revisions',type=Path);a=p.parse_args()
    print(json.dumps(build(ROOT/'.vercel/cvm-cache-v2',ROOT/'frontend/public/financials/distributions',a.refresh,json.loads(a.approve_revisions.read_text(encoding='utf8')) if a.approve_revisions else None),ensure_ascii=True,indent=2))
