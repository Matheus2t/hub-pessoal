import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { apiUrl } from '../config';
import { teams, sportsTime, sportsDate, type Team, type SectionName, type SportsSection, type Game, type Standing, type Player, type Metric } from '../sports';
import './sports-games';
import './sports-standings';

const titles: Record<SectionName, string> = { schedule: 'Próximos jogos', standings: 'Classificação', roster: 'Elenco', results: 'Últimos resultados', statistics: 'Estatísticas da temporada' };
@customElement('team-page')
export class TeamPage extends LightElement {
  @property() team: Team = '76ers';
  @state() private sections: Partial<Record<SectionName, SportsSection>> = {};
  @state() private season = '';
  private controller = new AbortController();
  connectedCallback() { super.connectedCallback(); void this.load(); }
  disconnectedCallback() { this.controller.abort(); super.disconnectedCallback(); }
  private async fetch(path: string) {
    const response = await fetch(apiUrl(path), { signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(25000)]) });
    if (!response.ok) throw new Error('sports');
    return response.json();
  }
  private async load() {
    void this.fetch(`/api/sports/${this.team}`).then(meta => { this.season = meta.season; }).catch(() => { /* Sections remain independently usable. */ });
    await Promise.all((Object.keys(titles) as SectionName[]).map(async kind => {
      try { const data: SportsSection = await this.fetch(`/api/sports/${this.team}/${kind}`); this.sections = { ...this.sections, [kind]: data }; }
      catch { if (!this.controller.signal.aborted) this.sections = { ...this.sections, [kind]: { state: 'error', items: [], note: 'Não foi possível consultar a fonte agora.', updated_at: '' } }; }
    }));
  }
  private section(kind: SectionName) {
    const data = this.sections[kind];
    return html`<section class="sports-panel sports-${kind}" aria-labelledby=${`sports-${kind}`} aria-busy=${!data}><header><h2 id=${`sports-${kind}`}>${titles[kind]}</h2>${data?.state === 'available' ? html`<span class="sports-count">${data.items.length}${data.partial ? ' · parcial' : ''}</span>` : nothing}</header>
      ${!data ? html`<p role="status" class="sports-notice">Carregando…</p>` : html`
        ${data.state === 'available' && data.items.length ? this.content(kind, data) : html`<p class="sports-notice" role="status">${data.state === 'empty' ? 'Nenhum registro confirmado nesta consulta.' : data.note}</p>`}
        ${data.state === 'available' ? html`<p class="sports-note">${data.note}</p>` : nothing}
        ${['error', 'rate_limited'].includes(data.state) ? html`<button class="button secondary" @click=${() => this.load()}>Tentar novamente</button>` : nothing}
        <div class="sports-source"><a href=${teams[this.team].official} target="_blank" rel="noopener noreferrer">Site oficial ↗</a>${data.updated_at ? html`<span>Consulta: ${sportsDate(data.updated_at)} · ${sportsTime(data.updated_at)}</span>` : nothing}</div>
      `}</section>`;
  }
  private content(kind: SectionName, data: SportsSection) {
    if (kind === 'schedule' || kind === 'results') return html`<sports-games .games=${data.items as Game[]} .results=${kind === 'results'}></sports-games>`;
    if (kind === 'standings') return html`<sports-standings .rows=${data.items as Standing[]} .competition=${data.competition || ''} .season=${data.season || ''}></sports-standings>`;
    if (kind === 'roster') return html`<ul class="sports-players">${(data.items as Player[]).map(player => html`<li><span class="sports-number">${player.number ?? '—'}</span><div><strong>${player.name}</strong><span>${player.position || 'Posição não informada'}</span></div></li>`)}</ul>`;
    if (kind === 'statistics') return html`<p class="sports-note">${data.competition} · ${data.season}</p><dl class="sports-metrics">${(data.items as Metric[]).map(metric => html`<div><dt>${metric.label}</dt><dd>${metric.value.toLocaleString('pt-BR')}</dd></div>`)}</dl>`;
    return nothing;
  }
  render() {
    const config = teams[this.team];
    const next = this.sections.schedule?.items[0] as Game | undefined;
    const standing = (this.sections.standings?.items as Standing[] | undefined)?.find(row => row.is_team);
    return html`<article class="sports-page"><header class="sports-heading"><div class="sports-identity"><img class="sports-crest" src=${config.crest} width="58" height="64" alt="" /><div><p class="sports-eyebrow">${config.competition}${this.season ? ` · ${this.season}` : ''}</p><h1>${config.name}</h1></div></div>${standing ? html`<div class="sports-record"><strong>${standing.rank}º</strong><span>${standing.points} pontos · ${standing.played} jogos</span></div>` : nothing}</header>
      ${next ? html`<section class="sports-next" aria-label="Próxima partida"><div><p class="sports-eyebrow">Próxima partida na fonte consultada</p><h2>${next.home} <span>×</span> ${next.away}</h2><p>${next.competition} · ${next.status} · ${next.is_home ? 'Casa' : 'Fora'}${next.venue ? ` · ${next.venue}` : ''}</p></div><div class="sports-kickoff"><strong>${sportsTime(next.starts_at)}</strong><time datetime=${next.starts_at}>${sportsDate(next.starts_at)}</time><span>Horário de Brasília</span></div></section>` : nothing}
      <div class="sports-grid"><div class="sports-column">${this.section('schedule')}${this.section('results')}</div><div class="sports-column">${this.section('standings')}${this.section('roster')}${this.section('statistics')}</div></div>
      <p class="sports-attribution">Dados: <a href="https://www.thesportsdb.com/" target="_blank" rel="noopener noreferrer">TheSportsDB</a>. Cobertura gratuita parcial; não representa o calendário completo. Horários de Brasília. Sem vínculo oficial com os clubes.</p>
    </article>`;
  }
}
