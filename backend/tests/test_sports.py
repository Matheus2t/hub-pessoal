from datetime import datetime, timezone
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import sports, sports_provider

NOW = datetime(2026, 10, 31, 12, tzinfo=timezone.utc)


def event(day=1, **changes):
    return dict(idEvent=str(day), idHomeTeam='134291', idAwayTeam='1', strHomeTeam='São Paulo', strAwayTeam='Adversário', strTimestamp=f'2026-11-{day:02}T00:30:00', strStatus='NS', strLeague='Liga de teste', strSeason='2026', **changes)


def test_future_order_limit_dedup_and_timezone():
    rows = [event(day) for day in range(15, 0, -1)]
    rows += [rows[0], {**event(), 'strTimestamp': '2026-01-01T00:00:00'}, {**event(), 'strStatus': 'FT'}, {**event(), 'strPostponed': 'yes'}, {**event(), 'intHomeScore': '0'}, {**event(), 'strTimestamp': None}, {**event(), 'idHomeTeam': 'other'}]
    result = sports.games(rows, '134291', True, NOW)
    assert len(result) == 10
    assert [row['id'] for row in result] == [str(i) for i in range(1, 11)]
    from zoneinfo import ZoneInfo
    local = datetime.fromisoformat(result[0]['starts_at']).astimezone(ZoneInfo('America/Sao_Paulo'))
    assert (local.day, local.hour, local.minute) == (31, 21, 30)


def test_results_require_completed_real_scores():
    row = {**event(), 'strTimestamp': '2026-10-30T22:00:00', 'strStatus': 'Match Finished', 'intHomeScore': '2', 'intAwayScore': '1'}
    assert sports.games([row], '134291', False, NOW)[0]['outcome'] == 'V'
    assert sports.games([{**row, 'strStatus': 'NS'}, {**row, 'intAwayScore': None}], '134291', False, NOW) == []


def test_invalid_dates_and_anonymous_opponent_are_not_matches():
    assert sports.timestamp({'strTimestamp': 123}) is None
    assert sports.timestamp({'strTimestamp': '2027-01-01'}) is None
    assert sports.games([{**event(), 'strAwayTeam': ''}], '134291', True, NOW) == []


def test_results_contract_uses_results_field():
    row = {**event(), 'strTimestamp': '2020-01-01T22:00:00', 'strStatus': 'FT', 'intHomeScore': '2', 'intAwayScore': '1'}
    with patch.object(sports.provider, 'get', return_value={'results': [row]}):
        assert sports.load_section('spfc', 'results')['items'][0]['outcome'] == 'V'


@pytest.mark.parametrize('team,month,expected', [('76ers', 1, '2025-2026'), ('76ers', 10, '2026-2027'), ('barcelona', 6, '2025-2026'), ('barcelona', 7, '2026-2027'), ('spfc', 1, '2026'), ('spfc', 12, '2026')])
def test_season_boundaries(team, month, expected):
    assert sports.season(team, datetime(2026, month, 1, tzinfo=timezone.utc)) == expected


def test_year_change():
    assert sports.season('barcelona', datetime(2027, 1, 1, tzinfo=timezone.utc)) == '2026-2027'
    assert sports.season('spfc', datetime(2027, 1, 1, tzinfo=timezone.utc)) == '2027'


def test_independent_sections_and_no_secrets():
    client = TestClient(app)
    with patch.object(sports.provider, 'get', side_effect=sports.ProviderError('rate_limited')):
        result = client.get('/api/sports/spfc/schedule')
        assert result.status_code == 200 and result.json()['state'] == 'rate_limited'
        assert result.headers['cache-control'] == 'no-store'
        assert client.get('/api/sports/spfc/roster').json()['state'] == 'unavailable'
        assert client.get('/api/health').status_code == 200
    assert client.get('/api/sports/unknown').status_code == 404
    assert client.get('/api/sports/spfc/unknown').status_code == 404
    assert '123' not in client.get('/api/sports/spfc').text


def test_standings_season_highlight_and_malformed():
    table = {'table': [{'idTeam': '134291', 'strTeam': 'São Paulo', 'strSeason': sports.season('spfc'), 'intRank': '4', 'intPoints': '50', 'intPlayed': '30'}, {'strSeason': '1999'}]}
    with patch.object(sports.provider, 'get', return_value=table):
        result = sports.load_section('spfc', 'standings')
    assert len(result['items']) == 1 and result['items'][0]['is_team']
    with patch.object(sports.provider, 'get', return_value={'events': 'bad'}):
        assert sports.load_section('spfc', 'schedule')['state'] == 'error'
    assert sports.load_section('76ers', 'standings')['state'] == 'unavailable'


def test_cache_timeout_size_and_rate_limit(monkeypatch):
    class Reply:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self, size): return b'{"events":null}'
    sports_provider.cache.clear(); sports_provider.calls.clear()
    with patch.object(sports_provider, 'urlopen', return_value=Reply()) as opening:
        sports.provider.get('eventsnext.php', id='134291')
        sports.provider.get('eventsnext.php', id='134291')
        assert opening.call_count == 1
        assert opening.call_args.kwargs['timeout'] == 5
    sports_provider.cache.clear()
    sports_provider.calls[:] = [sports_provider.monotonic()] * 24
    with pytest.raises(sports.ProviderError) as error:
        sports.provider.get('eventsnext.php', id='134291')
    assert error.value.state == 'rate_limited'
    sports_provider.calls.clear()


def test_statistics_only_use_verified_team_row():
    table = {'table': [{'idTeam': '133739', 'strTeam': 'Barcelona', 'strSeason': sports.season('barcelona'), 'intRank': '1', 'intPoints': '27', 'intPlayed': '10', 'intGoalsFor': '40', 'intGoalsAgainst': '11', 'intDraw': '0'}]}
    with patch.object(sports.provider, 'get', return_value=table):
        data = TestClient(app).get('/api/sports/barcelona/statistics').json()
        assert data['state'] == 'available'
        values = {item['label']: item['value'] for item in data['items']}
        assert values['Gols marcados'] == 40 and values['Empates'] == 0
        assert sports.load_section('spfc', 'statistics')['state'] == 'unavailable'
    with patch.object(sports.provider, 'get', side_effect=sports.ProviderError()):
        assert sports.load_section('barcelona', 'statistics')['state'] == 'error'


def test_optional_key_stays_server_side_and_public_cache_is_separate(monkeypatch):
    from pydantic import SecretStr
    from app.config import settings
    class Reply:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self, size): return b'{"events":null}'
    sports_provider.cache.clear(); sports_provider.calls.clear()
    with patch.object(sports_provider, 'urlopen', return_value=Reply()) as opening:
        monkeypatch.setattr(settings, 'sportsdb_api_key', None)
        sports.provider.get('eventsnext.php', id='134291')
        monkeypatch.setattr(settings, 'sportsdb_api_key', SecretStr('987654321'))
        sports.provider.get('eventsnext.php', id='134291')
        assert opening.call_count == 2
        assert '/987654321/' in opening.call_args.args[0].full_url
        response = TestClient(app).get('/api/sports/spfc/schedule')
        assert '987654321' not in response.text
    monkeypatch.setattr(settings, 'sportsdb_api_key', SecretStr('invalid/key'))
    with pytest.raises(sports.ProviderError):
        sports.provider.get('eventsnext.php', id='134291')
    sports_provider.cache.clear(); sports_provider.calls.clear()
