"""Reconcile catalog tickers using the latest FCA document and active CAD only.

This registry proves issuer identity, not accounting/provent coverage. No inference
from names, ticker suffixes or old FCA documents is permitted.
"""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile
from scripts.cvm_financials import BASE, ROOT, download, read_csv, verify_identity


def reconcile(symbols, general, securities, cad):
    if len(set(symbols)) != len(symbols):
        raise ValueError('Duplicate catalog symbol')
    latest = {}
    for row in general:
        key = row['CNPJ_Companhia']
        order = (row['Data_Referencia'], int(row['Versao']))
        old = latest.get(key)
        if old is None or order > (old['Data_Referencia'], int(old['Versao'])):
            latest[key] = row
        elif order == (old['Data_Referencia'], int(old['Versao'])) and row != old:
            raise ValueError('Conflicting latest FCA identity')
    active = {(r['CNPJ_CIA'], int(r['CD_CVM'])) for r in cad if r['SIT'] == 'ATIVO'}
    issuers, unresolved = {}, []
    for symbol in symbols:
        candidates = {}
        for security in securities:
            g = latest.get(security['CNPJ_Companhia'])
            if (g and security['Codigo_Negociacao'] == symbol
                and not security['Data_Fim_Negociacao']
                and security['ID_Documento'] == g['ID_Documento']
                and (g['CNPJ_Companhia'], int(g['Codigo_CVM'])) in active):
                candidates[g['CNPJ_Companhia']] = g
        if len(candidates) != 1:
            unresolved.append({'symbol': symbol, 'reason': 'No unique active identity in latest FCA document', 'candidates': len(candidates)})
            continue
        cnpj, g = next(iter(candidates.items()))
        issuer = issuers.setdefault(cnpj, {
            'cnpj': cnpj, 'cvm': int(g['Codigo_CVM']), 'name': g['Nome_Empresarial'],
            'sector': g['Setor_Atividade'], 'status': 'ATIVO', 'symbols': [],
            'fca_document': g['ID_Documento'], 'fca_reference': g['Data_Referencia'],
            'isin': None, 'subsector': None,
        })
        issuer['symbols'].append(symbol)
    codes = [r['cvm'] for r in issuers.values()]
    if len(codes) != len(set(codes)):
        raise ValueError('CVM code mapped to different CNPJs')
    return {'issuers': list(issuers.values()), 'unresolved': unresolved}


def build_registry(cache, output):
    year = datetime.now(timezone.utc).year
    urls = [BASE + f'DOC/FCA/DADOS/fca_cia_aberta_{year}.zip', BASE + 'CAD/DADOS/cad_cia_aberta.csv']
    blobs = [download(url, cache) for url in urls]
    archive = zipfile.ZipFile(io.BytesIO(blobs[0]))
    general = list(read_csv(archive.read(next(n for n in archive.namelist() if n.startswith('fca_cia_aberta_geral_')))))
    securities = list(read_csv(archive.read(next(n for n in archive.namelist() if n.startswith('fca_cia_aberta_valor_mobiliario_')))))
    symbols = re.findall(r'"symbol": "([A-Z0-9]+)"', (ROOT / 'frontend/src/market-catalog.ts').read_text(encoding='utf8'))
    if not symbols:
        raise ValueError('Empty catalog')
    result = reconcile(symbols, general, securities, list(read_csv(blobs[1])))
    result.update(schema_version=1, catalog_count=len(symbols), license='ODbL-1.0',
                  sources=[{'url': u, 'sha256': hashlib.sha256(b).hexdigest()} for u, b in zip(urls, blobs)],
                  limitation='Identity reconciliation is not financial or corporate-action coverage.')
    temp = output.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    temp.replace(output)
    return result


if __name__ == '__main__':
    result = build_registry(ROOT / '.vercel/cvm-cache-v2', ROOT / 'docs/stocks-v3-issuers.json')
    print(json.dumps({'issuers': len(result['issuers']), 'unresolved': result['unresolved']}, ensure_ascii=True))
