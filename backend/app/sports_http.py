"""Bounded authenticated transport. Secrets stay in headers, never in URLs/errors."""
import json
from hashlib import sha256
from threading import RLock
from time import monotonic
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError


class DataError(Exception):
    def __init__(self, state='error'):
        self.state = state


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class SportsHTTP:
    def __init__(self, host, header, limit):
        assert host in ('https://api.football-data.org/v4', 'https://api.balldontlie.io/v1')
        self.host, self.header, self.limit = host, header, limit
        self.cache, self.calls, self.until = {}, [], 0
        self.lock = RLock()

    def get(self, path, secret, params=None, ttl=900):
        if not path.startswith('/') or '?' in path or '..' in path:
            raise DataError()
        key = (path, urlencode(params or {}, doseq=True), sha256(secret.get_secret_value().encode()).digest())
        with self.lock:
            now = monotonic()
            if key in self.cache and self.cache[key][0] > now:
                return self.cache[key][1]
            self.calls[:] = [t for t in self.calls if now-t < 60]
            if now < self.until or len(self.calls) >= self.limit:
                raise DataError('rate_limited')
            self.calls.append(now)
            req = Request(self.host+path+('?' + key[1] if key[1] else ''), headers={self.header: secret.get_secret_value(), 'Accept':'application/json'})
            try:
                with build_opener(NoRedirect()).open(req, timeout=6) as response:
                    raw = response.read(2_000_001)
                    if len(raw) > 2_000_000: raise DataError()
                    data = json.loads(raw)
                    if not isinstance(data, dict): raise DataError()
                    remaining = response.headers.get('X-Requests-Available-Minute', response.headers.get('X-RequestsAvailable'))
                    if remaining == '0':
                        try: reset = min(3600, max(60, int(response.headers.get('X-RequestCounter-Reset', '60'))))
                        except ValueError: reset = 60
                        self.until = monotonic()+reset
            except HTTPError as exc:
                if exc.code == 429: self.until = monotonic()+60
                state = 'rate_limited' if exc.code == 429 else 'unavailable' if exc.code in (401,403,404) else 'error'
                raise DataError(state) from None
            except (OSError, ValueError):
                raise DataError() from None
            self.cache[key] = (monotonic()+ttl, data)
            if len(self.cache) > 64: del self.cache[next(iter(self.cache))]
            return data
