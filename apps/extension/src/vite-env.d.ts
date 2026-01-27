/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUD_API_URL?: string;
  readonly VITE_ENCRYPTION_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
