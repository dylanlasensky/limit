import { storageGet, storageSet, storageRemove } from "@/lib/storage";

const params = new URLSearchParams(window.location.search);
// Only tokens are accepted from sign-in callbacks. URLs must not redirect the
// authenticated SDK to a different app or host.
if (params.get("clear_access_token") === "true") {
  storageRemove("localStorage", "base44_access_token");
  storageRemove("localStorage", "token");
}
const token =
  params.get("access_token") || storageGet("localStorage", "base44_access_token") || undefined;
if (params.get("access_token")) storageSet("localStorage", "base44_access_token", token!);
let changed = false;
for (const key of [
  "access_token",
  "clear_access_token",
  "app_id",
  "app_base_url",
  "functions_version",
  "from_url",
]) {
  if (params.has(key)) {
    params.delete(key);
    changed = true;
  }
}
if (changed) {
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname + (query ? "?" + query : "") + window.location.hash
  );
}
export const appParams = {
  appId: import.meta.env.VITE_BASE44_APP_ID,
  appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
  functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
  token,
  fromUrl: window.location.href,
};
