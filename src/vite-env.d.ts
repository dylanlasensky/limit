/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIMIT_PRIVACY_URL?: string;
  readonly VITE_LIMIT_TERMS_URL?: string;
  readonly VITE_LIMIT_SUPPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
