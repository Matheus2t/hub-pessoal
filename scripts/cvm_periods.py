"""Auditable flow arithmetic. Compatibility must be explicitly reviewed upstream.

Never accepts balance stocks, unreviewed bases or missing operands. The publisher reconciles official documents before assigning a review hash;
this arithmetic core does not independently establish accounting compatibility.
"""
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

@dataclass(frozen=True)
class Flow:
    issuer: str
    account: str
    statement: str
    scope: str
    start: date
    end: date
    value: Decimal
    document: str
    version: int
    basis_review: str
    currency: str = 'BRL'
    scale: str = 'UNIDADE'


def compatible(items):
    if not items: raise ValueError('Missing operands')
    first=items[0]
    if not first.basis_review: raise ValueError('Accounting basis not reviewed')
    for item in items:
        if item.statement not in ('DRE','DFC_MI','DFC_MD'): raise ValueError('Stocks cannot be summed or differenced')
        if item.start>item.end or not item.document or item.version<1 or not item.value.is_finite(): raise ValueError('Invalid operand')
        if any(getattr(item,k)!=getattr(first,k) for k in ('issuer','account','statement','scope','currency','scale','basis_review')): raise ValueError('Incompatible operands')


def derive_quarter(current, previous):
    compatible([current,previous])
    if current.start!=previous.start or current.start.month!=1 or current.start.day!=1: raise ValueError('Incompatible fiscal starts')
    start=previous.end+timedelta(days=1)
    if (start.month,start.day,current.end.month,current.end.day) not in ((4,1,6,30),(7,1,9,30),(10,1,12,31)) or start.year!=current.end.year: raise ValueError('Not one complete calendar quarter')
    return {'start':start.isoformat(),'end':current.end.isoformat(),'value':current.value-previous.value,'operation':'current_ytd - previous_ytd','operands':[current,previous],'validation':current.basis_review}


def trailing_twelve_months(quarters):
    compatible(quarters)
    if len(quarters)!=4: raise ValueError('Exactly four quarters required')
    ordered=sorted(quarters,key=lambda q:q.start)
    for i,q in enumerate(ordered):
        if (q.start.month,q.start.day,q.end.month,q.end.day) not in ((1,1,3,31),(4,1,6,30),(7,1,9,30),(10,1,12,31)) or q.start.year!=q.end.year: raise ValueError('Not an isolated quarter')
        if i and q.start!=ordered[i-1].end+timedelta(days=1): raise ValueError('Gap or overlap')
    return {'start':ordered[0].start.isoformat(),'end':ordered[-1].end.isoformat(),'value':sum((q.value for q in ordered),Decimal(0)),'operation':'sum_four_isolated_quarters','operands':ordered,'validation':ordered[0].basis_review}
