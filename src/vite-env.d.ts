/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE44_APP_ID: string;
  readonly VITE_BASE44_APP_BASE_URL: string;
  readonly VITE_BASE44_FUNCTIONS_VERSION: string;
  readonly VITE_LIMIT_PRIVACY_URL?: string;
  readonly VITE_LIMIT_TERMS_URL?: string;
  readonly VITE_LIMIT_SUPPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
