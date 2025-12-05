// src/types.d.ts
// Declarations for packages that don't ship TypeScript types.
// Add any other modules here as needed.

declare module 'multer-storage-cloudinary';
declare module 'cloudinary';
declare module '@google/genai';
declare module 'tesseract.js';
declare module 'resend';
declare module 'multer';
declare module 'multer-storage-cloudinary';
declare module 'multer-gridfs-storage';
declare module 'multer-s3';
declare module 'multer-sharp-s3';
declare module 'multer-storage-cloudinary';
declare module 'node-cron';
declare module 'date-fns';
declare module 'passport-jwt';
declare module 'passport';
declare module 'axios';
declare module 'uuid';

interface NodeModule {
  hot?: {
    accept(path?: string, callback?: () => void): void;
  };
}
