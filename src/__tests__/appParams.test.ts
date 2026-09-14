import { beforeEach, describe, expect, it, vi } from "vitest";
describe("trusted app configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.stubEnv("VITE_BASE44_APP_ID", "trusted-app");
    vi.stubEnv("VITE_BASE44_APP_BASE_URL", "https://trusted.base44.app");
  });
  it("ignores host/app overrides from links and storage", async () => {
    localStorage.setItem("base44_app_base_url", "https://untrusted.example");
    window.history.replaceState(
      {},
      "",
      "/?app_id=untrusted&app_base_url=https://untrusted.example&functions_version=other"
    );
    const { appParams } = await import("@/lib/app-params");
    expect(appParams.appId).toBe("trusted-app");
    expect(appParams.appBaseUrl).toBe("https://trusted.base44.app");
    expect(window.location.search).toBe("");
  });
  it("consumes the callback token without leaving it in the URL", async () => {
    window.history.replaceState({}, "", "/home?access_token=test-token&keep=yes");
    const { appParams } = await import("@/lib/app-params");
    expect(appParams.token).toBe("test-token");
    expect(window.location.search).toBe("?keep=yes");
  });
  it("a clear-token flag is not persisted into future sign-ins", async () => {
    localStorage.setItem("base44_access_token", "old");
    window.history.replaceState({}, "", "/?clear_access_token=true");
    const { appParams } = await import("@/lib/app-params");
    expect(appParams.token).toBeUndefined();
    expect(localStorage.getItem("base44_clear_access_token")).toBeNull();
  });
});
