"""Offline CVM publisher. No market prices, database or request-time ingestion."""
import argparse
import csv
import hashlib
import io
import json
import os
from pathlib import Path
from decimal import Decimal
import urllib.request
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/'
ISSUERS = {
    'ITUB4': ('60.872.504/0001-23', 19348, True),
    'PETR4': ('33.000.167/0001-01', 9512, False),
    'VALE3': ('33.592.510/0001-54', 4170, False),
    'WEGE3': ('84.429.695/0001-11', 5410, False),
    'TOTS3': ('53.113.791/0001-22', 19992, False),
}
ACCOUNTS = {
    'revenue': ('DRE', '3.01'), 'costs': ('DRE', '3.02'), 'gross_profit': ('DRE', '3.03'),
    'operating_profit': ('DRE', '3.05'), 'financial_result': ('DRE', '3.06'), 'profit': ('DRE', '3.11'),
    'assets': ('BPA', '1'), 'equity': ('BPP', '2.03'), 'cash': ('BPA', '1.01.01'),
    'loans_current': ('BPP', '2.01.04'), 'loans_noncurrent': ('BPP', '2.02.01'),
    'operating_cash': ('DFC_MI', '6.01'), 'investing_cash': ('DFC_MI', '6.02'), 'financing_cash': ('DFC_MI', '6.03'),
}

def read_csv(blob):
    return csv.DictReader(io.StringIO(blob.decode('latin1')), delimiter=';')

def money(row):
    if row['MOEDA'] != 'REAL': raise ValueError('Unsupported currency')
    scale = {'MIL': 1000, 'UNIDADE': 1}.get(row['ESCALA_MOEDA'])
    if scale is None: raise ValueError('Unsupported scale')
    value = Decimal(row['VL_CONTA']) * scale
    if not value.is_finite(): raise ValueError('Nonfinite value')
    return value

def ratio(a, b):
    return None if a is None or b is None or b <= 0 else a / b * 100

def growth(a, b):
    # Negative/zero comparative bases do not produce meaningful growth percentages.
    return None if a is None or b is None or b <= 0 else (a / b - 1) * 100

def download(url, cache, refresh=False):
    if not url.startswith(BASE): raise ValueError('Untrusted source')
    path = cache / hashlib.sha256(url.encode()).hexdigest()
    if path.exists() and not refresh: return path.read_bytes()
    with urllib.request.urlopen(url, timeout=120) as response:
        blob = response.read(160_000_001)
    if len(blob) > 160_000_000: raise ValueError('Archive too large')
    if url.endswith('.zip'):
        with zipfile.ZipFile(io.BytesIO(blob)) as archive:
            if sum(x.file_size for x in archive.infolist()) > 1_000_000_000 or archive.testzip(): raise ValueError('Invalid archive')
    temp = path.with_suffix('.tmp'); temp.write_bytes(blob); os.replace(temp, path)
    return blob

def verify_identity(fca, cad, symbol, identity):
    cnpj, code, bank = identity
    active = [r for r in read_csv(cad) if r['CNPJ_CIA'] == cnpj and int(r['CD_CVM']) == code and r['SIT'] == 'ATIVO']
    if not active: raise ValueError(f'{symbol}: inactive CVM identity')
    general_file=next(n for n in fca.namelist() if n.startswith('fca_cia_aberta_geral_'))
    securities_file=next(n for n in fca.namelist() if n.startswith('fca_cia_aberta_valor_mobiliario_'))
    general = [r for r in read_csv(fca.read(general_file)) if r['CNPJ_Companhia'] == cnpj]
    if not general: raise ValueError(f'{symbol}: missing FCA')
    latest = max(general, key=lambda r: (r['Data_Referencia'], int(r['Versao'])))
    if int(latest['Codigo_CVM']) != code: raise ValueError('CVM mismatch')
    securities = [r for r in read_csv(fca.read(securities_file)) if r['CNPJ_Companhia'] == cnpj and r['ID_Documento'] == latest['ID_Documento'] and r['Codigo_Negociacao'] == symbol and not r['Data_Fim_Negociacao']]
    if not securities: raise ValueError(f'{symbol}: ticker not linked by FCA')
    return {'symbol': symbol, 'cnpj': cnpj, 'cvm': code, 'bank': bank, 'name': latest['Nome_Empresarial'], 'fca_document': latest['ID_Documento'], 'fca_reference': latest['Data_Referencia']}

def select_rows(rows):
    """Latest complete document version, never mixing statements/versions or scopes."""
    version = max(int(r['VERSAO']) for r in rows)
    rows = [r for r in rows if int(r['VERSAO']) == version]
    scope = 'con' if any(r['_scope'] == 'con' for r in rows) else 'ind'
    rows = [r for r in rows if r['_scope'] == scope]
    unique = {}
    for r in rows:
        key = (r['_statement'], r['ORDEM_EXERC'], r.get('DT_INI_EXERC', ''), r['DT_FIM_EXERC'], r['CD_CONTA'])
        if key in unique and money(unique[key]) != money(r): raise ValueError('Conflicting duplicated account')
        unique[key] = r
    return list(unique.values()), version, scope

