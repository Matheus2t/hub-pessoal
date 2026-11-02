"""Narrow documented identity exceptions, never a name/suffix-based fallback.

Current CAD and latest FCA general document must still match the reviewed facts.
A changed FCA document requires a new review. Original source rows are retained.
No prices or statement values are obtained from these identity sources.
"""
import json
from pathlib import Path

REVIEWS=json.loads((Path(__file__).resolve().parent/'data/issuer-link-reviews.json').read_text(encoding='utf8'))


def reviewed_link(symbol,cnpj,cvm,latest,securities,reviews=None):
    review=(REVIEWS if reviews is None else reviews).get(symbol)
    if not review:return None
    if (review['cnpj'],review['cvm'])!=(cnpj,cvm):return None
    if (latest['ID_Documento'],latest['Data_Referencia'],int(latest['Versao']))!=(review['fca_document'],review['fca_reference'],review['fca_version']):return None
    if not review['sources'] or not review['finding'] or review['class_name']!='ON':return None
    if any(r['Codigo_Negociacao']==symbol and not r['Data_Fim_Negociacao'] and r['CNPJ_Companhia']!=cnpj for r in securities):
        raise ValueError('Reviewed ticker conflicts with another FCA issuer')
    return review
