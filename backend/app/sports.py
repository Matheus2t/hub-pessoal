"""Public sports data. No database, credentials, scraping or artwork redistribution."""
from datetime import datetime, timezone
from .sports_provider import SportsDB, ProviderError
from .sports_schemas import SportsSection
from .config import settings

from fastapi import APIRouter, HTTPException, Response

router = APIRouter(prefix='/api/sports', tags=['sports'])
TEAMS = {
    '76ers': dict(id='134863', name='Philadelphia 76ers', league='4387', competition='NBA', official='https://www.nba.com/sixers/'),
    'spfc': dict(id='134291', name='São Paulo Futebol Clube', league='4351', competition='Brasileirão Série A', official='https://www.saopaulofc.net/'),
    'barcelona': dict(id='133739', name='FC Barcelona', league='4335', competition='La Liga', official='https://www.fcbarcelona.com/en/football/first-team'),
}
SOURCE = 'https://www.thesportsdb.com/'


def season(team, now=None):
    now = now or datetime.now(timezone.utc)
    if team == 'spfc':
        return str(now.year)
    start = now.year if now.month >= (10 if team == '76ers' else 7) else now.year - 1
    return f'{start}-{start + 1}'


provider = SportsDB()


def text(value):
    return str(value or '').strip()[:180]


def integer(value):
    try:
        return int(value) if value is not None and value != '' else None
    except (ValueError, TypeError, OverflowError):
        return None


def timestamp(row):
    raw = row.get('strTimestamp')
    if not raw and row.get('dateEvent') and row.get('strTime'):
        raw = str(row['dateEvent']) + 'T' + str(row['strTime'])
    if not isinstance(raw, str) or not raw or 'T' not in raw:
        return None
    try:
        value = datetime.fromisoformat(raw.replace('Z', '+00:00'))
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def games(rows, team_id, future, now=None):
    now = now or datetime.now(timezone.utc)
    found = {}
    for row in rows or []:
        if not isinstance(row, dict) or team_id not in (row.get('idHomeTeam'), row.get('idAwayTeam')):
            continue
        when = timestamp(row)
        if not text(row.get('strHomeTeam')) or not text(row.get('strAwayTeam')):
            continue
        status = text(row.get('strStatus')).upper()
        hs, aws = integer(row.get('intHomeScore')), integer(row.get('intAwayScore'))
        finished = status in ('MATCH FINISHED', 'FT', 'AET', 'AP', 'AFTER EXTRA TIME', 'AFTER PENALTIES')
        if future:
            if not when or when <= now or finished or hs is not None or aws is not None or status not in ('NS', 'NOT STARTED', 'SCHEDULED', '') or text(row.get('strPostponed')).lower() == 'yes':
                continue
        elif not when or when > now or not finished or hs is None or aws is None:
            continue
        home = row.get('idHomeTeam') == team_id
        own, other = (hs, aws) if home else (aws, hs)
        outcome = None if future else ('V' if own > other else 'D' if own < other else 'E')
        if not future and own == other and (status in ('AP', 'AFTER PENALTIES') or row.get('strSport') == 'Basketball'):
            outcome = None  # No shootout winner or basketball tie is inferred.
        item = dict(id=text(row.get('idEvent')), starts_at=when.isoformat(), home=text(row.get('strHomeTeam')), away=text(row.get('strAwayTeam')), competition=text(row.get('strLeague')), season=text(row.get('strSeason')), venue=text(row.get('strVenue')), is_home=home, status='Agendado' if future else 'Encerrado', home_score=hs, away_score=aws, outcome=outcome)
        found[item['id'] or (item['starts_at'] + item['home'] + item['away'])] = item
    return sorted(found.values(), key=lambda x: x['starts_at'], reverse=not future)[:10 if future else 5]


def section(state, items=None, note='', **extra):
    return dict(state=state, items=items or [], note=note, updated_at=datetime.now(timezone.utc).isoformat(), source=SOURCE, **extra)


