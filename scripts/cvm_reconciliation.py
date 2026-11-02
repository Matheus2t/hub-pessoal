"""Conservative PETR4 integration: independently reported quarter is a control.

Never infers accounting continuity from a review token or document-version number.
Only publishes differences corroborated by an explicit quarter in the latest
selected document, with identical account, label, unit and scope.
"""
from dataclasses import asdict
from datetime import date
from decimal import Decimal
import hashlib
import json
try:
    from scripts.cvm_periods import Flow, derive_quarter
except ModuleNotFoundError:
    from cvm_periods import Flow, derive_quarter


def integrate_reported_quarters(issuer, periods):
    output=[]
    for current in periods:
        if current['kind']!='ytd': continue
        end=current['end'];year=end[:4]
        prior_end={'06-30':'03-31','09-30':'06-30'}.get(end[5:])
        if not prior_end: continue
        previous=next((p for p in periods if p['start']==current['start'] and p['end']==year+'-'+prior_end and p['kind'] in ('quarter','ytd')),None)
        explicit=next((p for p in periods if p['kind']=='quarter' and p['end']==end and p['document']==current['document']),None)
        if previous is None or explicit is None: continue
        a,b,c=current['document'],previous['document'],explicit['document']
        if a['scope']!=b['scope'] or a['version']<1 or b['version']<1: continue
        evidence={};values={}
        for key,x in current['evidence'].items():
            y=previous['evidence'].get(key);z=explicit['evidence'].get(key)
            if not y or not z or x['statement'] not in ('DRE','DFC_MI','DFC_MD'): continue
            if any(x[k]!=y[k] or x[k]!=z[k] for k in ('account','statement','label','scale')): continue
            if x['start']!=current['start'] or y['start']!=previous['start'] or x['end']!=end or y['end']!=previous['end']: continue
            if any(e.get('exercise')!='ÚLTIMO' for e in (x,y,z)): continue
            factor={'MIL':Decimal(1000),'UNIDADE':Decimal(1)}.get(x['scale'])
            if factor is None: continue
            vx,vy,vz=(Decimal(e['raw'])*factor for e in (x,y,z))
            if not all(v.is_finite() for v in (vx,vy,vz)) or vx-vy!=vz: continue
            audit={'policy':'reported-quarter-reconciliation-v1','issuer':issuer,'current_document':a,'previous_document':b,'reported_control_document':c,'current':x,'previous':y,'reported_control':z,'checks':['latest-selected-versions','same-account-label-scale-scope','calendar-ytd-boundaries','difference-equals-independent-reported-quarter']}
            token=hashlib.sha256(json.dumps(audit,sort_keys=True,default=str).encode()).hexdigest()
            flows=[Flow(issuer,x['account'],x['statement'],a['scope'],date.fromisoformat(p['start']),date.fromisoformat(p['end']),v,p['document']['id'],p['document']['version'],token) for p,v in ((current,vx),(previous,vy))]
            result=derive_quarter(*flows)
            if result['start']!=explicit['start']: continue
            values[key]=result['value']
            evidence[key]={'operation':result['operation'],'operands':[asdict(f) for f in flows],'validation':audit,'review_sha256':token,'value':result['value']}
        if values: output.append({'kind':'derived-quarter','start':explicit['start'],'end':end,'values':values,'evidence':evidence,'document':a,'limitation':'Difference independently corroborated by a reported quarter; not additional chronological coverage.'})
    return output

