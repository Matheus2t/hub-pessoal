"""Public crest origins only; never proxy arbitrary URLs or use provider credentials."""
from urllib.parse import urlparse

NBA_IDS = dict(zip('ATL BOS CLE NOP CHI DAL DEN GSW HOU LAC LAL MIA MIL MIN BKN NYK ORL IND PHI PHX POR SAC SAS OKC TOR UTA MEM WAS DET CHA'.split(),[1610612737,1610612738,1610612739,1610612740,1610612741,1610612742,1610612743,1610612744,1610612745,1610612746,1610612747,1610612748,1610612749,1610612750,1610612751,1610612752,1610612753,1610612754,1610612755,1610612756,1610612757,1610612758,1610612759,1610612760,1610612761,1610612762,1610612763,1610612764,1610612765,1610612766]))

def crest(value):
    if not isinstance(value,str): return None
    try:
        parsed=urlparse(value)
        if parsed.scheme=='https' and parsed.hostname in ('crests.football-data.org','cdn.nba.com') and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment and parsed.port in (None,443): return value
    except ValueError:
        return None
    return None

def nba_crest(team):
    ident=NBA_IDS.get(team.get('abbreviation',''))
    return f'https://cdn.nba.com/logos/nba/{ident}/primary/L/logo.svg' if ident else None

def football_lineup(side):
    """Only use complete provider lineups whose stated formation matches positions."""
    if not isinstance(side,dict): return None
    players=side.get('lineup')
    formation=side.get('formation','')
    if not isinstance(players,list) or len(players)!=11 or not isinstance(formation,str): return None
    try: sizes=[1]+[int(n) for n in formation.split('-')]
    except ValueError: return None
    if len(sizes)!=4 or sum(sizes)!=11 or any(n<1 or n>5 for n in sizes): return None
    rows=[[],[],[],[]]
    for player in players:
        if not isinstance(player,dict): return None
        position=player.get('position','')
        if not isinstance(position,str): return None
        lower=position.lower()
        index=0 if lower=='goalkeeper' else 1 if 'back' in lower else 2 if 'midfield' in lower else 3 if 'winger' in lower or 'forward' in lower else -1
        if index<0 or not player.get('name'): return None
        rows[index].append(dict(name=player['name'],number=player.get('shirtNumber'),position=position))
    if [len(row) for row in rows]!=sizes:return None
    return dict(sport='football',formation=formation,rows=rows,confirmed=True)
