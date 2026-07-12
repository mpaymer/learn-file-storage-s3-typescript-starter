import type { ApiConfig } from "./config";
import type { Video } from "./db/videos";

export async function uploadVideoToS3(
  cfg: ApiConfig,
  key: string,
  processFilePath: string,
  contentType: string,
) {
  const s3file = cfg.s3Client.file(key, {
    bucket: cfg.s3Bucket,
  });
  const videoFile = Bun.file(processFilePath);
  await s3file.write(videoFile, { type: contentType });
}

export function generatePresignedURL(
  cfg: ApiConfig,
  key: string,
  expireTime: number,
) {
  const presignedURL = cfg.s3Client.presign(key, {
    expiresIn: expireTime,
  });

  return presignedURL;
}
