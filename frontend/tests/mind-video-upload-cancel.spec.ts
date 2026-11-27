import { expect, test } from "@playwright/test";
import { Upload } from "tus-js-client";
import { MindVideoUploadCancelledError, uploadMindVideo } from "../src/mind/video-upload";

test("cancelamento durante a busca por retomada não inicia uma requisição TUS", async () => {
  const runtime = globalThis as unknown as Record<string, unknown>;
  const configKeys = ["__2T_MIND_SUPABASE_URL__", "__2T_MIND_SUPABASE_KEY__"];
  const previousConfig = new Map(configKeys.map(key => [key, runtime[key]]));
  Object.assign(runtime, {
    __2T_MIND_SUPABASE_URL__: "https://mindtest.supabase.co",
    __2T_MIND_SUPABASE_KEY__: "sb_publishable_test",
  });

  let markLookupStarted!: () => void;
  let releaseLookup!: () => void;
  const lookupStarted = new Promise<void>(resolve => { markLookupStarted = resolve; });
  const lookupGate = new Promise<void>(resolve => { releaseLookup = resolve; });
  const originalFind = Upload.prototype.findPreviousUploads;
  const originalStart = Upload.prototype.start;
  let started = false;

  Upload.prototype.findPreviousUploads = async function () {
    markLookupStarted();
    await lookupGate;
    return [];
  };
  Upload.prototype.start = function () {
    started = true;
    this.options.onSuccess?.(this);
  };

  const controller = new AbortController();
  try {
    const pending = uploadMindVideo(
      new Blob(["synthetic MP4 payload"], { type: "video/mp4" }),
      "race.mp4",
      "075026fa-4e9f-4e1a-8ef4-a3c443e11442",
      () => {},
      controller.signal,
    );
    await lookupStarted;
    controller.abort();
    releaseLookup();

    await expect(pending).rejects.toBeInstanceOf(MindVideoUploadCancelledError);
    expect(started).toBe(false);
  } finally {
    releaseLookup();
    Upload.prototype.findPreviousUploads = originalFind;
    Upload.prototype.start = originalStart;
    for (const key of configKeys) {
      const prior = previousConfig.get(key);
      if (prior === undefined) delete runtime[key];
      else runtime[key] = prior;
    }
  }
});