def get_account(rows, statement, code, end, start=None, exercise='ÚLTIMO'):
    found = [r for r in rows if r['_statement'] == statement and r['CD_CONTA'] == code and r['DT_FIM_EXERC'] == end and r['ORDEM_EXERC'] == exercise and (start is None or r.get('DT_INI_EXERC') == start)]
    if len(found) != 1: return None
    r = found[0]
    return {'value': money(r), 'account': code, 'label': r['DS_CONTA'], 'statement': statement, 'scale': r['ESCALA_MOEDA'], 'raw': r['VL_CONTA'], 'start': r.get('DT_INI_EXERC'), 'end': end, 'exercise': exercise}

def prepare(rows, bank, end, start, kind):
    values, evidence = {}, {}
    accounts = dict(ACCOUNTS)
    if bank:
        accounts.update(profit=('DRE', '3.09'), equity=('BPP', '2.08'), cash=('BPA', '1.01'))
    for key, (statement, code) in accounts.items():
        flow = statement.startswith(('DRE', 'DFC'))
        item = get_account(rows, statement, code, end, start if flow else None)
        if bank and key in ['revenue', 'costs', 'gross_profit', 'operating_profit', 'financial_result', 'loans_current', 'loans_noncurrent']: item = None
        # Reject ambiguous/nonstandard loan accounts even if they share a code.
        if key.startswith('loans_') and item and not item['label'].startswith('Empréstimos e Financiamentos'): item = None
        values[key] = item['value'] if item else None
        if item: evidence[key] = item
    a, e = values['assets'], values['equity']
    values['liabilities'] = a - e if a is not None and e is not None else None
    values['loans'] = sum(values[k] for k in ['loans_current', 'loans_noncurrent']) if all(values[k] is not None for k in ['loans_current','loans_noncurrent']) else None
    values['net_debt'] = None  # No complete mapping of leases, restricted cash and other debt yet.
    values['net_margin'] = ratio(values['profit'], values['revenue'])
    values['operating_margin'] = ratio(values['operating_profit'], values['revenue'])
    values['loans_equity'] = ratio(values['loans'], e)
    values['roe'] = values['roa'] = values['revenue_growth'] = values['profit_growth'] = values['equity_growth'] = None
    if kind == 'annual':
        year = int(end[:4]); prior_end = f'{year-1}-12-31'; prior_start = f'{year-1}-01-01'
        for name, numerator in [('roe','equity'), ('roa','assets')]:
            st, code = accounts[numerator]; previous = get_account(rows, st, code, prior_end, exercise='PENÚLTIMO')
            if previous and values[numerator] is not None:
                evidence[f'opening_{numerator}'] = previous
                values[name] = ratio(values['profit'], (values[numerator] + previous['value']) / 2)
        for key in ['revenue','profit','equity']:
            if bank and key == 'revenue': continue
            st, code = accounts[key]; previous = get_account(rows, st, code, prior_end, prior_start if st == 'DRE' else None, 'PENÚLTIMO')
            if previous:
                evidence[f'previous_{key}'] = previous
                values[f'{key}_growth'] = growth(values[key], previous['value'])
    return {'kind': kind, 'start': start, 'end': end, 'values': values, 'evidence': evidence}

def json_bytes(data):
    return json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False, default=lambda x: float(x) if isinstance(x, Decimal) else str(x)).encode('utf8')

