import json
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.error import HTTPError
from unittest.mock import patch
from pydantic import SecretStr
from fastapi.testclient import TestClient
from app.main import app
from app import sports, sports_football
from app.config import settings
from app.sports_http import SportsHTTP, DataError, reset_delay
import pytest


def test_aggregate_reuses_games_and_standings(monkeypatch):
    monkeypatch.setattr(settings,'football_data_api_key',SecretStr('TEST_ONLY'))
    monkeypatch.setattr(sports_football,'http',SportsHTTP('https://api.football-data.org/v4','X-Auth-Token',10))
    paths=[]
    class Reply:
        headers={}
        def __init__(self,data): self.data=data
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def read(self,size): return json.dumps(self.data).encode()
    def opening(req,**kwargs):
        url=req.full_url; paths.append(url)
        if '/competitions/BSA/teams' in url: return Reply({'teams':[{'id':4,'name':'São Paulo FC'}]})
        if '/matches' in url: return Reply({'matches':[]})
        if '/standings' in url: return Reply({'season':{'startDate':sports.season('spfc')+'-01-01'},'standings':[{'type':'TOTAL','table':[{'team':{'id':4,'name':'São Paulo'},'position':1,'playedGames':10,'points':30}]}]})
        raise HTTPError(url,403,'Forbidden',{},None)
    with patch('app.sports_http.build_opener') as opener:
        opener.return_value.open.side_effect=opening
        client=TestClient(app)
        for _ in range(2):
            response=client.get('/api/sports/spfc?include=all')
            data=response.json()['sections']
            assert data['standings']['state']=='available'
            assert data['statistics']['items'][0]['value']==10
            assert data['roster']['state']=='unavailable'
            assert 'TEST_ONLY' not in response.text
        assert len(paths)==4
        assert sum('/standings' in p for p in paths)==1
        assert sum('/matches' in p for p in paths)==1


def test_overview_keeps_independent_errors():
    def load(team,kind): return sports.section('rate_limited' if kind=='roster' else 'empty',note=kind)
    with patch.object(sports,'load_section',side_effect=load):
        response=TestClient(app).get('/api/sports/76ers?include=all')
        assert len(response.json()['sections'])==5
        assert response.json()['sections']['schedule']['state']=='empty'
        assert 's-maxage=15' in response.headers['cache-control']


def test_retry_after_and_recovery(monkeypatch):
    clock=[100.0]
    monkeypatch.setattr('app.sports_http.monotonic',lambda:clock[0])
    h=SportsHTTP('https://api.balldontlie.io/v1','Authorization',5)
    with patch('app.sports_http.build_opener') as opener:
        opener.return_value.open.side_effect=HTTPError('hidden',429,'hidden',{'Retry-After':'120'},None)
        with pytest.raises(DataError):h.get('/teams',SecretStr('fake'))
        clock[0]=219
        with pytest.raises(DataError):h.get('/teams',SecretStr('fake'))
        assert opener.return_value.open.call_count==1
        reply=opener.return_value.open.return_value.__enter__.return_value
        reply.read.return_value=b'{}';reply.headers={}
        opener.return_value.open.side_effect=None
        clock[0]=221
        assert h.get('/teams',SecretStr('fake'))=={}
    assert reset_delay({'Retry-After':'bad'})==60
    with patch('app.sports_http.time',return_value=0):
        assert reset_delay({'Retry-After':format_datetime(datetime.fromtimestamp(180,timezone.utc),usegmt=True)})==180
