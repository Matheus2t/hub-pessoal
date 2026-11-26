import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { obsidianMark } from "./obsidian-mark";
import { mindCloudEnabled, mindLocalModeEnabled, publicMindPdfUrl, publicMindVideoUrl, restoreMindSession, safeMindPdfFileName, signInMind, signOutMind } from "./cloud-auth";
import { checkPublicCloudPdf, deleteCloudMindItem, downloadPublicCloudPdf, listCloudMindItems, downloadPublicCloudVideo, saveCloudMindItem } from "./cloud-store";
import { checkedMp4, MAX_MIND_VIDEO_BYTES, parseMindVideoLink, safeMindVideoFileName } from "./video";
import { MindVideoUploadCancelledError, type MindVideoUploadProgress } from "./video-upload";
import {
  checkedPdf, createMindBackup, deleteMindItem, displayFileSize,
  listMindItems, MAX_MIND_PDF_BYTES, mindBackupAssetName, normalizedTags, parseMindBackup, restoreMindBackup, saveMindItem,
  type MindItem,
} from "./store";

type Filter = "all" | "pdf" | "note" | "video" | "favorite";
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
  private pdfPreviewGeneration = 0;
  @state() private authenticated = false;
  @state() private checkingSession = false;
  @state() private loginVisible = false;
  @state() private authBusy = false;
  @state() private loginEmail = "";
  @state() private loginPassword = "";
  @state() private pdfInlineId: string | null = null;
  @state() private pdfExpanded = false;
  @state() private pdfFrameStatus: "loading" | "ready" | "loaded" | "error" = "loading";
  @state() private pdfFrameError = "";
  @state() private pendingAdminAction: "note" | "pdf" | "video" | null = null;
  @state() private videoMode: "link" | "file" = "link";
  @state() private videoPreviewUrl: string | null = null;
  @state() private videoPreviewReady = false;
  @state() private videoPreviewError = "";
  @state() private videoPreviewDuration = 0;
  @state() private videoUploadProgress: MindVideoUploadProgress | null = null;
  @state() private videoUploadStage: "idle" | "preparing" | "uploading" | "publishing" | "failed" = "idle";
  @state() private backupAssets: MindItem[] = [];
  @state() private backupAssetStarted: string[] = [];
  private videoDraftObjectUrl: string | null = null;
  private videoUploadController: AbortController | null = null;
  private localVideoObjectUrl: string | null = null;
  private localVideoObjectId: string | null = null;

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
      if (pending === "video") this.startVideo();
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
    this.pdfPreviewGeneration += 1;
    this.videoUploadController?.abort();
    this.clearVideoPreview();
    this.setLocalVideo();
    super.disconnectedCallback();
  }

  private async reload() {
    if (!this.libraryAvailable) {
      if (!this.active) return;
      this.items = [];
      this.ready = true;
      return;
    }
    try {
      const result = mindCloudEnabled() ? await listCloudMindItems() : await listMindItems();
      if (!this.active) return;
      this.items = result.sort((a, b) => b.updatedAt - a.updatedAt);
      this.setLocalVideo(this.selected);
      this.ready = true;
    } catch (e) {
      if (!this.active) return;
      this.ready = true;
      this.error = e instanceof Error ? e.message : "Não foi possível abrir os dados locais.";
    }
  }

  private get selected() { return this.items.find(x => x.id === this.selectedId); }
  private setLocalVideo(item?: MindItem) {
    if (this.localVideoObjectId === item?.id && this.localVideoObjectUrl) return;
    if (this.localVideoObjectUrl) URL.revokeObjectURL(this.localVideoObjectUrl);
    this.localVideoObjectUrl = null;
    this.localVideoObjectId = null;
    if (!mindCloudEnabled() && item?.kind === "video" && item.file) {
      this.localVideoObjectUrl = URL.createObjectURL(item.file);
      this.localVideoObjectId = item.id;
    }
  }
  private get libraryAvailable() { return mindCloudEnabled() || mindLocalModeEnabled(); }
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
      if (this.filter === "video" && item.kind !== "video") return false;
      if (this.filter === "favorite" && !item.favorite) return false;
      if (this.topic !== "all" && item.topic !== this.topic) return false;
      return !q || [item.title, item.topic, item.description, item.content, ...item.tags].join(" ").toLocaleLowerCase("pt-BR").includes(q);
    });
  }

  private requireAdmin(action: "note" | "pdf" | "video"): boolean {
    if (!this.libraryAvailable) {
      this.error = "A biblioteca compartilhada não está configurada neste deployment.";
      return false;
    }
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

  private startVideo = () => {
    if (!this.requireAdmin("video")) return;
    this.clearMessages();
    this.clearVideoPreview();
    this.videoUploadStage = "idle";
    this.videoUploadProgress = null;
    this.selectedId = null;
    this.videoMode = "link";
    const now = Date.now();
    this.draft = {
      id: crypto.randomUUID(), kind: "video", title: "", topic: this.topic === "all" ? "Sem assunto" : this.topic,
      tags: [], description: "", content: "", videoUrl: "", createdAt: now, updatedAt: now, favorite: false,
    };
    this.editing = true;
    this.revealReaderOnSmallScreens();
  };

  private editSelected = () => {
    if (!this.libraryAvailable || !this.selected || (mindCloudEnabled() && !this.authenticated)) return;
    this.clearMessages();
    this.draft = { ...this.selected, tags: [...this.selected.tags] };
    this.videoMode = this.selected.kind === "video" && !this.selected.videoUrl ? "file" : "link";
    this.editing = true;
  };

  private cancelEdit = () => { this.videoUploadController?.abort(); this.clearVideoPreview(); this.editing = false; this.draft = null; this.videoUploadStage = "idle"; };
  private clearMessages() { this.notice = ""; this.error = ""; }
  private setDraft(field: keyof Pick<MindItem, "title" | "topic" | "description" | "content">, value: string) {
    if (this.draft) this.draft = { ...this.draft, [field]: value };
  }
  private changeVideoMode(mode: "link" | "file") {
    if (!this.draft || this.draft.kind !== "video") return;
    this.clearVideoPreview();
    this.videoMode = mode;
    this.draft = { ...this.draft, file: undefined, posterDataUrl: undefined, videoUrl: mode === "file" ? "" : this.draft.videoUrl ?? "" };
    this.clearMessages();
  }

  private async chooseVideoFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) await this.selectVideoFile(file);
  }

  private async selectVideoFile(file: File) {
    if (!this.draft || this.draft.kind !== "video") return;
    if (!file.name.toLowerCase().endsWith(".mp4") || file.size > MAX_MIND_VIDEO_BYTES || !(await checkedMp4(file))) {
        this.error = `Selecione um MP4 válido de até ${this.displayVideoSize(MAX_MIND_VIDEO_BYTES)}.`;
      return;
    }
    this.clearVideoPreview();
    this.videoDraftObjectUrl = URL.createObjectURL(file);
    this.videoPreviewUrl = this.videoDraftObjectUrl;
    this.videoPreviewReady = false;
    this.videoPreviewError = "";
    this.videoPreviewDuration = 0;
    const suggestedTitle = file.name.replace(/\.mp4$/i, "").replace(/[_-]+/g, " ").trim();
    this.draft = { ...this.draft, title: this.draft.title.trim() ? this.draft.title : suggestedTitle, file, videoUrl: "", fileName: file.name, fileSize: file.size, posterDataUrl: undefined };
    this.videoUploadProgress = null;
    this.videoUploadStage = "idle";
    this.clearMessages();
  }

  private clearVideoPreview() {
    if (this.videoDraftObjectUrl) URL.revokeObjectURL(this.videoDraftObjectUrl);
    this.videoDraftObjectUrl = null;
    this.videoPreviewUrl = null;
    this.videoPreviewReady = false;
    this.videoPreviewError = "";
    this.videoPreviewDuration = 0;
  }

  private videoPreviewLoaded(event: Event) {
    const video = event.currentTarget as HTMLVideoElement;
    this.videoPreviewReady = true;
    this.videoPreviewDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const draft = this.draft;
    if (!draft || draft.kind !== "video" || !video.videoWidth || !video.videoHeight) return;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 320 / video.videoWidth, 180 / video.videoHeight);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const poster = canvas.toDataURL("image/webp", 0.62);
      if (poster.length <= 65536 && poster.startsWith("data:image/webp;base64,")) {
        this.draft = { ...draft, posterDataUrl: poster };
      }
    } catch { /* Thumbnail is optional; the MP4 remains publishable. */ }
  }

  private videoPreviewFailed() {
    this.videoPreviewReady = false;
    this.videoPreviewError = "Este MP4 não pôde ser decodificado neste navegador. Use vídeo H.264 com áudio AAC.";
  }

  private cancelVideoUpload() { this.videoUploadController?.abort(); }
  private formatDuration(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  private displayVideoSize(bytes: number) {
    if (bytes < 1_000_000) return displayFileSize(bytes);
    const mb = bytes / 1_000_000;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1).replace(".", ",")} MB`;
  }

  private tagsInput(event: Event) {
    if (!this.draft) return;
    this.draft = { ...this.draft, tags: normalizedTags((event.target as HTMLInputElement).value) };
  }

  private async saveDraft(event: Event) {
    event.preventDefault();
    if (!this.libraryAvailable || !this.draft || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
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
    if (item.kind === "video") {
      if (this.videoMode === "link") {
        const parsed = parseMindVideoLink(item.videoUrl ?? "");
        if (!parsed) { this.error = "Informe um link HTTPS válido do YouTube ou Vimeo."; return; }
        item.videoUrl = parsed.url;
        item.file = undefined;
        item.storagePath = undefined;
        item.fileName = undefined;
        item.fileSize = undefined;
      } else {
        item.videoUrl = undefined;
        if (!item.file && !item.storagePath) { this.error = "Selecione um arquivo MP4."; return; }
        if (item.file && !(await checkedMp4(item.file))) { this.error = `MP4 inválido ou maior que ${this.displayVideoSize(MAX_MIND_VIDEO_BYTES)}.`; return; }
        if (item.file && !this.videoPreviewReady) { this.error = this.videoPreviewError || "Aguarde a análise do vídeo antes de publicar."; return; }
      }
    }
    this.busy = true;
    this.videoUploadController = item.kind === "video" && !!item.file ? new AbortController() : null;
    this.videoUploadProgress = null;
    this.videoUploadStage = this.videoUploadController ? "preparing" : "idle";
    this.clearMessages();
    try {
      let cleanupPending = false;
      if (mindCloudEnabled()) cleanupPending = await saveCloudMindItem(item, {
        signal: this.videoUploadController?.signal,
        onVideoProgress: progress => { this.videoUploadProgress = progress; this.videoUploadStage = "uploading"; },
      });
      else await saveMindItem(item);
      if (this.videoUploadController) this.videoUploadStage = "publishing";
      await this.reload();
      this.selectedId = item.id;
      this.setLocalVideo(this.selected);
      this.editing = false;
      this.draft = null;
      this.clearVideoPreview();
      this.notice = mindCloudEnabled()
        ? cleanupPending ? "Item publicado; o PDF anterior ainda precisa de limpeza." : "Alterações publicadas na biblioteca 2T."
        : item.kind === "note" ? "Nota salva neste navegador." : "Documento atualizado neste navegador.";
    } catch (e) {
      this.videoUploadStage = e instanceof MindVideoUploadCancelledError ? "idle" : this.videoUploadController ? "failed" : "idle";
      if (!(e instanceof MindVideoUploadCancelledError)) this.error = this.message(e);
      else this.notice = "Envio cancelado. Selecione o mesmo arquivo novamente para retomar.";
    }
    finally { this.videoUploadController = null; this.busy = false; }
  }

  private async uploadPdfs(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    if (!this.libraryAvailable || !files.length || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    this.busy = true;
    this.clearMessages();
    let imported = 0;
    let cleanupPending = false;
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
        if (mindCloudEnabled()) cleanupPending = (await saveCloudMindItem(item)) || cleanupPending;
        else await saveMindItem(item);
        this.selectedId = item.id;
        imported += 1;
      }
      await this.reload();
      if (imported) this.notice = imported + (mindCloudEnabled()
        ? (cleanupPending ? " PDF publicado; um arquivo anterior ainda precisa de limpeza." : imported === 1 ? " PDF publicado na biblioteca 2T." : " PDFs publicados na biblioteca 2T.")
        : (imported === 1 ? " PDF armazenado localmente." : " PDFs armazenados localmente."));
      if (rejected.length) this.error = "Arquivos ignorados (PDF inválido ou acima de 25 MB): " + rejected.slice(0, 3).join(", ");
    } catch (e) { this.error = this.message(e) + " Verifique o espaço livre e exporte um backup."; }
    finally { this.busy = false; }
  }

  private async toggleFavorite() {
    if (!this.libraryAvailable || !this.selected || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
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
    if (!this.libraryAvailable || !this.selected || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    if (!window.confirm(mindCloudEnabled()
      ? "Excluir da biblioteca pública em todos os dispositivos? Faça backup antes de continuar."
      : "Excluir este item da Mente neste navegador? Esta ação não poderá ser desfeita sem backup.")) return;
    this.busy = true;
    this.clearMessages();
    try {
      const cleanupPending = mindCloudEnabled() ? await deleteCloudMindItem(this.selected) : false;
      if (!mindCloudEnabled()) await deleteMindItem(this.selected.id);
      this.selectedId = null;
      await this.reload();
      this.notice = mindCloudEnabled()
        ? cleanupPending ? "Item removido; o arquivo público ficou pendente de limpeza." : "Item removido da biblioteca pública."
        : "Item excluído deste navegador.";
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async fileAction(download: boolean) {
    const item = this.selected;
    if (!this.libraryAvailable || !item || this.busy || item.kind !== "pdf") return;
    if (mindCloudEnabled() && item.storagePath && !download) {
      window.open(publicMindPdfUrl(item.storagePath), "_blank", "noopener,noreferrer");
      return;
    }
    this.busy = true;
    this.clearMessages();
    try {
      const file = mindCloudEnabled() ? await downloadPublicCloudPdf(item) : item.file;
      if (!file) throw new Error("O PDF não está disponível para esta ação.");
      const url = URL.createObjectURL(file);
      if (download) {
        const a = document.createElement("a");
        a.href = url; a.download = safeMindPdfFileName(item.fileName || item.title + ".pdf");
        document.body.append(a); a.click(); a.remove();
        this.notice = "Download iniciado.";
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async downloadVideo(item: MindItem) {
    if (this.busy || item.kind !== "video" || item.videoUrl) return;
    this.busy = true; this.clearMessages();
    try {
      const file = mindCloudEnabled() && item.storagePath
        ? await downloadPublicCloudVideo(item)
        : item.file;
      if (!file) throw new Error("O vídeo não está disponível.");
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url; a.download = safeMindVideoFileName(item.fileName ?? item.title + ".mp4");
      document.body.append(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.notice = "Download iniciado.";
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private closeManageMenu() { this.querySelector<HTMLDetailsElement>(".mind-backup")?.removeAttribute("open"); }

  private async backup() {
    if (!this.libraryAvailable || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    this.busy = true; this.clearMessages();
    try {
      const blob = await createMindBackup(this.items);
      this.backupAssets = this.items.filter(item => item.kind === "pdf" || (item.kind === "video" && !item.videoUrl))
        .filter(item => !!item.file || !!item.storagePath);
      this.backupAssetStarted = [];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mente-2t-manifesto-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.notice = this.backupAssets.length
        ? `Manifesto gerado. Baixe também os ${this.backupAssets.length} arquivos listados para completar o backup.`
        : "Backup de metadados gerado. Guarde o arquivo em local seguro.";
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async downloadBackupAsset(item: MindItem) {
    if (this.busy) return;
    this.busy = true;
    try {
      if (mindCloudEnabled() && item.storagePath) {
        const backupName = encodeURIComponent(mindBackupAssetName(item));
        const downloadUrl = item.kind === "pdf"
          ? publicMindPdfUrl(item.storagePath) + "?download=" + backupName
          : publicMindVideoUrl(item.storagePath) + "?download=" + backupName;
        const a = document.createElement("a"); a.href = downloadUrl; a.rel = "noopener noreferrer"; a.click();
        this.backupAssetStarted = [...new Set([...this.backupAssetStarted, item.id])];
        return;
      }
      const blob = item.file;
      if (!blob) throw new Error("O arquivo não está disponível para o backup.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = mindBackupAssetName(item);
      document.body.append(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.backupAssetStarted = [...new Set([...this.backupAssetStarted, item.id])];
    } catch (e) { this.error = this.message(e); }
    finally { this.busy = false; }
  }

  private async restore(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    const manifests = files.filter(file => file.name.toLowerCase().endsWith(".json"));
    const file = manifests[0];
    if (!this.libraryAvailable || !file || manifests.length !== 1 || this.busy || (mindCloudEnabled() && !this.authenticated)) return;
    if (!window.confirm("Importar e mesclar os itens do backup com esta biblioteca? IDs repetidos serão atualizados.")) return;
    this.busy = true; this.clearMessages();
    let restored = 0;
    let cleanupPending = false;
    try {
      const sidecars = files.filter(candidate => candidate !== file);
      const imported = mindCloudEnabled() ? await parseMindBackup(file, sidecars) : await restoreMindBackup(file, sidecars);
      if (mindCloudEnabled()) {
        for (const item of imported) {
          cleanupPending = (await saveCloudMindItem(item)) || cleanupPending;
          restored += 1;
        }
      } else {
        restored = imported.length;
      }
      await this.reload();
      this.topic = "all"; this.filter = "all"; this.query = "";
      this.selectedId = imported[0]?.id ?? null;
      this.notice = imported.length + (mindCloudEnabled()
        ? cleanupPending ? " itens restaurados; um PDF anterior ficou pendente de limpeza." : " itens restaurados na biblioteca pública."
        : " itens restaurados neste navegador.");
    } catch (e) {
      if (mindCloudEnabled() && restored) await this.reload();
      this.error = this.message(e) + (mindCloudEnabled() && restored ? " " + restored + " itens foram restaurados; reimportar o mesmo backup atualiza os IDs sem duplicá-los." : "");
    }
    finally { this.busy = false; }
  }

  private async migrateLocal() {
    if (!this.libraryAvailable || this.busy || !this.authenticated || !mindCloudEnabled()) return;
    if (!window.confirm("Copiar os registros deste navegador para a nuvem? Os originais continuarão salvos localmente.")) return;
    this.busy = true; this.clearMessages();
    let copied = 0, skipped = 0, cleanupPending = false;
    try {
      const localItems = await listMindItems();
      const remoteIds = new Set(this.items.map(item => item.id));
      for (const item of localItems) {
        if (remoteIds.has(item.id)) { skipped++; continue; }
        cleanupPending = (await saveCloudMindItem(item)) || cleanupPending;
        copied++;
      }
      await this.reload();
      this.notice = copied + " itens publicados, " + skipped + " já existentes. Os originais locais foram preservados." +
        (cleanupPending ? " Um PDF anterior ficou pendente de limpeza." : "");
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

  private togglePdfPreview(item: MindItem) {
    if (this.pdfInlineId === item.id && this.pdfFrameStatus !== "error") {
      this.pdfPreviewGeneration += 1;
      this.pdfInlineId = null;
      this.pdfExpanded = false;
      return;
    }
    void this.preparePdfPreview(item);
  }

  private async preparePdfPreview(item: MindItem) {
    const generation = ++this.pdfPreviewGeneration;
    this.pdfInlineId = item.id;
    this.pdfExpanded = false;
    this.pdfFrameStatus = "loading";
    this.pdfFrameError = "";
    try {
      await checkPublicCloudPdf(item);
      if (!this.active || generation !== this.pdfPreviewGeneration) return;
      this.pdfFrameStatus = "ready";
    } catch (error) {
      if (!this.active || generation !== this.pdfPreviewGeneration) return;
      this.pdfFrameError = this.message(error);
      this.pdfFrameStatus = "error";
    }
  }

  private itemButton(item: MindItem) {
    const videoThumbnail = item.kind === "video" && item.videoUrl ? parseMindVideoLink(item.videoUrl)?.thumbnail : undefined;
    const videoPoster = item.kind === "video" ? item.posterDataUrl : undefined;
    return html`<button class="mind-item ${this.selectedId === item.id && !this.editing ? "is-selected" : ""}"
      type="button" aria-pressed=${this.selectedId === item.id && !this.editing}
      @click=${() => {
        this.selectedId = item.id; this.editing = false; this.draft = null;
        this.pdfPreviewGeneration += 1;
        this.pdfInlineId = null;
        this.pdfExpanded = false;
        if (mindCloudEnabled() && item.kind === "pdf" && item.storagePath) void this.preparePdfPreview(item);
        this.setLocalVideo(item);
        this.clearMessages();
        this.revealReaderOnSmallScreens();
      }}>
      ${videoThumbnail || videoPoster
        ? html`<img class="mind-item-thumbnail" loading="lazy" alt="" src=${videoThumbnail ?? videoPoster!} />`
        : html`<span class="mind-item-symbol" aria-hidden="true">${item.kind === "pdf" ? "PDF" : item.kind === "video" ? "▶" : "✎"}</span>`}
      <span class="mind-item-main"><strong>${item.title}</strong><span>${item.topic === "Sem assunto" ? (item.kind === "pdf" ? "PDF" : item.kind === "video" ? "Vídeo" : "Nota") : item.topic}${item.favorite ? " · ★" : ""}</span></span>
    </button>`;
  }

  private editor() {
    if (!this.draft) return nothing;
    const d = this.draft;
    return html`<form class="mind-editor" @submit=${this.saveDraft}>
      <div class="mind-detail-heading"><div><small>${d.kind === "pdf" ? "DOCUMENTO PDF" : d.kind === "video" ? "VÍDEO" : "NOTA"}</small><h2>${this.items.some(x => x.id === d.id) ? "Editar item" : d.kind === "video" ? "Novo vídeo" : "Nova nota"}</h2></div></div>
      <label>Título<input name="title" maxlength="180" required .value=${d.title} @input=${(e: Event) => this.setDraft("title", (e.target as HTMLInputElement).value)} /></label>
      <label>Assunto<input name="topic" maxlength="80" placeholder="Ex.: Investimentos" .value=${d.topic} @input=${(e: Event) => this.setDraft("topic", (e.target as HTMLInputElement).value)} /></label>
      <label>Etiquetas <span>(separe por vírgula)</span><input name="tags" maxlength="600" placeholder="2027, ações, estudo" .value=${d.tags.join(", ")} @change=${this.tagsInput} /></label>
      <label>Descrição <span>(opcional)</span><textarea name="description" rows="3" maxlength="3000" .value=${d.description} @input=${(e: Event) => this.setDraft("description", (e.target as HTMLTextAreaElement).value)}></textarea></label>
      ${d.kind === "note" ? html`<label>Conteúdo<textarea class="mind-note-content" name="content" rows="11" maxlength="250000" placeholder="Registre suas análises, referências e ideias…" .value=${d.content} @input=${(e: Event) => this.setDraft("content", (e.target as HTMLTextAreaElement).value)}></textarea></label>` : nothing}
      ${d.kind === "video" ? html`
        <fieldset class="mind-video-mode"><legend>Fonte do vídeo</legend>
          <label><input type="radio" name="video-source" value="link" .checked=${this.videoMode === "link"} @change=${() => this.changeVideoMode("link")} /> Link YouTube/Vimeo</label>
          <label><input type="radio" name="video-source" value="file" .checked=${this.videoMode === "file"} @change=${() => this.changeVideoMode("file")} /> Arquivo MP4</label>
        </fieldset>
        ${this.videoMode === "link" ? html`<label>Endereço do vídeo<input name="video-url" type="url" required placeholder="https://www.youtube.com/watch?v=..." .value=${d.videoUrl ?? ""} @input=${(e: Event) => { if (this.draft) this.draft = { ...this.draft, videoUrl: (e.target as HTMLInputElement).value }; }} /></label>`
          : html`<div class="mind-video-upload">
              <label class="mind-video-dropzone" @dragover=${(e: DragEvent) => e.preventDefault()} @drop=${(e: DragEvent) => { e.preventDefault(); const file = e.dataTransfer?.files[0]; if (file) void this.selectVideoFile(file); }}>
                <input class="mind-video-file-input" name="video-file" type="file" accept=".mp4,video/mp4" @change=${this.chooseVideoFile} />
                <span><strong>${d.fileName ? "Selecionar outro vídeo" : "Arraste um vídeo ou selecione um arquivo"}</strong><small>MP4 · até ${this.displayVideoSize(MAX_MIND_VIDEO_BYTES)}</small></span>
              </label>
              ${d.fileName ? html`<div class="mind-video-file-label"><strong>${d.fileName}</strong><span>${this.displayVideoSize(d.fileSize ?? 0)}${this.videoPreviewDuration ? " · " + this.formatDuration(this.videoPreviewDuration) : ""}</span></div>` : nothing}
              ${this.videoPreviewUrl ? html`<div class="mind-video-draft-preview"><video controls muted playsinline preload="metadata" src=${this.videoPreviewUrl} poster=${d.posterDataUrl ?? nothing} @loadeddata=${this.videoPreviewLoaded} @error=${this.videoPreviewFailed}>Prévia local</video></div>` : nothing}
              ${this.videoPreviewError ? html`<p class="mind-error" role="alert">${this.videoPreviewError}</p>` : this.videoPreviewUrl && !this.videoPreviewReady ? html`<p class="mind-video-status" role="status">Analisando a reprodução neste navegador…</p>` : nothing}
              ${this.videoUploadProgress ? html`<div class="mind-upload-progress" role="status" aria-live="polite">
                <div><span>${this.displayVideoSize(this.videoUploadProgress.sent)} de ${this.displayVideoSize(this.videoUploadProgress.total)} enviados</span><strong>${Math.floor(this.videoUploadProgress.sent / Math.max(1, this.videoUploadProgress.total) * 100)}%</strong></div>
                <progress max=${this.videoUploadProgress.total} .value=${this.videoUploadProgress.sent} aria-label="Progresso do envio do vídeo"></progress>
                <small>${this.videoUploadProgress.bytesPerSecond ? `${this.displayVideoSize(this.videoUploadProgress.bytesPerSecond)}/s${this.videoUploadProgress.secondsRemaining ? " · cerca de " + this.videoUploadProgress.secondsRemaining + " s restantes" : ""}` : "Transferência medida pelo navegador"}</small>
              </div>` : nothing}
              ${this.videoUploadStage === "preparing" ? html`<p class="mind-video-status" role="status">Preparando o envio…</p>` : nothing}
              ${this.videoUploadStage === "publishing" ? html`<p class="mind-video-status" role="status">Publicando na biblioteca…</p>` : nothing}
              ${this.videoUploadStage === "failed" ? html`<p class="mind-video-status" role="status">Envio interrompido. Tentar novamente retoma os blocos enviados.</p>` : nothing}
              ${this.videoUploadController ? html`<button type="button" @click=${this.cancelVideoUpload}>Cancelar envio</button>` : nothing}
            </div>`}
      ` : nothing}
      <div class="mind-actions"><button class="mind-primary" type="submit" ?disabled=${this.busy}>${d.kind === "video" && this.videoMode === "file" ? this.busy ? "Enviando vídeo…" : "Publicar vídeo" : "Salvar"}</button><button type="button" @click=${this.cancelEdit}>Cancelar</button></div>
    </form>`;
  }

  private detail(item: MindItem) {
    return html`<div class="mind-detail">
      <div class="mind-detail-heading">
        <div class="mind-detail-title">
          <small>${item.kind === "pdf" ? "PDF · " + displayFileSize(item.fileSize || 0) : item.kind === "video" ? (item.videoUrl ? "VÍDEO EXTERNO" : "MP4 · " + displayFileSize(item.fileSize || 0)) : "NOTA"}</small>
          <h2>${item.title}</h2>
          <p>${item.topic === "Sem assunto" ? "" : item.topic + " · "}Atualizado em ${new Date(item.updatedAt).toLocaleDateString("pt-BR")}</p>
        </div>
        ${(this.libraryAvailable && (!mindCloudEnabled() || this.authenticated)) ? html`<div class="mind-detail-footer" role="group" aria-label="Ações do item">
          <button type="button" @click=${this.editSelected}>Editar</button>
          <button type="button" @click=${this.toggleFavorite} ?disabled=${this.busy} aria-label=${item.favorite ? "Remover favorito" : "Favoritar"} title=${item.favorite ? "Remover favorito" : "Favoritar"}>${item.favorite ? "★" : "☆"}</button>
          <button type="button" class="mind-danger" @click=${this.removeSelected} ?disabled=${this.busy}>Excluir</button>
        </div>` : nothing}
      </div>
      ${item.tags.length ? html`<div class="mind-tags">${item.tags.map(tag => html`<span>#${tag}</span>`)}</div>` : nothing}
      ${item.description ? html`<p class="mind-description">${item.description}</p>` : nothing}
      ${item.kind === "pdf" ? html`<div class="mind-actions mind-pdf-actions">${mindCloudEnabled() && item.storagePath ? html`
          <a class="mind-pdf-external" href=${publicMindPdfUrl(item.storagePath)} target="_blank" rel="noopener noreferrer">Abrir no navegador ↗</a>
          <button class="mind-pdf-external" type="button" @click=${() => this.fileAction(true)} ?disabled=${this.busy}>Baixar PDF</button>
          ${this.pdfInlineId === item.id ? html`<button class="mind-pdf-external mind-pdf-expand" type="button" aria-pressed=${this.pdfExpanded} @click=${() => this.pdfExpanded = !this.pdfExpanded}>${this.pdfExpanded ? "Voltar à biblioteca" : "Expandir leitura"}</button>` : nothing}
          <button class="mind-preview-toggle" type="button" @click=${() => this.togglePdfPreview(item)}>${this.pdfInlineId === item.id ? this.pdfFrameStatus === "error" ? "Tentar novamente" : "Fechar visualização" : "Visualizar na 2T"}</button>`
          : html`<button class="mind-primary" type="button" ?disabled=${!item.file} @click=${() => this.fileAction(false)}>Abrir PDF</button><button type="button" ?disabled=${!item.file} @click=${() => this.fileAction(true)}>Baixar arquivo</button>`}</div>
        ${mindCloudEnabled() && item.storagePath && this.pdfInlineId === item.id ? html`<div class="mind-pdf-embed">
          ${this.pdfFrameStatus === "loading" ? html`<p role="status" aria-live="polite">Verificando o arquivo PDF…</p>`
            : this.pdfFrameStatus === "error" ? html`<p class="mind-error" role="alert">${this.pdfFrameError} Use “Abrir no navegador” para tentar novamente.</p>`
              : html`<iframe title="Prévia do PDF" src=${publicMindPdfUrl(item.storagePath)} loading="lazy" @load=${() => this.pdfFrameStatus = "loaded"} @error=${() => { this.pdfFrameStatus = "error"; this.pdfFrameError = "Não foi possível carregar a prévia."; }}></iframe>
                <p role="status" aria-live="polite">${this.pdfFrameStatus === "loaded" ? "Documento aberto. Use os controles do visualizador para navegar e ajustar o zoom; se não aparecer, abra em outra aba." : "Abrindo o visualizador de PDF…"}</p>`}</div>` : nothing}`
       : item.kind === "video" ? html`
          <div class="mind-actions mind-video-actions">
            ${item.videoUrl && parseMindVideoLink(item.videoUrl)
              ? html`<a class="mind-pdf-external" href=${parseMindVideoLink(item.videoUrl)!.url} target="_blank" rel="noopener noreferrer">Abrir no navegador ↗</a>`
              : item.storagePath && mindCloudEnabled()
                ? html`<a class="mind-pdf-external" href=${publicMindVideoUrl(item.storagePath)} target="_blank" rel="noopener noreferrer">Abrir no navegador ↗</a>
                  <button class="mind-pdf-external" type="button" ?disabled=${this.busy} @click=${() => this.downloadVideo(item)}>Baixar vídeo</button>`
                : item.file ? html`<button type="button" @click=${() => this.downloadVideo(item)}>Baixar vídeo</button>` : nothing}
          </div>
          <div class="mind-video-player">
            ${item.videoUrl ? (parseMindVideoLink(item.videoUrl)
              ? html`<iframe title=${"Vídeo: " + item.title} src=${parseMindVideoLink(item.videoUrl)!.embedUrl}
                  loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen
                  referrerpolicy="strict-origin-when-cross-origin"></iframe>`
              : html`<p role="alert">O endereço deste vídeo é inválido.</p>`)
              : (mindCloudEnabled() && item.storagePath ? publicMindVideoUrl(item.storagePath) : this.localVideoObjectUrl)
                ? html`<video controls playsinline preload="metadata" poster=${item.posterDataUrl ?? nothing} src=${mindCloudEnabled() && item.storagePath
                    ? publicMindVideoUrl(item.storagePath) : this.localVideoObjectUrl ?? ""} @error=${() => { this.error = "Este navegador não conseguiu reproduzir o codec deste MP4. Tente H.264 com áudio AAC ou outro navegador."; }}>Seu navegador não suporta vídeo MP4.</video>`
                : html`<p role="alert">Vídeo indisponível.</p>`}
          </div>
          <p class="mind-video-caveat">${item.videoUrl ? "A reprodução depende das permissões do vídeo na plataforma de origem." : "Reprodução no navegador com controles de volume, velocidade e tela cheia."}</p>
        ` : html`<div class="mind-note-view">${item.content || "Esta nota ainda não possui conteúdo."}</div>`}
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
        ${this.libraryAvailable ? html`<div class="mind-header-actions">
          <button class="mind-primary" type="button" @click=${this.startNote} ?disabled=${this.busy}>+ Nova nota</button>
          <button type="button" @click=${() => { if (this.requireAdmin("pdf")) this.querySelector<HTMLInputElement>("#mind-pdf-input")?.click(); }} ?disabled=${this.busy}>Adicionar PDF</button>
          <button type="button" @click=${this.startVideo} ?disabled=${this.busy}>Adicionar vídeo</button>
          ${mindCloudEnabled() ? (this.authenticated ? html`<button class="mind-logout-button" type="button" @click=${this.logout} ?disabled=${this.busy || this.authBusy} title="Encerrar sessão da Mente">Sair da conta</button>` : html`<button type="button" @click=${() => { this.pendingAdminAction = null; this.loginVisible = !this.loginVisible; }}>Login do administrador</button>`) : nothing}
          <input id="mind-pdf-input" type="file" accept=".pdf,application/pdf" multiple hidden @change=${this.uploadPdfs} />
        </div>` : nothing}
      </header>
      ${mindCloudEnabled() ? html`<div class="mind-local-warning" role="note"><span class="mind-storage-dot" aria-hidden="true"></span><span><strong>Biblioteca pública</strong> · Leitura livre, edição restrita</span><details><summary>Sobre os dados</summary><p>Notas, PDFs e vídeos desta biblioteca são públicos e podem ser acessados por qualquer pessoa, inclusive por links diretos. Somente o administrador autenticado pode publicar, editar e excluir. Faça backups regulares. Dados locais antigos não são publicados automaticamente.</p></details></div>` : mindLocalModeEnabled() ?
        html`<div class="mind-local-warning" role="note"><span class="mind-storage-dot" aria-hidden="true"></span><span><strong>Biblioteca local</strong> · Arquivos somente neste navegador</span><details><summary>Sobre os dados</summary><p>Notas e PDFs ficam somente neste navegador e perfil, sem sincronização nem criptografia. Podem desaparecer se os dados do navegador forem apagados. Faça backups e evite dispositivos compartilhados.</p></details></div>` :
        html`<div class="mind-local-warning" role="status"><span><strong>Biblioteca indisponível</strong> · A configuração pública não está disponível neste deployment.</span></div>`}
      ${this.renderAdminLogin()}
      ${this.notice ? html`<p class="mind-notice" role="status">${this.notice}</p>` : nothing}
      ${this.error ? html`<p class="mind-error" role="alert">${this.error}</p>` : nothing}
      ${this.backupAssets.length ? html`<section class="mind-backup-assets" aria-label="Arquivos do backup">
        <div><strong>Arquivos do backup</strong><p>O manifesto JSON não contém os arquivos binários. Baixe cada item abaixo e selecione todos junto ao JSON ao restaurar.</p></div>
        <ul>${this.backupAssets.map(item => html`<li><span>${item.fileName ?? item.title}${this.backupAssetStarted.includes(item.id) ? " · iniciado" : ""}</span><button type="button" @click=${() => void this.downloadBackupAsset(item)} ?disabled=${this.busy}>Baixar ${item.kind === "pdf" ? "PDF" : "MP4"}</button></li>`)}</ul>
      </section>` : nothing}
      <div class="mind-workspace ${this.pdfExpanded ? "mind-workspace--pdf-expanded" : ""}">
        ${this.libraryAvailable ? html`
        <aside class="mind-facets" aria-label="Navegação da Mente">
          <div class="mind-facet-title sr-only">Explorar</div>
          <div class="mind-filter-tabs" role="group" aria-label="Filtrar por tipo">
            ${([["all", "Tudo"], ["pdf", "Documentos"], ["note", "Notas"], ["video", "Vídeos"], ["favorite", "Favoritos"]] as const).map(([id, label]) => html`<button type="button" class=${this.filter === id ? "is-active" : ""} aria-pressed=${this.filter === id} @click=${() => { this.filter = id; }}>${label}</button>`)}
          </div>
          <label class="mind-topic-filter"><span class="sr-only">Filtrar por assunto</span>
            <select aria-label="Filtrar por assunto" .value=${this.topic} @change=${(e: Event) => { this.topic = (e.target as HTMLSelectElement).value; }}>
              <option value="all">Todos os assuntos</option>
              ${this.topics.map(([topic, count]) => html`<option value=${topic}>${topic} (${count})</option>`)}
            </select>
          </label>
          ${(!mindCloudEnabled() || this.authenticated) ? html`<details class="mind-backup">
            <summary>Gerenciar</summary>
            <div class="mind-backup-menu">
              ${mindCloudEnabled() ? html`<button type="button" @click=${() => { this.closeManageMenu(); void this.migrateLocal(); }} ?disabled=${this.busy}>Migrar dados deste navegador</button>` : nothing}
              <button type="button" @click=${() => { this.closeManageMenu(); void this.backup(); }} ?disabled=${this.busy}>Exportar backup</button>
              <button type="button" @click=${() => { this.closeManageMenu(); this.querySelector<HTMLInputElement>("#mind-backup-input")?.click(); }} ?disabled=${this.busy}>Restaurar backup</button>
              <input id="mind-backup-input" type="file" accept=".json,.pdf,.mp4,application/json,application/pdf,video/mp4" multiple hidden @change=${this.restore} />
              <p>O manifesto e os arquivos são exportados separadamente. O backup não é criptografado.</p>
            </div>
          </details>` : nothing}
        </aside>
        <div class="mind-list">
          <div class="mind-list-header"><h2>Acervo <span>${visible.length}</span></h2>
            <label class="mind-search"><span class="sr-only">Pesquisar na Mente</span><input type="search" placeholder="Buscar no acervo…" aria-label="Pesquisar na Mente" .value=${this.query} @input=${(e: Event) => this.query = (e.target as HTMLInputElement).value} /></label>
          </div>
          ${!this.ready ? html`<p class="mind-list-empty">Carregando acervo…</p>` :
            visible.length ? html`<div class="mind-items">${visible.map(item => this.itemButton(item))}</div>` :
            html`<div class="mind-list-empty"><span aria-hidden="true">◎</span><strong>${this.items.length ? "Nenhum resultado" : "Acervo vazio"}</strong><p>${this.items.length ? "Experimente outro filtro ou pesquisa." : "Os documentos publicados aparecerão aqui."}</p></div>`}
          <p class="mind-file-limit">PDFs de até ${displayFileSize(MAX_MIND_PDF_BYTES)} e MP4 de até ${this.displayVideoSize(MAX_MIND_VIDEO_BYTES)}. ${mindCloudEnabled() ? "Biblioteca pública sincronizada." : "A capacidade total depende do navegador."}</p>
        </div>
        <div class="mind-inspector" aria-label="Detalhes e editor" id="mind-reader">
          ${this.editing ? this.editor() : this.selected ? this.detail(this.selected) : html`<div class="mind-unselected">${obsidianMark}<h2>Seu espaço de leitura</h2><p>Selecione uma nota ou documento para começar.</p></div>`}
        </div>
        ` : html`<div class="mind-unavailable" role="status"><h2>A biblioteca compartilhada não está configurada</h2><p>Os dados deste navegador não serão tratados como conteúdo publicado.</p></div>`}
      </div>
    </section>`;
  }
}
