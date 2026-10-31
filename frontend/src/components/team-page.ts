import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { apiUrl } from '../config';
import { teams, sportsTime, sportsDate, type Team, type SectionName, type SportsSection, type Game, type Standing, type Player, type Metric } from '../sports';
import './sports-games';
import './sports-standings';

const titles: Record<SectionName, string> = { schedule: 'Próximos jogos', standings: 'Classificação', roster: 'Elenco', results: 'Últimos resultados', statistics: 'Estatísticas da temporada' };
const unavailable: Record<SectionName, string> = {
  schedule: 'Calendário ainda não disponível.', results: 'Resultados ainda não disponíveis.',
  standings: 'Classificação não coberta pela fonte atual.', roster: 'Elenco atualizado ainda não disponível.', statistics: 'Estatísticas ainda não disponíveis.',
};

@customElement('team-page')
export class TeamPage extends LightElement {
  @property() team: Team = '76ers';
  @state() private sections: Partial<Record<SectionName, SportsSection>> = {};
  @state() private season = '';
  @state() private pending: SectionName[] = [];
  @state() private standingCompetition = '';
  private controller = new AbortController();
  connectedCallback() { super.connectedCallback(); void this.load(); }
  disconnectedCallback() { this.controller.abort(); super.disconnectedCallback(); }
  private async fetch(path: string) {
    const response = await fetch(apiUrl(path), { signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(25000)]) });
    if (!response.ok) throw new Error('sports');
    return response.json();
  }
  private async loadSection(kind: SectionName) {
    if (this.pending.includes(kind)) return;
    this.pending = [...this.pending, kind];
    try {
      const data: SportsSection = await this.fetch(`/api/sports/${this.team}/${kind}${kind === 'standings' && this.standingCompetition ? '?competition=CL' : ''}`);
      if (!this.controller.signal.aborted) this.sections = { ...this.sections, [kind]: data };
    } catch {
      if (!this.controller.signal.aborted) this.sections = { ...this.sections, [kind]: { state: 'error', items: [], note: 'Não foi possível consultar a fonte agora.', updated_at: '' } };
    } finally { this.pending = this.pending.filter(item => item !== kind); }
  }
  private async load() {
    void this.fetch(`/api/sports/${this.team}`).then(meta => { this.season = meta.season; }).catch(() => { /* Sections remain independently usable. */ });
    await Promise.all((Object.keys(titles) as SectionName[]).map(kind => this.loadSection(kind)));
  }
  private section(kind: SectionName) {
    const data = this.sections[kind];
    const available = data?.state === 'available' && data.items.length > 0;
    const error = data && ['error', 'rate_limited'].includes(data.state);
    const loading = !data || this.pending.includes(kind);
    return html`<section class="sports-panel sports-${kind} ${data && !available ? 'is-empty' : ''}" aria-labelledby=${`sports-${kind}`} aria-busy=${loading}>
      <header><h2 id=${`sports-${kind}`}>${titles[kind]}</h2>${available && kind === 'standings' && data.partial ? html`<span class="sports-count">Parcial</span>` : available && ['schedule', 'results'].includes(kind) && data.items.length > 1 ? html`<span class="sports-count">${data.items.length} jogos</span>` : nothing}</header>
      ${kind === 'standings' && this.team === 'barcelona' ? html`<label class="sports-competition">Competição <select aria-label="Competição da classificação" ?disabled=${loading} @change=${(event: Event) => { this.standingCompetition = (event.target as HTMLSelectElement).value; this.sections = { ...this.sections, standings: undefined }; void this.loadSection('standings'); }}><option value="" ?selected=${!this.standingCompetition}>La Liga</option><option value="CL" ?selected=${this.standingCompetition === 'CL'}>Champions League · consultar cobertura</option></select></label>` : nothing}
      ${!data ? html`<p role="status" class="sports-loading">Carregando…</p>` : available ? html`
        ${kind === 'results' ? html`<p class="sports-caption">Placar do time à esquerda.</p>` : nothing}${this.content(kind, data)}
      ` : html`<div class="sports-empty"><p role="status">${error ? (data.state === 'rate_limited' ? 'Limite de consultas atingido. Tente mais tarde.' : 'Não foi possível consultar a fonte agora.') : data.state === 'empty' ? (kind === 'schedule' ? 'Nenhuma partida confirmada na fonte.' : 'Nenhum registro confirmado na fonte.') : unavailable[kind]}</p>
        ${error ? html`<button class="sports-text-button" ?disabled=${loading} @click=${() => this.loadSection(kind)}>${loading ? 'Consultando…' : 'Tentar novamente'}</button>` : html`<a href=${teams[this.team].official} target="_blank" rel="noopener noreferrer">Consultar clube <span aria-hidden="true">↗</span></a>`}</div>`}
    </section>`;
  }
  private content(kind: SectionName, data: SportsSection) {
    if (kind === 'schedule' || kind === 'results') return html`<sports-games .games=${data.items as Game[]} .results=${kind === 'results'}></sports-games>`;
    if (kind === 'standings') return html`<sports-standings .rows=${data.items as Standing[]} .competition=${data.competition || ''} .season=${data.season || ''}></sports-standings>`;
    if (kind === 'roster') return html`${this.team === '76ers' ? html`<p class="sports-caption">Cadastro de jogadores; vínculo ativo não confirmado.</p>` : nothing}<ul class="sports-players">${(data.items as Player[]).map(player => html`<li><span class="sports-number">${player.number ?? '—'}</span><div><strong>${player.name}</strong><span>${player.position || 'Posição não informada'}</span>${player.height ? html`<span>Altura: ${player.height} (pés–polegadas)</span>` : nothing}</div></li>`)}</ul>`;
    if (kind === 'statistics') return html`<p class="sports-competition">${data.competition} <span>· ${data.season}</span></p><dl class="sports-metrics">${(data.items as Metric[]).map(metric => html`<div><dt>${metric.label}</dt><dd>${metric.value.toLocaleString('pt-BR')}</dd></div>`)}</dl>`;
    return nothing;
  }
  private fixture(next: Game | undefined) {
    return html`<section class="sports-next" aria-labelledby="next-match-heading"><div class="sports-next-label"><h2 id="next-match-heading">Próxima partida</h2><span>${next ? `${next.is_home ? 'Em casa' : 'Fora de casa'} · ${next.status}` : 'Calendário'}</span></div>
      ${next ? html`<div class="sports-next-body"><div class="sports-contender"><span>Mandante</span><strong>${next.home}</strong></div><div class="sports-kickoff"><time datetime=${next.starts_at}>${sportsTime(next.starts_at)}</time><div><span>${sportsDate(next.starts_at)}</span><small>Horário de Brasília</small></div></div><div class="sports-contender sports-away"><span>Visitante</span><strong>${next.away}</strong></div></div>
      <div class="sports-next-footer"><span>${next.competition}</span>${next.venue ? html`<span>${next.venue}</span>` : nothing}</div>` : html`<p class="sports-next-empty" role="status">${!this.sections.schedule ? 'Consultando calendário…' : this.sections.schedule.state === 'empty' ? 'Nenhuma partida confirmada na fonte.' : 'Próxima partida ainda não disponível.'}</p>`}
    </section>`;
  }
  private coverage() {
    const entries = (Object.keys(titles) as SectionName[]).filter(kind => this.sections[kind]);
    const latest = entries.map(kind => this.sections[kind]!.updated_at).filter(Boolean).sort().at(-1);
    return html`<details class="sports-coverage"><summary>Cobertura dos dados <span>Fonte parcial</span></summary><div><p>Horários de Brasília. Sem vínculo oficial com os clubes.</p><dl>${entries.map(kind => html`<div><dt>${titles[kind]}</dt><dd>${this.sections[kind]!.note || 'Sem observações.'} ${this.sections[kind]!.source ? html`<span>Fonte: ${this.sections[kind]!.source} · ${this.sections[kind]!.updated_at ? sportsDate(this.sections[kind]!.updated_at) + ' ' + sportsTime(this.sections[kind]!.updated_at) : 'sem atualização'}</span>` : nothing}</dd></div>`)}</dl>${latest ? html`<p>Última consulta: ${sportsDate(latest)} às ${sportsTime(latest)}. Os dados podem ter sido atualizados antes dessa consulta.</p>` : nothing}</div></details>`;
  }
  render() {
    const config = teams[this.team];
    const next = this.sections.schedule?.items[0] as Game | undefined;
    const standing = this.standingCompetition ? undefined : (this.sections.standings?.items as Standing[] | undefined)?.find(row => row.is_team);
    const season = this.season || this.sections.standings?.season || next?.season;
    return html`<article class="sports-page" data-team=${this.team}><header class="sports-heading"><div class="sports-identity"><span class="sports-crest-frame" data-team=${this.team}><img class="sports-crest" src=${config.crest} width="64" height="72" alt="" /></span><div><p class="sports-eyebrow">${config.competition}${season ? html`<span>${season}</span>` : nothing}</p><h1>${config.name}</h1></div></div>${standing ? html`<dl class="sports-record">${[['Posição', standing.rank == null ? '—' : `${standing.rank}º`], ['Pontos', standing.points ?? '—'], ['Jogos', standing.played ?? '—']].map(([label, value]) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`)}</dl>` : nothing}</header>
      ${this.fixture(next)}
      <div class="sports-grid"><div class="sports-column">${this.section('schedule')}${this.section('results')}${this.section('roster')}</div><div class="sports-column">${this.section('standings')}${this.section('statistics')}</div></div>
      ${this.coverage()}
    </article>`;
  }
}
