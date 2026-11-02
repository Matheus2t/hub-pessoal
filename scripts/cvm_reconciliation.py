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
