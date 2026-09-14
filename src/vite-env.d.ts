/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_THEME_RAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
