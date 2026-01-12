/**
 * CORS utilities
 */

export {
  isOriginAllowed,
  getCorsHeaders,
  createPreflightResponse,
  withCorsHeaders,
} from "./cors";

export type { CorsHeaders } from "./cors";
