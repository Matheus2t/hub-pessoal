import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { loadUtilityCapabilities, resolveUtilityLink, UtilityApiError } from "./api";
import { frontendUtilityAccess } from "./flags";
import type { CapabilitiesResult, LinkResolveResponse } from "./types";

const CLIENT_TIMEOUT_MS = 14_000;

@customElement("utility-link-unshortener")
export class UtilityLinkUnshortener extends LightElement {
  @state() private capabilities: CapabilitiesResult = { state: "unavailable" };
  @state() private checkingCapabilities = true;
  @state() private inputValue = "";
  @state() private validationMessage = "";
  @state() private requestMessage = "";
  @state() private result: LinkResolveResponse | null = null;
  @state() private loading = false;
  @state() private copyMessage = "";

  private capabilitiesController?: AbortController;
  private requestController?: AbortController;
  private requestSequence = 0;
  private timeoutHandle?: number;

  connectedCallback() {
    super.connectedCallback();
    if (!frontendUtilityAccess().linkResolver) {
      this.checkingCapabilities = false;
      this.capabilities = { state: "disabled" };
      return;
    }
    this.capabilitiesController = new AbortController();
    void loadUtilityCapabilities(this.capabilitiesController.signal).then(result => {
      if (!this.isConnected) return;
      this.capabilities = result;
      this.checkingCapabilities = false;
    });
  }

  disconnectedCallback() {
    this.requestSequence++;
    this.capabilitiesController?.abort();
    this.requestController?.abort();
    if (this.timeoutHandle !== undefined) window.clearTimeout(this.timeoutHandle);
    super.disconnectedCallback();
  }

  private get serviceReady(): boolean {
    return frontendUtilityAccess().linkResolver &&
      this.capabilities.state === "enabled" &&
      this.capabilities.capabilities.utilities_enabled &&
      this.capabilities.capabilities.link_resolver_enabled;
  }

  private get serviceMessage(): string {
    if (!frontendUtilityAccess().linkResolver) return "Prévia disponível somente no ambiente local autorizado.";
    if (this.checkingCapabilities) return "Verificando o backend local…";
    if (this.capabilities.state === "unavailable") return "Backend local indisponível. Inicie a API para analisar links.";
    if (this.capabilities.state === "disabled") return "O serviço de Utilitários está desativado neste backend.";
    if (!this.capabilities.capabilities.utilities_enabled || !this.capabilities.capabilities.link_resolver_enabled) {
      return "O Desencurtador está desativado neste backend local.";
    }
    return "A análise consulta o destino sem abrir o site. Os endereços não são salvos.";
  }

  private onInput(event: Event) {
    this.inputValue = (event.currentTarget as HTMLInputElement).value;
    this.validationMessage = "";
    this.requestMessage = "";
    this.copyMessage = "";
    this.result = null;
  }

