"""Free BALLDONTLIE games and players. No paid endpoints or inferred standings."""
from datetime import datetime, timezone, timedelta
from .sports_http import SportsHTTP, DataError
from .sports_assets import nba_crest

http = SportsHTTP('https://api.balldontlie.io/v1', 'Authorization', 5)


def pages(path,key,params):
    rows, cursor = [], None
    for _ in range(3):
        query = dict(params, per_page=100)
        if cursor is not None: query['cursor'] = cursor
        data = http.get(path,key,query,ttl=1800)
        if not isinstance(data.get('data'),list): raise DataError()
        rows.extend(data['data'])
        next_cursor = data.get('meta',{}).get('next_cursor')
        if next_cursor is None: return rows
        if not isinstance(next_cursor,int) or next_cursor == cursor: raise DataError()
        cursor = next_cursor
    raise DataError('unavailable')  # Never represent a truncated page set as complete.


def load(team,kind,key):
    from .sports import section, season, games
    source = 'https://www.balldontlie.io/'
    def result(items,note):
        out = section('available' if items else 'empty',items,note,partial=True)
        out['source'] = source
        return out
    if kind in ('standings','statistics'):
        out = section('unavailable',note='Classificação oficial e médias NBA não estão incluídas no plano gratuito. Nenhuma campanha parcial é apresentada como oficial.')
        out['source'] = source
        return out
    teams = http.get('/teams',key,ttl=86400).get('data')
    if not isinstance(teams,list): raise DataError()
    info = next((t for t in teams if t.get('full_name') == 'Philadelphia 76ers'),None)
    if not info or not isinstance(info.get('id'),int): raise DataError()
    tid = info['id']
    if kind == 'roster':
        rows = pages('/players',key,{'team_ids[]':[tid]})
        return result([dict(name=(p.get('first_name','')+' '+p.get('last_name','')).strip(),position=p.get('position') or '',height=str(p['height'])[:20] if p.get('height') else None,number=int(p['jersey_number']) if str(p.get('jersey_number','')).isdigit() else None) for p in rows if (p.get('team') or {}).get('id') == tid], 'Jogadores associados à equipe no cadastro; a API gratuita não confirma elenco ativo da temporada. Sem médias individuais.')
    now = datetime.now(timezone.utc)
    year = int(season(team)[:4])
    rows = pages('/games',key,{'team_ids[]':[tid],'seasons[]':[year]})
    normalized = []
    for m in rows:
        when = m.get('datetime')  # Date-only values never become invented midnight starts.
        status = str(m.get('status',''))
        state = m.get('status_state')
        final = state == 'final' or (not state and status == 'Final')
        scheduled = state == 'scheduled' or (not state and m.get('period') == 0 and m.get('time') in ('','Not started',None) and not any(s in status.lower() for s in ('postpon','cancel','suspend','final')))
        if m.get('postponed'): continue
        if not final and not scheduled: continue
        normalized.append(dict(idEvent=str(m['id']),idHomeTeam=str(m['home_team']['id']),idAwayTeam=str(m['visitor_team']['id']),strHomeTeam=m['home_team']['full_name'],strAwayTeam=m['visitor_team']['full_name'],strTimestamp=when,strStatus='FT' if final else 'NS',intHomeScore=m.get('home_team_score') if final else None,intAwayScore=m.get('visitor_team_score') if final else None,strLeague='NBA',strSeason=str(m.get('season',year))+'-'+str(int(m.get('season',year))+1),strSport='Basketball'))
    items=games(normalized,str(tid),kind=='schedule',now)
    for item in items:
        raw=next(m for m in rows if str(m['id'])==item['id'])
        item['home_crest']=nba_crest(raw['home_team'])
        item['away_crest']=nba_crest(raw['visitor_team'])
    return result(items,'Jogos retornados pela NBA API. Inclui os tipos de partida presentes na fonte; sem classificação ou médias pagas.')
