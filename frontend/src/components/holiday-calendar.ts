import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";

type HolidayScope = "Nacional" | "Estadual" | "Municipal";
interface Holiday {
  day: number;
  month: number;
  name: string;
  scope: HolidayScope;
}

// Datas móveis de Páscoa, Paixão de Cristo e Corpus Christi.
function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

function moveDate(date: Date, days: number): Date {
  const moved = new Date(date);
  moved.setDate(moved.getDate() + days);
  return moved;
}

export function holidaysForYear(year: number): Holiday[] {
  const dates: Holiday[] = [
    { day: 1, month: 1, name: "Confraternização Universal", scope: "Nacional" },
    { day: 25, month: 1, name: "Aniversário de São Paulo", scope: "Municipal" },
    { day: 21, month: 4, name: "Tiradentes", scope: "Nacional" },
    { day: 1, month: 5, name: "Dia do Trabalho", scope: "Nacional" },
    { day: 9, month: 7, name: "Revolução Constitucionalista", scope: "Estadual" },
    { day: 7, month: 9, name: "Independência do Brasil", scope: "Nacional" },
    { day: 12, month: 10, name: "Nossa Senhora Aparecida", scope: "Nacional" },
    { day: 2, month: 11, name: "Finados", scope: "Nacional" },
    { day: 15, month: 11, name: "Proclamação da República", scope: "Nacional" },
    { day: 20, month: 11, name: "Consciência Negra", scope: "Nacional" },
    { day: 25, month: 12, name: "Natal", scope: "Nacional" },
  ];
  const sunday = easter(year);
  const friday = moveDate(sunday, -2);
  const corpus = moveDate(sunday, 60);
  return [...dates,
    { day: friday.getDate(), month: friday.getMonth() + 1, name: "Paixão de Cristo", scope: "Nacional" },
    { day: corpus.getDate(), month: corpus.getMonth() + 1, name: "Corpus Christi", scope: "Municipal" },
  ].sort((x, y) => x.month - y.month || x.day - y.day);
}

@customElement("holiday-calendar")
export class HolidayCalendar extends LightElement {
  @state() private year = new Date().getFullYear();
  @state() private month = new Date().getMonth();

  private shift(amount: number) {
    const date = new Date(this.year, this.month + amount, 1);
    this.year = date.getFullYear();
    this.month = date.getMonth();
  }

  private goToToday() {
    const today = new Date();
    this.year = today.getFullYear();
    this.month = today.getMonth();
  }

  render() {
    const start = new Date(this.year, this.month, 1);
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start);
    const title = label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
    const offset = (start.getDay() + 6) % 7;
    const days = new Date(this.year, this.month + 1, 0).getDate();
    const slots = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => i - offset + 1);
    const holidays = holidaysForYear(this.year).filter(h => h.month === this.month + 1);
    const byDay = new Map(holidays.map(h => [h.day, h]));
    const today = new Date();
    const current = this.year === today.getFullYear() && this.month === today.getMonth();

    return html`<section class="calendar-panel" aria-label="Calendário de feriados">
      <header class="calendar-top">
        <div><p class="calendar-kicker">CALENDÁRIO</p><h2>Feriados</h2><p class="calendar-location">Brasil · São Paulo, capital</p></div>
        <button class="calendar-today" type="button" @click=${this.goToToday}>Hoje</button>
      </header>
      <div class="calendar-navigation">
        <h3 aria-live="polite">${title}</h3>
        <div class="calendar-arrows">
          <button type="button" aria-label="Mês anterior" title="Mês anterior" @click=${() => this.shift(-1)}>‹</button>
          <button type="button" aria-label="Próximo mês" title="Próximo mês" @click=${() => this.shift(1)}>›</button>
        </div>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">
        ${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => html`<span>${day}</span>`)}
      </div>
      <div class="calendar-days" role="group" aria-label=${`Dias de ${title}`}>
        ${slots.map(day => {
          if (day < 1 || day > days) return html`<span class="calendar-blank" aria-hidden="true"></span>`;
          const holiday = byDay.get(day);
          const isToday = current && day === today.getDate();
          const iso = `${this.year}-${String(this.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          return html`<time datetime=${iso}
            class=${`calendar-day${holiday ? " is-holiday" : ""}${isToday ? " is-today" : ""}`}
            aria-label=${`${day} de ${title}${holiday ? ": " + holiday.name + " (" + holiday.scope + ")" : ""}`}
            title=${holiday ? `${holiday.name} · ${holiday.scope}` : ""}>${day}</time>`;
        })}
      </div>
      <div class="calendar-events">
        <h3>Feriados do mês <span>${holidays.length}</span></h3>
        ${holidays.length ? html`<ul>${holidays.map(h => html`<li>
          <span class="calendar-event-date">${String(h.day).padStart(2, "0")}/${String(h.month).padStart(2, "0")}</span>
          <span class="calendar-event-name">${h.name}</span>
          <small>${h.scope}</small>
        </li>`)}</ul>` : html`<p class="calendar-no-holidays">Nenhum feriado neste mês.</p>`}
        <p class="calendar-footnote">Feriados oficiais. Pontos facultativos não incluídos.</p>
        <a class="calendar-source" href="https://prefeitura.sp.gov.br/web/gestao/w/calendario_2026" target="_blank" rel="noopener noreferrer">Fonte: Prefeitura de São Paulo · calendário 2026 ↗</a>
      </div>
    </section>`;
  }
}
