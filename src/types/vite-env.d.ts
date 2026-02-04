/// <reference types="vite/client" />
interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_GATEWAY_URL: string;
  readonly VITE_APP_ID: string;
  readonly VITE_DEMO_MODE_LOCAL_ONLY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
