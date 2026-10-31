from unittest.mock import patch
from urllib.error import HTTPError
from pydantic import SecretStr
import pytest
from app import sports, sports_nba, sports_football
from app.config import settings
from app.sports_http import SportsHTTP, DataError
from fastapi.testclient import TestClient
from app.main import app


@pytest.mark.parametrize('code,state',[(401,'unavailable'),(403,'unavailable'),(404,'unavailable'),(429,'rate_limited'),(500,'error')])
def test_safe_auth_errors(code,state):
    h=SportsHTTP('https://api.football-data.org/v4','X-Auth-Token',10)
    with patch('app.sports_http.build_opener') as opener:
        opener.return_value.open.side_effect=HTTPError('secret',code,'secret',{},None)
        with pytest.raises(DataError) as exc: h.get('/teams',SecretStr('PRIVATE_TEST_KEY'))
        assert exc.value.state==state and 'PRIVATE_TEST_KEY' not in str(exc.value)


@pytest.mark.parametrize('host,header,limit',[('https://api.football-data.org/v4','X-Auth-Token',10),('https://api.balldontlie.io/v1','Authorization',5)])
def test_headers_cache_and_quota(host,header,limit):
    h=SportsHTTP(host,header,limit)
    with patch('app.sports_http.build_opener') as opener:
        response=opener.return_value.open.return_value.__enter__.return_value
        response.read.return_value=b'{"data":[]}'
        response.headers={}
        h.get('/teams',SecretStr('PRIVATE_TEST_KEY'));h.get('/teams',SecretStr('PRIVATE_TEST_KEY'))
        assert opener.return_value.open.call_count==1
        request=opener.return_value.open.call_args.args[0]
        assert dict((k.lower(),v) for k,v in request.header_items())[header.lower()]=='PRIVATE_TEST_KEY'
        assert 'PRIVATE_TEST_KEY' not in request.full_url
        for i in range(limit-1): h.get('/teams/'+str(i),SecretStr('PRIVATE_TEST_KEY'))
        with pytest.raises(DataError): h.get('/teams/more',SecretStr('PRIVATE_TEST_KEY'))


def test_nba_pagination():
    with patch.object(sports_nba.http,'get',side_effect=[{'data':[1],'meta':{'next_cursor':2}},{'data':[2],'meta':{}}]) as get:
        assert sports_nba.pages('/games',SecretStr('fake'),{})==[1,2]
        assert get.call_args.args[2]['cursor']==2


def test_barcelona_does_not_resolve_espanyol():
    with patch.object(sports_football.http,'get',return_value={'teams':[{'id':80,'name':'RCD Espanyol de Barcelona'},{'id':81,'name':'FC Barcelona'}]}):
        assert sports_football.team_info('barcelona',SecretStr('fake'))[0]['id']==81


def test_nba_schedules_lifecycle_and_date_only():
    team={'id':22,'full_name':'Philadelphia 76ers'}
    other={'id':1,'full_name':'Opponent'}
    row=dict(id=1,home_team=team,visitor_team=other,datetime='2099-01-01T23:00:00Z',status_state='scheduled',season=2098)
    with patch.object(sports_nba.http,'get',return_value={'data':[team]}), patch.object(sports_nba,'pages',return_value=[row,{**row,'id':2,'datetime':None},{**row,'id':3,'status_state':'in_progress'},{**row,'id':4,'postponed':True}]):
        result=sports_nba.load('76ers','schedule',SecretStr('fake'))
        assert len(result['items'])==1
        assert result['source']=='https://www.balldontlie.io/'


def test_football_complete_table_and_no_historical_season():
    year=sports.season('spfc')
    table=[dict(team={'id':i,'name':'Team '+str(i)},position=i,points=30,playedGames=10,won=10,draw=0,lost=0) for i in range(1,21)]
    data={'season':{'startDate':year+'-01-01'},'standings':[{'type':'TOTAL','table':table}]}
    with patch.object(sports_football,'team_info',return_value=({'id':4},'BSA')),patch.object(sports_football.http,'get',return_value=data):
        result=sports_football.load('spfc','standings',SecretStr('fake'))
        assert len(result['items'])==20 and result['items'][3]['is_team']
        assert not result.get('partial',False)
        data['season']['startDate']='1999-01-01'
        with pytest.raises(DataError): sports_football.load('spfc','standings',SecretStr('fake'))


def test_explicit_failure_no_silent_fallback_or_secret(monkeypatch):
    monkeypatch.setattr(settings,'football_data_api_key',SecretStr('PRIVATE_TEST_KEY'))
    with patch.object(sports_football,'load',side_effect=DataError('unavailable')),patch.object(sports.provider,'get') as fallback:
        response=TestClient(app).get('/api/sports/spfc/schedule')
        assert response.json()['state']=='unavailable'
        assert 'PRIVATE_TEST_KEY' not in response.text
        fallback.assert_not_called()


def test_football_champions_requires_membership_and_current_season():
    data={'season':{'startDate':sports.season('barcelona')[:4]+'-07-01'},'standings':[{'type':'TOTAL','table':[{'team':{'id':81,'name':'Barcelona'},'position':1}]}]}
    with patch.object(sports_football,'team_info',return_value=({'id':81},'PD')),patch.object(sports_football.http,'get',return_value=data) as get:
        assert sports_football.load('barcelona','standings',SecretStr('fake'),'CL')['items'][0]['is_team']
        assert get.call_args.args[0]=='/competitions/CL/standings'
        data['standings'][0]['table']=[]
        with pytest.raises(DataError): sports_football.load('barcelona','standings',SecretStr('fake'),'CL')


def test_remaining_quota_and_invalid_response():
    h=SportsHTTP('https://api.football-data.org/v4','X-Auth-Token',10)
    with patch('app.sports_http.build_opener') as opener:
        response=opener.return_value.open.return_value.__enter__.return_value
        response.read.return_value=b'{}'; response.headers={'X-RequestsAvailable':'0','X-RequestCounter-Reset':'120'}
        h.get('/teams',SecretStr('fake'))
        with pytest.raises(DataError) as error: h.get('/teams/1',SecretStr('fake'))
        assert error.value.state=='rate_limited'
        response.read.return_value=b'[]';response.headers={}
        with pytest.raises(DataError): SportsHTTP('https://api.balldontlie.io/v1','Authorization',5).get('/teams',SecretStr('fake'))