def build(cache, output, refresh=False):
    year_now=datetime.now(timezone.utc).year
    cad = download(BASE+'CAD/DADOS/cad_cia_aberta.csv', cache, refresh)
    fca_url = BASE+f'DOC/FCA/DADOS/fca_cia_aberta_{year_now}.zip'
    fca = zipfile.ZipFile(io.BytesIO(download(fca_url, cache, refresh)))
    identities = {s: verify_identity(fca, cad, s, i) for s, i in ISSUERS.items()}
    periods = {s: [] for s in ISSUERS}; sources = []
    for typ, years in [('dfp', range(year_now-3,year_now)), ('itr', [year_now-1,year_now])]:
        for year in years:
            url = BASE+f'DOC/{typ.upper()}/DADOS/{typ}_cia_aberta_{year}.zip'
            blob = download(url, cache, refresh); archive = zipfile.ZipFile(io.BytesIO(blob))
            sources.append({'url': url, 'sha256': hashlib.sha256(blob).hexdigest()})
            docs = {}
            metadata = list(read_csv(archive.read(f'{typ}_cia_aberta_{year}.csv')))
            for name in archive.namelist():
                parts = name.removesuffix('.csv').split('_'); scope = parts[-2]
                statement = '_'.join(parts[3:-2])
                if scope not in ['con','ind'] or statement not in ['DRE','BPA','BPP','DFC_MI']: continue
                for r in read_csv(archive.read(name)):
                    symbol = next((s for s,i in ISSUERS.items() if r['CNPJ_CIA'] == i[0] and int(r['CD_CVM']) == i[1]), None)
                    if symbol:
                        r['_scope'] = scope; r['_statement'] = statement
                        docs.setdefault((symbol, r['DT_REFER']), []).append(r)
            for (symbol,end), rows in docs.items():
                selected, version, scope = select_rows(rows)
                meta = [r for r in metadata if r['CNPJ_CIA'] == ISSUERS[symbol][0] and r['DT_REFER'] == end and int(r['VERSAO']) == version]
                if not meta: raise ValueError('Missing document metadata')
                if len({r['ID_DOC'] for r in meta}) != 1: raise ValueError('Conflicting document identifiers')
                document = meta[0]
                starts = sorted({r.get('DT_INI_EXERC') for r in selected if r['_statement']=='DRE' and r['ORDEM_EXERC']=='ÚLTIMO' and r['DT_FIM_EXERC']==end and r.get('DT_INI_EXERC')})
                for start in starts:
                    if start[:4] != end[:4]: continue
                    if typ == 'dfp':
                        if start[5:]!='01-01' or end[5:]!='12-31': continue
                        kind='annual'
                    else:
                        quarters={'01-01':'03-31','04-01':'06-30','07-01':'09-30','10-01':'12-31'}
                        kind='quarter' if quarters.get(start[5:])==end[5:] else 'ytd'
                    record=prepare(selected, ISSUERS[symbol][2], end, start, kind)
                    record.update(document={'version': version, 'received': document['DT_RECEB'], 'id': document['ID_DOC'], 'url': document['LINK_DOC'], 'dataset': url, 'scope': scope, 'reference': end})
                    periods[symbol].append(record)
    documents={}
    for symbol, data in periods.items():
        if not data or not any(p['kind']=='annual' and p['values']['assets'] is not None and p['values']['profit'] is not None for p in data): raise ValueError(f'{symbol}: empty or invalid publication')
        documents[symbol]={'issuer': identities[symbol], 'periods': sorted(data,key=lambda p:(p['end'],p['start'])), 'sources': sources, 'license':'ODbL-1.0', 'limitations':['Q4 não derivado: compatibilidade contábil entre documentos não comprovada.', 'Fluxos trimestrais só publicados quando explicitamente informados no documento.', 'Dívida líquida e múltiplos de mercado indisponíveis.']}
    digest=hashlib.sha256(json_bytes(documents)).hexdigest()[:16]
    # A failed/partial refresh must not destroy a previously validated coverage set.
    if (output/'manifest.json').exists():
        previous=json.loads((output/'manifest.json').read_text(encoding='utf8'))
        for symbol, info in previous['companies'].items():
            old=json.loads((output/info['path']).read_text(encoding='utf8'))
            current={(p['kind'],p['start'],p['end']):p for p in documents[symbol]['periods']}
            for p in old['periods']:
                new=current.get((p['kind'],p['start'],p['end']))
                if not new or any(v is not None and new['values'].get(k) is None for k,v in p['values'].items()):
                    raise ValueError(f'{symbol}: refresh would remove valid coverage; manual review required')
    snapshot=output/'snapshots'/digest; snapshot.mkdir(parents=True,exist_ok=True)
    for symbol, document in documents.items(): (snapshot/f'{symbol}.json').write_bytes(json_bytes(document))
    manifest={'snapshot':digest,'processed_at':datetime.now(timezone.utc).isoformat(), 'license':'ODbL-1.0', 'source': 'CVM — DFP, ITR e FCA', 'companies':{s:{'path':f'snapshots/{digest}/{s}.json','cnpj':i['cnpj'],'cvm':i['cvm'],'name':i['name']} for s,i in identities.items()},'coverage':{s:{'periods':len(d['periods']), 'references':[{'kind':p['kind'],'start':p['start'],'end':p['end'],'version':p['document']['version'],'available':[k for k,v in p['values'].items() if v is not None],'unavailable':[k for k,v in p['values'].items() if v is None]} for p in d['periods']]} for s,d in documents.items()}, 'mapping_errors':[], 'unmapped':'Demais ações do catálogo sem cobertura própria nesta versão.'}
    if (output/'manifest.json').exists() and previous['snapshot']==digest and previous['coverage']==manifest['coverage']: return previous
    temp=output/'manifest.tmp'; temp.write_bytes(json_bytes(manifest)); os.replace(temp,output/'manifest.json')
    return manifest

if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--refresh',action='store_true'); args=parser.parse_args()
    cache=ROOT/'.vercel/cvm-cache-v2'; cache.mkdir(parents=True,exist_ok=True)
    output=ROOT/'frontend/public/financials'; output.mkdir(parents=True,exist_ok=True)
    try: print(json.dumps(build(cache,output,args.refresh),ensure_ascii=True,indent=2))
    except Exception as exc:
        (cache/'last-error.txt').write_text(f'{datetime.now(timezone.utc).isoformat()} {exc}',encoding='utf8')
        raise
