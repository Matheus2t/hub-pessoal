import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { obsidianMark } from "./obsidian-mark";
import { mindCloudEnabled, publicMindPdfUrl, restoreMindSession, signInMind, signOutMind } from "./cloud-auth";
import { deleteCloudMindItem, downloadCloudPdf, listCloudMindItems, saveCloudMindItem } from "./cloud-store";
import {
  checkedPdf, createMindBackup, deleteMindItem, displayFileSize,
  listMindItems, MAX_MIND_PDF_BYTES, normalizedTags, parseMindBackup, restoreMindBackup, saveMindItem,
  type MindItem,
} from "./store";

type Filter = "all" | "pdf" | "note" | "favorite";
@customElement("mind-page")
export class MindPage extends LightElement {
  @state() private items: MindItem[] = [];
  @state() private ready = false;
  @state() private busy = false;
  @state() private notice = "";
  @state() private error = "";
  @state() private query = "";
  @state() private filter: Filter = "all";
  @state() private topic = "all";
  @state() private selectedId: string | null = null;
  @state() private draft: MindItem | null = null;
  @state() private editing = false;
  private active = false;
  @state() private authenticated = false;
  @state() private checkingSession = false;
  @state() private loginVisible = false;
  @state() private authBusy = false;
  @state() private loginEmail = "";
  @state() private loginPassword = "";
  @state() private pdfInlineId: string | null = null;
  @state() private pendingAdminAction: "note" | "pdf" | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.active = true;
    void this.reload();
    if (mindCloudEnabled()) void this.restoreCloudSession();
  }

  private async restoreCloudSession() {
    this.checkingSession = true;
    const allowed = await restoreMindSession();
    if (!this.active) return;
    this.checkingSession = false;
    this.authenticated = allowed;
    if (allowed) await this.reload();
  }

  private async login(event: Event) {
    event.preventDefault();
    if (this.authBusy) return;
    this.authBusy = true; this.clearMessages();
    try {
      await signInMind(this.loginEmail.trim(), this.loginPassword);
      if (!this.active) return;
      this.loginPassword = "";
      this.authenticated = true;
      this.loginVisible = false;
      await this.reload();
      const pending = this.pendingAdminAction;
      this.pendingAdminAction = null;
      if (pending === "note") this.startNote();
      if (pending === "pdf") void this.updateComplete.then(() => this.querySelector<HTMLInputElement>("#mind-pdf-input")?.click());
    } catch (e) { this.error = this.message(e); }
    finally { this.authBusy = false; }
  }

  private async logout() {
    await signOutMind();
    if (!this.active) return;
    this.authenticated = false;
    this.draft = null; this.editing = false; this.pendingAdminAction = null;
    this.loginPassword = ""; this.loginVisible = false; this.clearMessages();
    await this.reload();
  }

  disconnectedCallback() {
    this.active = false;
    super.disconnectedCallback();
  }

  private async reload() {
    try {
      const result = mindCloudEnabled() ? await listCloudMindItems() : await listMindItems();
      if (!this.active) return;
      this.items = result.sort((a, b) => b.updatedAt - a.updatedAt);
      this.ready = true;
    } catch (e) {
      if (!this.active) return;
      this.ready = true;
      this.error = e instanceof Error ? e.message : "Não foi possível abrir os dados locais.";
    }
  }

  private get selected() { return this.items.find(x => x.id === this.selectedId); }
  private get topics() {
    const count = new Map<string, number>();
    for (const item of this.items) count.set(item.topic, (count.get(item.topic) ?? 0) + 1);
    return [...count].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }
  private get visible() {
    const q = this.query.trim().toLocaleLowerCase("pt-BR");
    return this.items.filter(item => {
      if (this.filter === "pdf" && item.kind !== "pdf") return false;
      if (this.filter === "note" && item.kind !== "note") return false;
      if (this.filter === "favorite" && !item.favorite) return false;
      if (this.topic !== "all" && item.topic !== this.topic) return false;
      return !q || [item.title, item.topic, item.description, item.content, ...item.tags].join(" ").toLocaleLowerCase("pt-BR").includes(q);
    });
  }

  private requireAdmin(action: "note" | "pdf"): boolean {
    if (!mindCloudEnabled() || this.authenticated) return true;
    this.pendingAdminAction = action;
    this.loginVisible = true;
    this.clearMessages();
    void this.updateComplete.then(() => this.querySelector<HTMLElement>(".mind-admin-login")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return false;
  }

  private startNote = () => {
    if (!this.requireAdmin("note")) return;
    this.clearMessages();
    this.selectedId = null;
    this.draft = {
      id: crypto.randomUUID(), kind: "note", title: "", topic: this.topic === "all" ? "Sem assunto" : this.topic,
      tags: [], description: "", content: "", createdAt: Date.now(), updatedAt: Date.now(), favorite: false,
    };
    this.editing = true;
    this.revealReaderOnSmallScreens();
  };

  private editSelected = () => {
    if (!this.selected || (mindCloudEnabled() && !this.authenticated)) return;
    this.clearMessages();
    this.draft = { ...this.selected, tags: [...this.selected.tags] };
    this.editing = true;
  };

  private cancelEdit = () => { this.editing = false; this.draft = null; };
  private clearMessages() { this.notice = ""; this.error = ""; }
  private setDraft(field: keyof Pick<MindItem, "title" | "topic" | "description" | "content">, value: string) {
    if (this.draft) this.draft = { ...this.draft, [field]: value };
  }
  private tagsInput(event: Event) {
    if (!this.draft) return;
    this.draft = { ...this.draft, tags: normalizedTags((event.target as HTMLInputElement).value) };
  }

  private async saveDraft(event: Event) {
    event.preventDefault();
    if (!this.draft || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    const title = this.draft.title.trim();
    if (!title) { this.error = "Informe um título."; return; }
    const item: MindItem = {
      ...this.draft,
      title: title.slice(0, 180),
      topic: this.draft.topic.trim().slice(0, 80) || "Sem assunto",
      description: this.draft.description.slice(0, 3000),
      content: this.draft.content.slice(0, 250000),
      updatedAt: Date.now(),
    };
    this.busy = true;
    this.clearMessages();
    try {
      if (mindCloudEnabled()) await saveCloudMindItem(item);
      else await saveMindItem(item);
      await this.reload();
      this.selectedId = item.id;
      this.editing = false;
      this.draft = null;
      this.notice = mindCloudEnabled() ? "Alterações sincronizadas na biblioteca privada." : item.kind === "note" ? "Nota salva neste navegador." : "Documento atualizado neste navegador.";
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async uploadPdfs(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    if (!files.length || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    this.busy = true;
    this.clearMessages();
    let imported = 0;
    const rejected: string[] = [];
    try {
      for (const file of files) {
        if (!(await checkedPdf(file))) {
          rejected.push(file.name);
          continue;
        }
        const now = Date.now();
        const item: MindItem = {
          id: crypto.randomUUID(), kind: "pdf", title: file.name.replace(/\.pdf$/i, "").slice(0, 180),
          topic: this.topic === "all" ? "Sem assunto" : this.topic, tags: [], description: "", content: "",
          createdAt: now, updatedAt: now, favorite: false,
          fileName: file.name.slice(0, 180), fileSize: file.size, file,
        };
        if (mindCloudEnabled()) await saveCloudMindItem(item);
      else await saveMindItem(item);
        this.selectedId = item.id;
        imported += 1;
      }
      await this.reload();
      if (imported) this.notice = imported + (mindCloudEnabled()
        ? (imported === 1 ? " PDF sincronizado na nuvem privada." : " PDFs sincronizados na nuvem privada.")
        : (imported === 1 ? " PDF armazenado localmente." : " PDFs armazenados localmente."));
      if (rejected.length) this.error = "Arquivos ignorados (PDF inválido ou acima de 25 MB): " + rejected.slice(0, 3).join(", ");
    } catch (e) { this.error = this.message(e) + " Verifique o espaço livre e exporte um backup."; }
    finally { this.busy = false; }
  }

  private async toggleFavorite() {
    if (!this.selected || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    this.busy = true;
    try {
      const updated = { ...this.selected, file: mindCloudEnabled() ? undefined : this.selected.file, favorite: !this.selected.favorite, updatedAt: Date.now() };
      if (mindCloudEnabled()) await saveCloudMindItem(updated);
      else await saveMindItem(updated);
      await this.reload();
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async removeSelected() {
    if (!this.selected || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    if (!window.confirm(mindCloudEnabled()
      ? "Excluir da biblioteca sincronizada em todos os dispositivos? Faça backup antes de continuar."
      : "Excluir este item da Mente neste navegador? Esta ação não poderá ser desfeita sem backup.")) return;
    this.busy = true;
    this.clearMessages();
    try {
      if (mindCloudEnabled()) await deleteCloudMindItem(this.selected);
      else await deleteMindItem(this.selected.id);
      this.selectedId = null;
      await this.reload();
      this.notice = mindCloudEnabled() ? "Item excluído da biblioteca sincronizada." : "Item excluído deste navegador.";
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async fileAction(download: boolean) {
    const item = this.selected;
    if (!item) return;
    let file = item.file;
    if (mindCloudEnabled() && item.storagePath && !download) {
      window.open(publicMindPdfUrl(item.storagePath), "_blank", "noopener,noreferrer");
      return;
    }
    if (mindCloudEnabled()) {
      try { file = await downloadCloudPdf(item); }
      catch (e) { this.error = this.message(e); return; }
    }
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (download) {
      const a = document.createElement("a");
      a.href = url; a.download = item.fileName || item.title + ".pdf";
      document.body.append(a); a.click(); a.remove();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private async backup() {
    if (this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    this.busy = true; this.clearMessages();
    try {
      const allItems = mindCloudEnabled()
        ? await Promise.all(this.items.map(async item => item.kind === "pdf"
            ? { ...item, file: await downloadCloudPdf(item) } : item))
        : this.items;
      const blob = await createMindBackup(allItems);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mente-2t-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.notice = "Backup gerado com notas e PDFs. Guarde o arquivo em local seguro.";
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async restore(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    if (!window.confirm("Importar e mesclar os itens do backup com esta biblioteca? IDs repetidos serão atualizados.")) return;
    this.busy = true; this.clearMessages();
    try {
      const imported = mindCloudEnabled() ? await parseMindBackup(file) : await restoreMindBackup(file);
      if (mindCloudEnabled()) {
        for (const item of imported) await saveCloudMindItem(item);
      }
      await this.reload();
      this.topic = "all"; this.filter = "all"; this.query = "";
      this.selectedId = imported[0]?.id ?? null;
      this.notice = imported.length + (mindCloudEnabled() ? " itens restaurados na biblioteca sincronizada." : " itens restaurados neste navegador.");
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async migrateLocal() {
    if (this.busy || !this.authenticated || !mindCloudEnabled()) return;
    if (!window.confirm("Copiar os registros deste navegador para a nuvem? Os originais continuarão salvos localmente.")) return;
    this.busy = true; this.clearMessages();
    let copied = 0, skipped = 0;
    try {
      const localItems = await listMindItems();
      const remoteIds = new Set(this.items.map(item => item.id));
      for (const item of localItems) {
        if (remoteIds.has(item.id)) { skipped++; continue; }
        await saveCloudMindItem(item);
        copied++;
      }
      await this.reload();
      this.notice = copied + " itens copiados, " + skipped + " já existentes. Os originais locais foram preservados.";
    } catch (e) {
      await this.reload();
      this.error = this.message(e) + " " + copied + " registros copiados. Os originais locais permanecem intactos.";
    } finally { this.busy = false; }
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : "O navegador não conseguiu concluir a operação.";
  }

  private revealReaderOnSmallScreens() {
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    void this.updateComplete.then(() =>
      this.querySelector<HTMLElement>(".mind-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  private itemButton(item: MindItem) {
    return html`<button class="mind-item ${this.selectedId === item.id && !this.editing ? "is-selected" : ""}"
      type="button" aria-pressed=${this.selectedId === item.id && !this.editing}
      @click=${() => {
        this.selectedId = item.id; this.editing = false; this.draft = null; this.pdfInlineId = mindCloudEnabled() && item.kind === "pdf" ? item.id : null; this.clearMessages();
        this.revealReaderOnSmallScreens();
      }}>
      <span class="mind-item-symbol" aria-hidden="true">${item.kind === "pdf" ? "PDF" : "✎"}</span>
      <span class="mind-item-main"><strong>${item.title}</strong><span>${item.topic} · ${new Date(item.updatedAt).toLocaleDateString("pt-BR")} ${item.favorite ? " · ★" : ""}</span></span>
    </button>`;
  }

  private editor() {
    if (!this.draft) return nothing;
    const d = this.draft;
    return html`<form class="mind-editor" @submit=${this.saveDraft}>
      <div class="mind-detail-heading"><div><small>${d.kind === "pdf" ? "DOCUMENTO PDF" : "NOTA"}</small><h2>${this.items.some(x => x.id === d.id) ? "Editar item" : "Nova nota"}</h2></div></div>
      <label>Título<input name="title" maxlength="180" required .value=${d.title} @input=${(e: Event) => this.setDraft("title", (e.target as HTMLInputElement).value)} /></label>
      <label>Assunto<input name="topic" maxlength="80" placeholder="Ex.: Investimentos" .value=${d.topic} @input=${(e: Event) => this.setDraft("topic", (e.target as HTMLInputElement).value)} /></label>
      <label>Etiquetas <span>(separe por vírgula)</span><input name="tags" maxlength="600" placeholder="2027, ações, estudo" .value=${d.tags.join(", ")} @change=${this.tagsInput} /></label>
      <label>Descrição <span>(opcional)</span><textarea name="description" rows="3" maxlength="3000" .value=${d.description} @input=${(e: Event) => this.setDraft("description", (e.target as HTMLTextAreaElement).value)}></textarea></label>
      ${d.kind === "note" ? html`<label>Conteúdo<textarea class="mind-note-content" name="content" rows="11" maxlength="250000" placeholder="Registre suas análises, referências e ideias…" .value=${d.content} @input=${(e: Event) => this.setDraft("content", (e.target as HTMLTextAreaElement).value)}></textarea></label>` : nothing}
      <div class="mind-actions"><button class="mind-primary" type="submit" ?disabled=${this.busy}>Salvar</button><button type="button" @click=${this.cancelEdit}>Cancelar</button></div>
    </form>`;
  }

  private detail(item: MindItem) {
    return html`<div class="mind-detail">
      <div class="mind-detail-heading"><div><small>${item.kind === "pdf" ? "DOCUMENTO PDF" : "NOTA"}</small><h2>${item.title}</h2><p>${item.topic} · Atualizado em ${new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p></div></div>
      ${(!mindCloudEnabled() || this.authenticated) ? html`<div class="mind-detail-footer" role="group" aria-label="Ações do item"><button type="button" @click=${this.editSelected}>Editar</button><button type="button" @click=${this.toggleFavorite} ?disabled=${this.busy}>${item.favorite ? "★ Remover favorito" : "☆ Favoritar"}</button><button type="button" class="mind-danger" @click=${this.removeSelected} ?disabled=${this.busy}>Excluir</button></div>` : nothing}
      ${item.tags.length ? html`<div class="mind-tags">${item.tags.map(tag => html`<span>#${tag}</span>`)}</div>` : nothing}
      ${item.description ? html`<p class="mind-description">${item.description}</p>` : nothing}
      ${item.kind === "pdf" ? html`<div class="mind-preview-summary"><span class="mind-preview-icon">PDF</span><div><strong>${item.fileName}</strong><span>${displayFileSize(item.fileSize || 0)} · ${mindCloudEnabled() ? "Documento público" : "Arquivo guardado neste navegador"}</span></div></div>
        <div class="mind-actions">${mindCloudEnabled() && item.storagePath ? html`
          <button class="mind-primary" type="button" @click=${() => this.pdfInlineId = this.pdfInlineId === item.id ? null : item.id}>${this.pdfInlineId === item.id ? "Fechar visualização" : "Visualizar na 2T"}</button>
          <a class="mind-pdf-external" href=${publicMindPdfUrl(item.storagePath)} target="_blank" rel="noopener noreferrer">Abrir no navegador ↗</a>
          <a class="mind-pdf-external" href=${publicMindPdfUrl(item.storagePath)} download=${item.fileName || item.title + ".pdf"} target="_blank" rel="noopener noreferrer">Baixar PDF</a>`
          : html`<button class="mind-primary" type="button" ?disabled=${!item.file} @click=${() => this.fileAction(false)}>Abrir PDF</button><button type="button" ?disabled=${!item.file} @click=${() => this.fileAction(true)}>Baixar arquivo</button>`}</div>
        ${mindCloudEnabled() && item.storagePath && this.pdfInlineId === item.id ? html`<div class="mind-pdf-embed"><iframe title=${"Visualização do PDF " + item.title} src=${publicMindPdfUrl(item.storagePath)} loading="lazy"></iframe><p>Se o navegador não mostrar o documento, use “Abrir no navegador”.</p></div>` : nothing}`
       : html`<div class="mind-note-view">${item.content || "Esta nota ainda não possui conteúdo."}</div>`}
    </div>`;
  }

  private renderAdminLogin() {
    if (!mindCloudEnabled() || !this.loginVisible || this.authenticated) return nothing;
    return html`<section class="mind-admin-login" aria-label="Login do administrador">
      <div><p class="mind-eyebrow">ADMINISTRAÇÃO</p><h2>Entrar para editar</h2><p>Qualquer pessoa pode consultar a biblioteca. Apenas o administrador pode publicar ou alterar conteúdo.</p></div>
      <form class="mind-login-form" @submit=${this.login}>
        <label>E-mail<input type="email" autocomplete="username" required .value=${this.loginEmail} @input=${(e: Event) => this.loginEmail = (e.target as HTMLInputElement).value} /></label>
        <label>Senha<input type="password" autocomplete="current-password" required .value=${this.loginPassword} @input=${(e: Event) => this.loginPassword = (e.target as HTMLInputElement).value} /></label>
        <div class="mind-actions"><button class="mind-primary" type="submit" ?disabled=${this.authBusy}>Entrar</button><button type="button" @click=${() => { this.loginVisible = false; this.pendingAdminAction = null; this.loginPassword = ""; this.clearMessages(); }}>Cancelar</button></div>
        <small>Cadastro público indisponível.</small>
      </form>
    </section>`;
  }

  render() {
     const visible = this.visible;
    return html`<section class="mind-page" aria-labelledby="mind-title">
      <header class="mind-header">
        <div class="mind-heading"><span class="mind-mark">${obsidianMark}</span><div><p class="mind-eyebrow">2T / BIBLIOTECA PESSOAL</p><h1 id="mind-title" class="sr-only">Mente</h1><p class="mind-tagline">Notas, arquivos e ideias. Sem distrações.</p></div></div>
        <div class="mind-header-actions">
          <button class="mind-primary" type="button" @click=${this.startNote} ?disabled=${this.busy}>+ Nova nota</button>
          <button type="button" @click=${() => { if (this.requireAdmin("pdf")) this.querySelector<HTMLInputElement>("#mind-pdf-input")?.click(); }} ?disabled=${this.busy}>Adicionar PDF</button>
          ${mindCloudEnabled() ? (this.authenticated ? html`<button type="button" @click=${this.logout} ?disabled=${this.busy}>Sair da administração</button>` : html`<button type="button" @click=${() => { this.pendingAdminAction = null; this.loginVisible = !this.loginVisible; }}>Login do administrador</button>`) : nothing}
          <input id="mind-pdf-input" type="file" accept=".pdf,application/pdf" multiple hidden @change=${this.uploadPdfs} />
        </div>
      </header>
      ${mindCloudEnabled() ? html`<div class="mind-local-warning" role="note"><span class="mind-storage-dot" aria-hidden="true"></span><span><strong>Biblioteca pública</strong> · Leitura livre, edição restrita</span><details><summary>Sobre os dados</summary><p>Notas e PDFs desta biblioteca são públicos e podem ser acessados por qualquer pessoa, inclusive por links diretos. Somente o administrador autenticado pode publicar, editar e excluir. Faça backups regulares. Dados locais antigos não são publicados automaticamente.</p></details></div>` :
        html`<div class="mind-local-warning" role="note"><span class="mind-storage-dot" aria-hidden="true"></span><span><strong>Biblioteca local</strong> · Arquivos somente neste navegador</span><details><summary>Sobre os dados</summary><p>Notas e PDFs ficam somente neste navegador e perfil, sem sincronização nem criptografia. Podem desaparecer se os dados do navegador forem apagados. Faça backups e evite dispositivos compartilhados.</p></details></div>`}
      ${this.renderAdminLogin()}
      ${this.notice ? html`<p class="mind-notice" role="status">${this.notice}</p>` : nothing}
      ${this.error ? html`<p class="mind-error" role="alert">${this.error}</p>` : nothing}
      <div class="mind-workspace">
        <aside class="mind-facets" aria-label="Navegação da Mente">
          <div class="mind-facet-title">Explorar</div>
          ${([["all", "Tudo"], ["pdf", "Documentos"], ["note", "Notas"], ["favorite", "Favoritos"]] as const).map(([id, label]) => html`<button type="button" class=${this.filter === id ? "is-active" : ""} aria-pressed=${this.filter === id} @click=${() => { this.filter = id; }}><span>${label}</span><small>${id === "all" ? this.items.length : id === "pdf" ? this.items.filter(x => x.kind === "pdf").length : id === "note" ? this.items.filter(x => x.kind === "note").length : this.items.filter(x => x.favorite).length}</small></button>`)}
          <div class="mind-facet-title mind-topic-title">Assuntos</div>
          <button type="button" class=${this.topic === "all" ? "is-active" : ""} aria-pressed=${this.topic === "all"} @click=${() => { this.topic = "all"; }}>Todos os assuntos</button>
          ${this.topics.map(([topic, total]) => html`<button type="button" class=${this.topic === topic ? "is-active" : ""} aria-pressed=${this.topic === topic} @click=${() => { this.topic = topic; }}><span>${topic}</span><small>${total}</small></button>`)}
          ${(!mindCloudEnabled() || this.authenticated) ? html`<div class="mind-backup">
            ${mindCloudEnabled() ? html`<button type="button" @click=${this.migrateLocal} ?disabled=${this.busy}>Migrar dados deste navegador</button>` : nothing}
            <button type="button" @click=${this.backup} ?disabled=${this.busy}>Exportar backup</button>
            <button type="button" @click=${() => this.querySelector<HTMLInputElement>("#mind-backup-input")?.click()} ?disabled=${this.busy}>Restaurar backup</button>
            <input id="mind-backup-input" type="file" accept=".json,application/json" hidden @change=${this.restore} />
            <p>Backup inclui notas e PDFs. O arquivo exportado não é criptografado.</p>
          </div>` : nothing}
        </aside>
        <div class="mind-list">
          <div class="mind-list-header"><h2>Seu acervo <span>${visible.length}</span></h2>
            <label class="mind-search"><span class="sr-only">Pesquisar na Mente</span><input type="search" placeholder="Buscar no acervo…" aria-label="Pesquisar na Mente" .value=${this.query} @input=${(e: Event) => this.query = (e.target as HTMLInputElement).value} /></label>
          </div>
          ${!this.ready ? html`<p class="mind-list-empty">Carregando acervo…</p>` :
            visible.length ? html`<div class="mind-items">${visible.map(item => this.itemButton(item))}</div>` :
            html`<div class="mind-list-empty"><span aria-hidden="true">◎</span><strong>${this.items.length ? "Nenhum resultado" : "Seu acervo começa aqui"}</strong><p>${this.items.length ? "Experimente outro filtro ou pesquisa." : "Em breve, notas e documentos estarão disponíveis aqui."}</p></div>`}
          <p class="mind-file-limit">PDFs de até ${displayFileSize(MAX_MIND_PDF_BYTES)} por arquivo. ${mindCloudEnabled() ? "Biblioteca pública sincronizada." : "A capacidade total depende do navegador."}</p>
        </div>
        <div class="mind-inspector" aria-label="Detalhes e editor" id="mind-reader">
          ${this.editing ? this.editor() : this.selected ? this.detail(this.selected) : html`<div class="mind-unselected">${obsidianMark}<h2>Seu espaço de leitura</h2><p>Selecione uma nota ou documento para começar.</p></div>`}
        </div>
      </div>
    </section>`;
  }
}
