"""football-data.org v4 adapter; resolve IDs from authorized competition teams."""
import unicodedata
from datetime import datetime, timezone, timedelta
from .sports_http import SportsHTTP, DataError

http = SportsHTTP('https://api.football-data.org/v4', 'X-Auth-Token', 10)


def fold(name):
    return ''.join(c for c in unicodedata.normalize('NFD', name.lower()) if unicodedata.category(c) != 'Mn')


def team_info(team, key):
    code = 'BSA' if team == 'spfc' else 'PD'
    data = http.get(f'/competitions/{code}/teams', key, ttl=21600)
    if not isinstance(data.get('teams'), list): raise DataError()
    names = ('sao paulo fc','sao paulo futebol clube','sao paulo') if team == 'spfc' else ('fc barcelona','futbol club barcelona')
    match = next((t for t in data['teams'] if fold(t.get('name','')) in names), None)
    if not match or not isinstance(match.get('id'), int): raise DataError()
    return match, code


def load(team, kind, key, competition=None):
    from .sports import games, section, season
    info, code = team_info(team, key)
    if competition:
        if competition != 'CL' or team != 'barcelona' or kind != 'standings': raise DataError('unavailable')
        code = competition
    tid = info['id']
    source = 'https://www.football-data.org/'
    def result(items, note='', **extra):
        out = section('available' if items else 'empty', items, note, **extra)
        out['source'] = source
        return out
    if kind in ('schedule','results'):
        now = datetime.now(timezone.utc)
        future = kind == 'schedule'
        data = http.get(f'/teams/{tid}/matches', key, {'season':int(season(team)[:4]), 'limit':500})
        if not isinstance(data.get('matches'), list): raise DataError()
        rows = []
        for m in data['matches']:
            if future and m.get('status') not in ('TIMED','SCHEDULED'): continue
            if future and m.get('status') == 'SCHEDULED' and str(m.get('utcDate',''))[11:19] == '00:00:00': continue
            score = (m.get('score') or {}).get('fullTime') or {}
            start_year = (m.get('season') or {}).get('startDate','')[:4]
            end_year = (m.get('season') or {}).get('endDate','')[:4]
            rows.append(dict(idEvent=str(m['id']), idHomeTeam=str(m['homeTeam']['id']), idAwayTeam=str(m['awayTeam']['id']), strHomeTeam=m['homeTeam']['name'], strAwayTeam=m['awayTeam']['name'], strTimestamp=m.get('utcDate'), strStatus='NS' if m.get('status') in ('SCHEDULED','TIMED') else 'FT' if m.get('status') == 'FINISHED' else m.get('status'), intHomeScore=score.get('home'), intAwayScore=score.get('away'), strLeague=m.get('competition',{}).get('name',''), strSeason=start_year if start_year == end_year else start_year+'-'+end_year, strVenue=m.get('venue','')))
        items=games(rows,str(tid),future)
        scheduled={str(m['id']) for m in data['matches'] if m.get('status')=='SCHEDULED'}
        for item in items:
            if item['id'] in scheduled: item['status']='Horário a confirmar'
        return result(items, 'Horários fornecidos pela API; partidas SCHEDULED ainda dependem de confirmação. Registros sem horário utilizável não são exibidos.', partial=True)
    if kind in ('standings','statistics'):
        data = http.get(f'/competitions/{code}/standings', key)
        expected = season(team)[:4]
        if str(data.get('season',{}).get('startDate',''))[:4] != expected: raise DataError('unavailable')
        tables = data.get('standings')
        if not isinstance(tables,list): raise DataError()
        table = next((t.get('table') for t in tables if t.get('type') == 'TOTAL' and any((r.get('team') or {}).get('id') == tid for r in t.get('table',[]))), None)
        if not isinstance(table,list): raise DataError('unavailable')
        rows = [dict(team=r['team']['name'],is_team=r['team']['id']==tid,rank=r.get('position'),points=r.get('points'),played=r.get('playedGames'),wins=r.get('won'),draws=r.get('draw'),losses=r.get('lost'),goal_difference=r.get('goalDifference'),goals_for=r.get('goalsFor'),goals_against=r.get('goalsAgainst')) for r in table]
        if not any(r['is_team'] for r in rows): raise DataError('unavailable')
        if kind == 'statistics':
            own = next((r for r in rows if r['is_team']),{})
            rows = [dict(label=label,value=own[k]) for k,label in [('played','Jogos'),('points','Pontos'),('wins','Vitórias'),('draws','Empates'),('losses','Derrotas'),('goals_for','Gols marcados'),('goals_against','Gols sofridos')] if own.get(k) is not None]
        return result(rows, 'Classificação principal da temporada. Estatísticas individuais não incluídas.', competition=data.get('competition',{}).get('name',code),season=season(team))
    data = http.get(f'/teams/{tid}',key,ttl=21600)
    if not isinstance(data.get('squad'),list): raise DataError('unavailable')
    updated = data.get('lastUpdated')
    if not updated or datetime.fromisoformat(updated.replace('Z','+00:00')) < datetime.now(timezone.utc)-timedelta(days=180): raise DataError('unavailable')
    return result([dict(name=p['name'],position=p.get('position') or '',number=p.get('shirtNumber')) for p in data['squad'] if p.get('name')], 'Jogadores vinculados à equipe segundo o provedor; disponibilidade depende do plano. Sem estatísticas individuais.',partial=True)
