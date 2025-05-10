export interface Env {
    JWT_SECRET: string;
    AMV_SPACE_KEY: KVNamespace;
    KV_NAMESPACE_TOKEN_BLACKLIST: KVNamespace;
    SITE_URL: string;
    EMAIL_FROM?: string;
    EMAIL_API_KEY?: string;
  }