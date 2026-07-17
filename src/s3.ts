import type { ApiConfig } from "./config";

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
