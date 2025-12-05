// backend/src/types.d.ts
// Broad declarations to satisfy TypeScript when some libs don't ship full types
// Add more entries here if new "Cannot find module" or "has no exported member" errors appear.

declare module 'multer-storage-cloudinary';
declare module 'cloudinary';
declare module '@google/genai' {
  // provide simple placeholders so code that expects specific types compiles
  export type PartUnion = any;
  const GenAI: any;
  export default GenAI;
}
declare module 'tesseract.js';
declare module 'resend';
declare module 'multer';
declare module 'multer-storage-cloudinary';
declare module 'multer-gridfs-storage';
declare module 'multer-s3';
declare module 'multer-sharp-s3';
declare module 'node-cron';
declare module 'date-fns';
declare module 'passport-jwt' {
  // Passport-jwt typings can vary by version; provide a permissive fallback
  export type StrategyOptions = any;
  export const Strategy: any;
  export const ExtractJwt: any;
}
declare module 'passport' {
  const passport: any;
  export default passport;
}
declare module 'axios' {
  const axios: any;
  export default axios;
}
declare module 'uuid' {
  const uuid: any;
  export default uuid;
}

// If code expects mongoose Document or mongoose namespace types, provide permissive fallback:
declare module 'mongoose' {
  const mongoose: any;
  export = mongoose;
}

// Provide minimal MulterError declaration to satisfy `MulterError` usage
declare global {
  namespace Express {
    // minimal placeholders to avoid compile errors referring to Express.Multer types
    interface Multer {
      ANY?: any;
    }
  }
}// src/types.d.ts (or add to existing types file)
declare module "multer" {
  export class MulterError extends Error {
    code: string;
    field?: string;
    storage?: any;
    constructor(code: string, message?: string);
  }
}

interface NodeModule {
  hot?: {
    accept(path?: string, callback?: () => void): void;
  };
}