  private validateInput(): string | null {
    const value = this.inputValue.trim();
    if (!value) return "Informe um endereço para analisar.";
    if (value.length > 2048) return "O endereço deve ter no máximo 2.048 caracteres.";
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return "Informe a URL completa, incluindo http:// ou https://.";
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Use um endereço que comece com http:// ou https://.";
    }
    if (!parsed.hostname || parsed.username || parsed.password) {
      return "Informe um endereço válido, sem usuário ou senha.";
    }
    return null;
  }

  private async onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (this.loading) return;
    this.validationMessage = "";
    this.requestMessage = "";
    this.copyMessage = "";
    this.result = null;

    if (!this.serviceReady) {
      this.requestMessage = this.serviceMessage;
      return;
    }

    const validation = this.validateInput();
    if (validation) {
      this.validationMessage = validation;
      await this.updateComplete;
      this.querySelector<HTMLInputElement>("#link-address")?.focus();
      return;
    }

    const sequence = ++this.requestSequence;
    const controller = new AbortController();
    let timedOut = false;
    let focusResult = false;
    this.requestController = controller;
    this.loading = true;
    this.requestMessage = "Analisando o endereço…";
    this.timeoutHandle = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      this.result = await resolveUtilityLink(this.inputValue.trim(), controller.signal);
      if (!this.isCurrentRequest(sequence)) return;
      this.requestMessage = "";
      focusResult = true;
    } catch (error) {
      if (!this.isCurrentRequest(sequence)) return;
      if (controller.signal.aborted) {
        this.requestMessage = timedOut
          ? "A consulta excedeu o tempo limite. Tente novamente."
          : "Análise cancelada.";
      } else if (error instanceof UtilityApiError) {
        this.requestMessage = error.kind === "disabled"
          ? "O serviço de análise está desativado neste ambiente."
          : error.kind === "invalid_response"
            ? "O backend retornou uma resposta inválida. Tente novamente."
            : "Não foi possível concluir a consulta ao backend local. Tente novamente.";
      } else {
        this.requestMessage = "Não foi possível conectar ao backend local. Tente novamente.";
      }
      focusResult = true;
    } finally {
      if (this.timeoutHandle !== undefined) window.clearTimeout(this.timeoutHandle);
      if (this.isCurrentRequest(sequence)) {
        this.loading = false;
        this.requestController = undefined;
        if (focusResult) this.focusResult(sequence);
      }
    }
  }

  private isCurrentRequest(sequence: number): boolean {
    return this.isConnected && this.requestSequence === sequence;
  }

  private cancelRequest() {
    if (!this.loading) return;
    this.requestSequence++;
    this.requestController?.abort();
    this.requestController = undefined;
    if (this.timeoutHandle !== undefined) window.clearTimeout(this.timeoutHandle);
    this.timeoutHandle = undefined;
    this.loading = false;
    this.requestMessage = "Análise cancelada.";
  }

  private focusResult(sequence: number) {
    void this.updateComplete.then(() => {
      if (this.isCurrentRequest(sequence)) this.querySelector<HTMLElement>("#link-result-heading")?.focus();
    });
  }

  private async copyFinalAddress() {
    const value = this.confirmedFinalUrl;
    if (!value) return;
    this.copyMessage = "";
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
    } catch {
      if (!this.copyWithFallback(value)) {
        this.copyMessage = "Não foi possível copiar. Selecione e copie o endereço manualmente.";
        return;
      }
    }
    this.copyMessage = "Endereço copiado.";
  }

  private copyWithFallback(value: string): boolean {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.setAttribute("aria-hidden", "true");
    field.style.position = "fixed";
    field.style.opacity = "0";
    field.style.pointerEvents = "none";
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { copied = false; }
    field.remove();
    this.querySelector<HTMLButtonElement>("#copy-final-address")?.focus();
    return copied;
  }

  private get confirmedFinalUrl(): string | null {
    return this.result?.status === "resolved" ? this.result.final_url : null;
  }

  private finalDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return "Destino identificado"; }
  }

  private resultMessage(result: LinkResolveResponse): string {
    if (result.status !== "resolved") return this.statusMessage(result.status);
    if (result.final_status_code !== null && result.final_status_code >= 400) {
      return `Destino identificado, mas o servidor respondeu com HTTP ${result.final_status_code}.`;
    }
    return result.redirect_count === 0
      ? "Este endereço não apresentou redirecionamentos HTTP."
      : `Destino encontrado após ${result.redirect_count} ${result.redirect_count === 1 ? "redirecionamento" : "redirecionamentos"}.`;
  }

  private statusMessage(status: LinkResolveResponse["status"]): string {
    const messages: Record<LinkResolveResponse["status"], string> = {
      resolved: "Destino encontrado.",
      invalid_url: "O endereço informado é inválido. Confira o formato e tente novamente.",
      blocked_url: "Este endereço foi bloqueado pela política de segurança. O destino não foi confirmado.",
      timeout: "A consulta excedeu o tempo limite. O destino não foi confirmado.",
      redirect_loop: "Foi detectado um ciclo de redirecionamentos. O destino final não foi confirmado.",
      redirect_limit: "A sequência ultrapassou o limite de redirecionamentos. O destino final não foi confirmado.",
      tls_error: "Não foi possível validar o certificado ou negociar a conexão TLS. O destino não foi confirmado.",
      unresolved: "Não foi possível confirmar o destino final. Confira o link e tente novamente.",
      service_unavailable: "O serviço de análise está indisponível. Tente novamente mais tarde.",
    };
    return messages[status];
  }

  private displayWarning(warning: string): string {
    const normalized = warning.toLocaleLowerCase("pt-BR");
    if (normalized.includes("sem criptografia")) return "A cadeia passou por uma conexão HTTP sem criptografia.";
    if (normalized.includes("domínio mudou")) return "O endereço redirecionou para outro domínio.";
    return "A análise encontrou um aviso sobre a conexão.";
  }

  private renderPath(result: LinkResolveResponse) {
    if (!result.redirects.length) return nothing;
    const nodes = [result.original_url];
    for (const hop of result.redirects.slice(1)) {
      if (nodes[nodes.length - 1] !== hop.url) nodes.push(hop.url);
    }
    const isResolved = result.status === "resolved" && result.final_url !== null;
    if (isResolved && result.final_url && nodes[nodes.length - 1] !== result.final_url) nodes.push(result.final_url);

    return html`<details class="link-path">
      <summary>Caminho do link <span class="link-path-count">${result.redirect_count} ${result.redirect_count === 1 ? "salto" : "saltos"}</span></summary>
      <ol class="link-path-list">
        ${nodes.map((url, index) => html`<li class="link-path-node">
          <span class="link-path-label">${index === 0 ? "Link original" : isResolved && index === nodes.length - 1 ? "Destino final" : `Endereço ${index + 1}`}</span>
          <span class="link-path-url" dir="ltr">${url}</span>
          ${index < result.redirects.length ? html`<span class="link-path-transition"><span aria-hidden="true">↓</span><span>HTTP ${result.redirects[index].status_code}</span></span>` : nothing}
        </li>`)}
        ${!isResolved ? html`<li class="link-path-unconfirmed" aria-label="Destino final não confirmado">Destino final não confirmado</li>` : nothing}
      </ol>
    </details>`;
  }

  private renderResult() {
    const result = this.result;
    if (!result) return nothing;
    const resolved = result.status === "resolved" && result.final_url !== null;
    const finalUrl = resolved ? result.final_url : null;
    const warnings = result.security.warnings;
    const statusTone = resolved ? "confirmed" : "partial";
    return html`<section class="link-result link-result--${statusTone}" aria-labelledby="link-result-heading">
      <div class="link-result-main">
        <div class="link-result-copy">
          <p class="utilities-eyebrow">${resolved ? "DESTINO IDENTIFICADO" : "RESOLUÇÃO PARCIAL"}</p>
          <h2 id="link-result-heading" tabindex="-1">${resolved ? this.finalDomain(finalUrl!) : "Destino final não confirmado"}</h2>
          ${resolved ? html`<p class="link-result-url" dir="ltr">${finalUrl}</p>` : nothing}
          <p class="link-result-message">${this.resultMessage(result)}</p>
        </div>
        ${resolved ? html`<button id="copy-final-address" class="button link-copy-button" type="button" @click=${this.copyFinalAddress}>
          <span aria-hidden="true">⧉</span> Copiar endereço
        </button>` : nothing}
      </div>

      ${resolved ? html`<dl class="link-result-meta">
        <div><dt>Protocolo</dt><dd>${result.security.https ? "HTTPS" : "HTTP"}</dd></div>
        <div><dt>Redirecionamentos</dt><dd>${result.redirect_count}</dd></div>
        ${result.final_status_code !== null ? html`<div><dt>Resposta HTTP</dt><dd>${result.final_status_code}</dd></div>` : nothing}
      </dl>` : nothing}

      ${warnings.length ? html`<ul class="link-warnings" aria-label="Avisos da análise">
        ${warnings.map(warning => html`<li>${this.displayWarning(warning)}</li>`)}
      </ul>` : nothing}
      <p class="link-reputation-note">${result.security.reputation_checked
        ? "A análise de redirecionamentos não substitui a avaliação do conteúdo do site."
        : "A ferramenta identifica redirecionamentos, mas não verifica se o site é confiável."}</p>
      ${this.renderPath(result)}
      <p class="link-copy-feedback" role="status" aria-live="polite">${this.copyMessage}</p>
    </section>`;
  }

  render() {
    const serviceReady = this.serviceReady;
    const disabled = !serviceReady || this.loading;
    return html`<section class="utilities-page utility-link-page" aria-labelledby="utility-link-title">
      <header class="utilities-heading">
        <p class="utilities-eyebrow"><a href="#/utilitarios">Utilitários</a> / PRÉVIA LOCAL</p>
        <h1 id="utility-link-title">Desencurtador de Links</h1>
        <p>Descubra o destino de links encurtados antes de acessá-los.</p>
      </header>

      <section class="link-resolver-panel" aria-label="Analisar endereço">
        <form class="link-resolver-form" novalidate @submit=${this.onSubmit}>
          <label class="utility-input link-address-field" for="link-address">
            <span>Endereço</span>
            <input id="link-address" type="url" inputmode="url" autocomplete="url" spellcheck="false"
              placeholder="https://exemplo.com/abc" .value=${this.inputValue} ?disabled=${disabled}
              aria-describedby="link-address-help${this.validationMessage ? " link-address-error" : ""}"
              aria-invalid=${this.validationMessage ? "true" : "false"} @input=${this.onInput} />
          </label>
          <button class="button utility-submit" type="submit" ?disabled=${disabled}>
            ${this.loading ? html`<span class="link-progress-mark" aria-hidden="true"></span>Analisando…` : "Analisar endereço"}
          </button>
          ${this.loading ? html`<button class="button link-cancel-button" type="button" @click=${this.cancelRequest}>Cancelar</button>` : nothing}
          <span id="link-address-help" class="link-input-help">Aceita endereços HTTP e HTTPS. O destino não será aberto automaticamente.</span>
        </form>
        ${this.validationMessage ? html`<p id="link-address-error" class="link-validation-error" role="alert">${this.validationMessage}</p>` : nothing}
        <p class="link-service-status" role="status" aria-live="polite">${this.loading ? "Analisando o endereço…" : this.requestMessage || this.serviceMessage}</p>
      </section>
      ${this.renderResult()}
    </section>`;
  }
}
