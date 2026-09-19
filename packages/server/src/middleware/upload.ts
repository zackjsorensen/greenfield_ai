import multer from 'multer';

export function createUploader(maxUploadBytes: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1 },
  });
}