# PETR4-specific bridge: Q4 has an independently reported control in the official
# IPE release. Rolling windows additionally reconcile current ITR comparatives.
def integrate_verified_ttm(identity,periods,comparatives,control):
    try:
        from scripts.cvm_periods import trailing_twelve_months
    except ModuleNotFoundError:
        from cvm_periods import trailing_twelve_months
    if (identity['cnpj'],identity['cvm'])!=(control['issuer'],control['cvm']) or control['scope']!='con' or control['account']!='3.11' or control['statement']!='DRE' or control['currency']!='BRL':return [],[]
    metadata=control['ipe_metadata']
    if metadata['CNPJ_Companhia']!=identity['cnpj'] or int(metadata['Codigo_CVM'])!=identity['cvm'] or metadata['Link_Download']!=control['url'] or int(metadata['Versao'])<1:return [],[]
    if control['reported_scale']!='MILHÃO' or control['factor']!=1000000 or (control['q4_start'],control['q4_end'])!=('2025-10-01','2025-12-31'):return [],[]
    def period(kind,start,end):return next((p for p in periods if p['kind']==kind and p['start']==start and p['end']==end),None)
    annual=period('annual','2025-01-01','2025-12-31');ytd=period('ytd','2025-01-01','2025-09-30')
    quarter_dates=[('2025-01-01','2025-03-31'),('2025-04-01','2025-06-30'),('2025-07-01','2025-09-30'),('2026-01-01','2026-03-31'),('2026-04-01','2026-06-30')]
    quarters=[period('quarter',a,b) for a,b in quarter_dates]
    if not annual or not ytd or any(p is None for p in quarters):return [],[]
    all_periods=[annual,ytd,*quarters]
    evidences=[p['evidence'].get('profit') for p in all_periods]
    if any(e is None for e in evidences):return [],[]
    first=evidences[0]
    if any(p['document']['scope']!='con' or p['document']['version']<1 for p in all_periods):return [],[]
    if any(any(e[k]!=first[k] for k in ('account','statement','scale','label')) for e in evidences) or first['account']!='3.11' or first['statement']!='DRE':return [],[]
    if any(e['exercise']!='ÚLTIMO' or e['start']!=p['start'] or e['end']!=p['end'] for p,e in zip(all_periods,evidences)):return [],[]
    scale={'MIL':Decimal(1000),'UNIDADE':Decimal(1)}.get(first['scale'])
    if scale is None:return [],[]
    value=lambda p:Decimal(p['evidence']['profit']['raw'])*scale
    if any(not value(p).is_finite() for p in all_periods):return [],[]
    factor=Decimal(control['factor']);q4value=Decimal(control['q4_profit'])*factor
    if value(annual)!=Decimal(control['annual_profit'])*factor or value(quarters[2])!=Decimal(control['q3_profit'])*factor or value(annual)-value(ytd)!=q4value:return [],[]
    if sum((value(p) for p in quarters[:3]),Decimal(0))!=value(ytd):return [],[]
    audit={'policy':'PETR4-profit-release-and-comparatives-v1','issuer':identity,'release_control':control,'source_periods':[{'start':p['start'],'end':p['end'],'document':p['document'],'evidence':p['evidence']['profit']} for p in all_periods],'comparatives':comparatives,'checks':['latest-version-per-document','same-CNPJ-CVM-account-label-scope-currency','explicit-scale-normalization','Q4-difference-equals-independent-IPE-release-control','annual-and-Q3-equal-release-controls','Q1-Q2-Q3-sum-equals-nine-month-YTD']}
    token=hashlib.sha256(json.dumps(audit,sort_keys=True,default=str).encode()).hexdigest()
    def flow(p):return Flow(identity['cnpj'],'3.11','DRE','con',date.fromisoformat(p['start']),date.fromisoformat(p['end']),value(p),p['document']['id'],p['document']['version'],token)
    q4=derive_quarter(flow(annual),flow(ytd))
    q4flow=Flow(identity['cnpj'],'3.11','DRE','con',date(2025,10,1),date(2025,12,31),q4['value'],control['ipe_metadata']['Protocolo_Entrega'],int(control['ipe_metadata']['Versao']),token)
    release_doc={'version':int(control['ipe_metadata']['Versao']),'received':control['ipe_metadata']['Data_Entrega'],'id':control['ipe_metadata']['Protocolo_Entrega'],'url':control['url'],'dataset':'https://dados.cvm.gov.br/dataset/cia_aberta-doc-ipe','scope':'con','reference':'2025-12-31'}
    q4_record={'kind':'derived-quarter','start':q4['start'],'end':q4['end'],'values':{'profit':q4['value']},'document':annual['document'],'evidence':{'profit':{'value':q4['value'],'operation':q4['operation'],'operands':[asdict(f) for f in q4['operands']],'review_sha256':token,'validation':{'current_document':annual['document'],'previous_document':ytd['document'],'reported_control_document':release_doc,'audit':audit}}},'limitation':'Lucro consolidado total, incluindo não controladores. Q4 conferido no release IPE, página 7.'}
    ordered=[flow(p) for p in quarters[:3]]+[q4flow]+[flow(p) for p in quarters[3:]]
    def comparative_matches(current,past,start=None,expected=None):
        target=next((e for e in comparatives if e['document']==current['document'] and e['start']==(start or past['start']) and e['end']==past['end']),None)
        return bool(target and target['account']==first['account'] and target['statement']==first['statement'] and target['label']==first['label'] and target['scale']==first['scale'] and target['currency']=='REAL' and target['exercise']=='PENÚLTIMO' and Decimal(target['raw'])*scale==(value(past) if expected is None else expected))
    results=[]
    for end_index in [3,4,5]:
        if end_index==4 and not comparative_matches(quarters[3],quarters[0]):continue
        if end_index==5:
            q2ytd=period('ytd','2026-01-01','2026-06-30')
            if not comparative_matches(quarters[4],quarters[1]) or not comparative_matches(quarters[4],quarters[1],'2025-01-01',value(quarters[0])+value(quarters[1])):continue
            if not q2ytd or q2ytd['document']!=quarters[4]['document']:continue
            ev=q2ytd['evidence'].get('profit')
            if not ev or any(ev[k]!=first[k] for k in ('account','statement','scale','label')) or ev['exercise']!='ÚLTIMO' or ev['start']!=q2ytd['start'] or ev['end']!=q2ytd['end']:continue
            if value(q2ytd)!=value(quarters[3])+value(quarters[4]):continue
        window=ordered[end_index-3:end_index+1];ttm=trailing_twelve_months(window)
        closing=quarters[3] if end_index==4 else quarters[4] if end_index==5 else annual
        values={k:None for k in annual['values']};values['profit']=ttm['value']
        result={'kind':'ttm','start':ttm['start'],'end':ttm['end'],'values':values,'evidence':{'profit':{'value':ttm['value'],'label':first['label'],'account':'3.11','statement':'DRE','scale':'UNIDADE','raw':str(ttm['value']),'start':ttm['start'],'end':ttm['end'],'operation':ttm['operation'],'operands':[asdict(f) for f in window],'review_sha256':token,'validation':audit}},'document':closing['document'],'sources':[p['document'] for p in all_periods]+[release_doc]}
        results.append(result)
    return [q4_record],results