def load_section(team, kind, competition=None):
    key = settings.balldontlie_api_key if team == '76ers' else settings.football_data_api_key
    if key:
        from .sports_http import DataError
        from . import sports_nba, sports_football
        source = 'https://www.balldontlie.io/' if team == '76ers' else 'https://www.football-data.org/'
        try:
            result = sports_nba.load(team,kind,key) if team == '76ers' else sports_football.load(team,kind,key,competition) if competition else sports_football.load(team,kind,key)
            return SportsSection.model_validate(result).model_dump()
        except DataError as exc:
            return dict(section(exc.state,note='Acesso não autorizado ou recurso não coberto.' if exc.state == 'unavailable' else 'Limite de consultas atingido.' if exc.state == 'rate_limited' else 'Não foi possível consultar a fonte agora.'),source=source)
        except (KeyError,TypeError,ValueError,AttributeError):
            return dict(section('error',note='Formato inesperado da fonte esportiva.'),source=source)
    if competition:
        return section('unavailable',note='Competição adicional exige nova credencial football-data.org configurada.')
    config = TEAMS[team]
    current = season(team)
    if kind == 'statistics':
        if team == '76ers':
            return section('unavailable', note='Estatísticas da temporada NBA não são cobertas por esta integração.')
        table = load_section(team, 'standings')
        if table['state'] in ('error', 'rate_limited'):
            return table
        row = next((row for row in table['items'] if row['is_team']), None)
        if row is None:
            return section('unavailable', note='O time não aparece na tabela retornada pela fonte; estatísticas não podem ser confirmadas.')
        labels = {'played': 'Jogos', 'points': 'Pontos', 'wins': 'Vitórias', 'draws': 'Empates', 'losses': 'Derrotas', 'goals_for': 'Gols marcados', 'goals_against': 'Gols sofridos', 'goal_difference': 'Saldo de gols'}
        items = [dict(label=label, value=row[key]) for key, label in labels.items() if row.get(key) is not None]
        return section('available' if items else 'unavailable', items, 'Indicadores da classificação principal. Estatísticas individuais dos jogadores não estão cobertas.', competition=table['competition'], season=table['season'], partial=True)
    if kind == 'roster':
        return section('unavailable', note='A fonte gratuita não confirma o elenco da temporada atual. Consulte o clube para evitar exibir vínculos antigos.')
    if kind == 'standings' and team == '76ers':
        return section('unavailable', note='Classificação da NBA não está disponível nesta fonte gratuita.')
    try:
        if kind in ('schedule', 'results'):
            data = provider.get('eventsnext.php' if kind == 'schedule' else 'eventslast.php', id=config['id'])
            field = 'events' if kind == 'schedule' else 'results'
            if field not in data or (data[field] is not None and not isinstance(data[field], list)):
                raise ProviderError()
            items = games(data.get(field), config['id'], kind == 'schedule')
            note = 'Cobertura parcial: a API gratuita retorna até 1 partida. Outras competições podem não estar incluídas.' if not settings.sportsdb_api_key else 'Calendário retornado pela fonte. Outras competições e partidas ainda não anunciadas podem não estar incluídas.'
            return section('available' if items else 'empty', items, note, partial=True)
        if kind == 'standings':
            data = provider.get('lookuptable.php', l=config['league'], s=current)
            if 'table' not in data or (data['table'] is not None and not isinstance(data['table'], list)):
                raise ProviderError()
            items = []
            for row in data.get('table') or []:
                if not isinstance(row, dict) or row.get('strSeason') != current:
                    continue
                items.append(dict(team=text(row.get('strTeam')), is_team=row.get('idTeam') == config['id'], rank=integer(row.get('intRank')), points=integer(row.get('intPoints')), played=integer(row.get('intPlayed')), wins=integer(row.get('intWin')), draws=integer(row.get('intDraw')), losses=integer(row.get('intLoss')), goal_difference=integer(row.get('intGoalDifference')), goals_for=integer(row.get('intGoalsFor')), goals_against=integer(row.get('intGoalsAgainst'))))
            items.sort(key=lambda x: x['rank'] if x['rank'] is not None else 9999)
            note = 'Tabela parcial: até 5 equipes. Copas e outras competições não estão cobertas.' if not settings.sportsdb_api_key else 'Tabela da competição principal retornada pela fonte. Copas e outras competições não estão cobertas.'
            return section('available' if items else 'empty', items, note, competition=config['competition'], season=current, partial=True)
    except ProviderError as exc:
        return section(exc.state, note='Limite de consultas atingido. Tente novamente mais tarde.' if exc.state == 'rate_limited' else 'Não foi possível consultar a fonte agora.')


@router.get('/{team}/{kind}', response_model=SportsSection)
def sports_section(team: str, kind: str, response: Response, competition: str|None=None):
    if team not in TEAMS or kind not in ('schedule', 'results', 'standings', 'roster', 'statistics'):
        raise HTTPException(404, 'Seção não encontrada.')
    if competition is not None and (competition != 'CL' or team != 'barcelona' or kind != 'standings'):
        raise HTTPException(422,'Competição não suportada nesta seção.')
    result = load_section(team, kind, competition)
    response.headers['Cache-Control'] = 'public, max-age=60, s-maxage=300' if result['state'] in ('available', 'empty', 'unavailable') else 'no-store'
    return result


@router.get('/{team}')
def sports_team(team: str):
    if team not in TEAMS:
        raise HTTPException(404, 'Time não encontrado.')
    config = TEAMS[team]
    key = settings.balldontlie_api_key if team == '76ers' else settings.football_data_api_key
    provider_name, source = ('BALLDONTLIE','https://www.balldontlie.io/') if key and team == '76ers' else ('football-data.org','https://www.football-data.org/') if key else ('TheSportsDB',SOURCE)
    return dict(team=team, name=config['name'], competition=config['competition'], season=season(team), official=config['official'], timezone='America/Sao_Paulo', provider=provider_name, source=source)
