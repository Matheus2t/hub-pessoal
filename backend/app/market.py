"""brapi v2 adapter. No public distribution until licensing is confirmed."""
import asyncio
from collections import OrderedDict
from datetime import datetime, timezone
import json
import math
import os
import re
import time
import unicodedata
from typing import Literal
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from .config import settings

router = APIRouter(prefix='/api/market', tags=['market'])
TEST_STOCKS = {'ITUB4': 'Itaú Unibanco', 'PETR4': 'Petrobras', 'VALE3': 'Vale', 'MGLU3': 'Magazine Luiza'}
TTL = 1800
cache = OrderedDict()
lock = asyncio.Lock()

def public_available():
    return os.getenv('VERCEL') != '1' or settings.market_data_public_enabled

def guard():
    if not public_available():
        raise HTTPException(503, 'Cotações públicas aguardam autorização de exibição dos dados. A integração está disponível apenas em desenvolvimento.')

def ticker(value):
    symbol = value.strip().upper()
    if not re.fullmatch(r'[A-Z]{4}[0-9]{1,2}', symbol):
        raise HTTPException(400, 'Informe um código válido, como ITUB4.')
    if symbol not in TEST_STOCKS and not settings.brapi_api_key:
        raise HTTPException(403, 'Sem token, estão disponíveis ITUB4, PETR4, VALE3 e MGLU3.')
    return symbol

def number(value):
    if isinstance(value, bool): return None
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (TypeError, ValueError): return None

def timestamp(value):
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, timezone.utc).isoformat()
        date = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return date.astimezone(timezone.utc).isoformat() if date.tzinfo else None
    except (ValueError, TypeError, OverflowError, OSError): return None

def fetch_provider(path, symbol, range_=None):
    # Only fixed endpoints and a validated symbol; credentials never enter URLs.
    query = f'symbols={symbol}'
    if range_: query += f'&range={range_}&interval=1d&sortOrder=asc'
    headers = {'Accept': 'application/json', 'User-Agent': '2T-Market/1.0'}
    if settings.brapi_api_key:
        headers['Authorization'] = 'Bearer ' + settings.brapi_api_key.get_secret_value()
    request = Request(f'https://brapi.dev/api/v2/stocks/{path}?{query}', headers=headers)
    try:
        with urlopen(request, timeout=12) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000: raise ValueError('size')
        return json.loads(raw)
    except HTTPError as error:
        messages = {400: 'Consulta recusada pela fonte.', 401: 'A fonte recusou a autenticação. Verifique a configuração do serviço.', 403: 'Ativo ou período não disponível no plano configurado.', 404: 'Ação não encontrada.', 429: 'Limite de consultas da fonte atingido. Tente novamente mais tarde.'}
        raise HTTPException(error.code if error.code in messages else 502, messages.get(error.code, 'A fonte de cotações está indisponível.')) from None
    except (URLError, TimeoutError, OSError):
        raise HTTPException(503, 'Não foi possível conectar à fonte de cotações. Tente novamente.') from None
    except (ValueError, TypeError):
        raise HTTPException(502, 'A fonte retornou dados inválidos.') from None

def provider_data(payload, symbol):
    try:
        result = next(item for item in payload['results'] if isinstance(item, dict) and item.get('symbol') == symbol)
        data = result['data']
        if not isinstance(data, dict): raise ValueError()
        return data
    except (KeyError, TypeError, ValueError, StopIteration):
        raise HTTPException(502, 'A fonte não retornou dados válidos para este ativo.') from None

def normalize_quote(payload, symbol):
    data = provider_data(payload, symbol)
    price = number(data.get('regularMarketPrice'))
    if price is None or price < 0: raise HTTPException(502, 'Cotação indisponível na fonte.')
    return dict(symbol=symbol, name=data.get('longName') or data.get('shortName') or symbol,
        price=price, change=number(data.get('regularMarketChange')), change_percent=number(data.get('regularMarketChangePercent')),
        quoted_at=timestamp(data.get('regularMarketTime')), source='brapi.dev', delayed=True,
        open=number(data.get('regularMarketOpen')), high=number(data.get('regularMarketDayHigh')),
        low=number(data.get('regularMarketDayLow')), volume=number(data.get('regularMarketVolume')),
        market_cap=number(data.get('marketCap')), previous_close=number(data.get('regularMarketPreviousClose')))

def normalize_history(payload, symbol, range_):
    data = provider_data(payload, symbol)
    if data.get('usedRange') != range_ or data.get('usedInterval') != '1d':
        raise HTTPException(502, 'A fonte não confirmou o período solicitado.')
    points = {}
    for row in data.get('historicalDataPrice') or []:
        date = timestamp(row.get('date')) if isinstance(row, dict) else None
        close = number(row.get('close')) if isinstance(row, dict) else None
        if date and close is not None and close >= 0: points[date] = close
    return dict(symbol=symbol, range=range_, interval='1d', source='brapi.dev', points=[dict(date=date, close=close) for date, close in sorted(points.items())])

async def cached(path, symbol, range_=None):
    key = (path, symbol, range_)
    async with lock:
        now = time.monotonic()
        if key in cache and now < cache[key][0]:
            cache.move_to_end(key)
            return cache[key][1]
        payload = await asyncio.to_thread(fetch_provider, path, symbol, range_)
        data = normalize_quote(payload, symbol) if path == 'quote' else normalize_history(payload, symbol, range_)
        data['fetched_at'] = datetime.now(timezone.utc).isoformat()
        cache[key] = (time.monotonic() + TTL, data)
        cache.move_to_end(key)
        while len(cache) > 256: cache.popitem(last=False)
        return data

@router.get('/status')
def status(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return dict(available=public_available(), extended_symbols=bool(settings.brapi_api_key), source='brapi.dev')

@router.get('/search', dependencies=[Depends(guard)])
def search(q: str = Query('', max_length=100)):
    def normalized(text): return ''.join(c for c in unicodedata.normalize('NFD', text.casefold()) if not unicodedata.combining(c))
    query = normalized(q.strip())
    return [dict(symbol=symbol, name=name) for symbol, name in TEST_STOCKS.items() if query in normalized(symbol) or query in normalized(name)]

@router.get('/quote/{symbol}', dependencies=[Depends(guard)])
async def quote(symbol: str, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return await cached('quote', ticker(symbol))

@router.get('/history/{symbol}', dependencies=[Depends(guard)])
async def history(symbol: str, response: Response, range: Literal['7d', '1mo', '3mo'] = '1mo'):
    response.headers['Cache-Control'] = 'no-store'
    return await cached('historical', ticker(symbol), range)
