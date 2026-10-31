from app.sports_assets import crest, football_lineup, nba_crest

def test_public_asset_allowlist():
    assert crest('https://crests.football-data.org/81.svg')
    for value in ('https://evil.example/crest.svg','http://crests.football-data.org/81.svg','https://secret@crests.football-data.org/81.svg','https://crests.football-data.org/81.svg?key=secret'):
        assert crest(value) is None
    assert '1610612766' in nba_crest({'abbreviation':'CHA'})
    assert nba_crest({'abbreviation':'UNKNOWN'}) is None
    assert crest('https://crests.football-data.org:bad/81.svg') is None

def test_lineup_requires_complete_positions_and_formation():
    rows=[{'name':f'Player {i}','position':position,'shirtNumber':i} for i,position in enumerate(['Goalkeeper']+['Centre-Back']*4+['Central Midfield']*3+['Centre-Forward']*3)]
    assert football_lineup({'formation':'4-3-3','lineup':rows})['confirmed']
    assert football_lineup({'formation':'4-3-3','lineup':rows[:10]}) is None
    assert football_lineup({'formation':'4-4-2','lineup':rows}) is None
    assert football_lineup({'squad':rows}) is None
    assert football_lineup({'formation':'4-3-3','lineup':[None]*11}) is None
    assert football_lineup({'formation':'4-3-3','lineup':[{**p,'position':None} for p in rows]}) is None
