import asyncio
from urllib.error import HTTPError, URLError
from unittest.mock import patch
from pydantic import SecretStr
from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from app import market
from app.main import app

def payload(data): return {'results': [{'symbol': 'ITUB4', 'data': data}]}

@pytest.fixture(autouse=True)
def setup(monkeypatch):
    monkeypatch.delenv('VERCEL', raising=False)
    monkeypatch.setattr(market.settings, 'brapi_api_key', None)
    monkeypatch.setattr(market.settings, 'market_data_public_enabled', False)
    market.cache.clear()
    monkeypatch.setattr(market, 'lock', asyncio.Lock())

def test_quote_missing_values_and_real_timestamp():
    result = market.normalize_quote(payload({'regularMarketPrice': 39.05, 'regularMarketTime': '2026-10-30T16:32:30Z', 'regularMarketChange': 0}), 'ITUB4')
    assert result['price'] == 39.05
    assert result['change'] == 0
    assert result['market_cap'] is None
    assert result['quoted_at'] == '2026-10-30T16:32:30+00:00'
    assert result['delayed']

def test_history_sorts_deduplicates_and_ignores_invalid():
    result = market.normalize_history(payload({'usedRange': '7d', 'usedInterval': '1d', 'historicalDataPrice': [{'date': 200, 'close': 4}, {'date': 100, 'close': 2}, {'date': 100, 'close': 3}, {'date': 300, 'close': 'NaN'}]}), 'ITUB4', '7d')
    assert [point['close'] for point in result['points']] == [3, 4]

@pytest.mark.parametrize('body', [{}, {'results': []}, payload({'regularMarketPrice': 'NaN'})])
def test_malformed_quote(body):
    with pytest.raises(HTTPException) as error: market.normalize_quote(body, 'ITUB4')
    assert error.value.status_code == 502

@pytest.mark.parametrize('code', [400, 401, 403, 404, 429, 500])
def test_upstream_error_is_safe(code, monkeypatch):
    monkeypatch.setattr(market.settings, 'brapi_api_key', SecretStr('SECRET_NOT_TO_LEAK'))
    with patch('app.market.urlopen', side_effect=HTTPError('https://brapi.dev', code, 'SECRET_NOT_TO_LEAK', {}, None)) as mock:
        with pytest.raises(HTTPException) as error: market.fetch_provider('quote', 'ITUB4')
    assert error.value.status_code == (code if code != 500 else 502)
    assert 'SECRET' not in error.value.detail
    request = mock.call_args.args[0]
    assert 'SECRET' not in request.full_url
    assert request.get_header('Authorization') == 'Bearer SECRET_NOT_TO_LEAK'

def test_network_error():
    with patch('app.market.urlopen', side_effect=URLError('network')):
        with pytest.raises(HTTPException) as error: market.fetch_provider('quote', 'ITUB4')
    assert error.value.status_code == 503

def test_public_gate_prevents_all_source_requests(monkeypatch):
    monkeypatch.setenv('VERCEL', '1')
    with TestClient(app) as client, patch('app.market.fetch_provider') as provider:
        assert client.get('/api/market/status').json()['available'] is False
        for url in ['/api/market/quote/ITUB4', '/api/market/history/ITUB4', '/api/market/search']:
            assert client.get(url).status_code == 503
        provider.assert_not_called()

def test_search_validation_and_cache(monkeypatch):
    monkeypatch.setattr(market, 'fetch_provider', lambda *args: payload({'regularMarketPrice': 10}))
    with TestClient(app) as client:
        assert client.get('/api/market/search?q=itaú').json()[0]['symbol'] == 'ITUB4'
        assert client.get('/api/market/search?q=itau').json()[0]['symbol'] == 'ITUB4'
        assert client.get('/api/market/quote/bad').status_code == 400
        assert client.get('/api/market/quote/ABCD3').status_code == 403
        assert client.get('/api/market/history/ITUB4?range=1y').status_code == 422
        assert client.get('/api/market/quote/itub4').json()['symbol'] == 'ITUB4'
    market.cache.clear()
    with patch('app.market.fetch_provider', return_value=payload({'regularMarketPrice': 10})) as provider:
        async def run():
            await asyncio.gather(market.cached('quote', 'ITUB4'), market.cached('quote', 'ITUB4'))
            await market.cached('quote', 'ITUB4')
        asyncio.run(run())
        assert provider.call_count == 1

def test_history_coverage_is_not_fabricated():
    with pytest.raises(HTTPException): market.normalize_history(payload({'usedRange': '1y', 'usedInterval': '1d'}), 'ITUB4', '3mo')

def test_cache_expires_after_thirty_minutes(monkeypatch):
    clock = [0]
    monkeypatch.setattr(market.time, 'monotonic', lambda: clock[0])
    with patch('app.market.fetch_provider', return_value=payload({'regularMarketPrice': 10})) as provider:
        async def run():
            await market.cached('quote', 'ITUB4')
            clock[0] = 1799
            await market.cached('quote', 'ITUB4')
            assert provider.call_count == 1
            clock[0] = 1801
            await market.cached('quote', 'ITUB4')
        asyncio.run(run())
        assert provider.call_count == 2
