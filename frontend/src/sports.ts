export const teams = {
  '76ers': { name: 'Philadelphia 76ers', crest: '/teams/76ers.svg', competition: 'NBA', official: 'https://www.nba.com/sixers/' },
  spfc: { name: 'São Paulo Futebol Clube', crest: '/teams/spfc.png', competition: 'Brasileirão Série A', official: 'https://www.saopaulofc.net/' },
  barcelona: { name: 'FC Barcelona', crest: '/teams/barcelona.png', competition: 'La Liga', official: 'https://www.fcbarcelona.com/en/football/first-team' },
} as const;
export type Team = keyof typeof teams;
export type SectionName = 'schedule' | 'results' | 'standings' | 'roster' | 'statistics';
export interface Game { id: string; starts_at: string; home: string; away: string; competition: string; season: string; venue: string; is_home: boolean; status: string; home_score: number | null; away_score: number | null; outcome: string | null }
export interface Standing { team: string; is_team: boolean; rank: number | null; points: number | null; played: number | null; wins: number | null; draws: number | null; losses: number | null; goal_difference: number | null }
export interface Player { name: string; position: string; number: number | null }
export interface Metric { label: string; value: number }
export interface SportsSection { state: 'available' | 'empty' | 'error' | 'unavailable' | 'rate_limited'; items: (Game | Standing | Player | Metric)[]; note: string; updated_at: string; competition?: string; season?: string; partial?: boolean }
export const sportsDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
export const sportsTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const sportsDay = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short' }).format(new Date(value)).replace(' de ', ' ');
