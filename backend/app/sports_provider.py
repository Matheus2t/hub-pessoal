"""TheSportsDB adapter. Public, documented API only; artwork is not fetched."""
import json
from threading import RLock
from time import monotonic
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from .config import settings

cache = {}
calls = []
lock = RLock()


class ProviderError(Exception):
    def __init__(self, state='error'):
        self.state = state


class SportsDB:
    def get(self, endpoint, **params):
        api_key = settings.sportsdb_api_key.get_secret_value() if settings.sportsdb_api_key else '123'
        if not api_key.isdecimal() or len(api_key) > 100:
            raise ProviderError()
        key = (api_key, endpoint, tuple(sorted(params.items())))
        with lock:
            now = monotonic()
            if key in cache and cache[key][0] > now:
                return cache[key][1]
            calls[:] = [stamp for stamp in calls if now - stamp < 60]
            if len(calls) >= 24:
                raise ProviderError('rate_limited')
            calls.append(now)
            request = Request('https://www.thesportsdb.com/api/v1/json/' + api_key + '/' + endpoint + '?' + urlencode(params), headers={'Accept': 'application/json', 'User-Agent': '2T/1.0'})
            try:
                with urlopen(request, timeout=5) as response:
                    raw = response.read(2_000_001)
                    if len(raw) > 2_000_000:
                        raise ProviderError()
                    data = json.loads(raw)
                    if not isinstance(data, dict):
                        raise ProviderError()
            except HTTPError as exc:
                raise ProviderError('rate_limited' if exc.code == 429 else 'error') from exc
            except (OSError, ValueError) as exc:
                raise ProviderError() from exc
            # Timestamp at completion; cache is bounded and process-local.
            cache[key] = (monotonic() + 600, data)
            if len(cache) > 40:
                del cache[next(iter(cache))]
            return data
