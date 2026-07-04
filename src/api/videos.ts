import { respondWithJSON } from "./json";

import { type ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import { getBearerToken, validateJWT } from "../auth";
import { getVideo, updateVideo } from "../db/videos";
import path from "path";
import { uploadVideoToS3 } from "../s3";
import { rm } from "fs/promises";

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
  const MAX_UPLOAD_SIZE = 1 << 30; //1 GB

  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video Id");
  }

  const token = getBearerToken(req.headers);
  const userId = validateJWT(token, cfg.jwtSecret);

  console.log("uploading video", videoId, "by user", userId);

  const video = getVideo(cfg.db, videoId);
  if (!video) {
    throw new NotFoundError("Couldn't find video");
  }

  if (video.userID !== userId) {
    throw new UserForbiddenError("Not authorized to upload this video");
  }

  const formData = await req.formData();
  const file = formData.get("video");

  if (!(file instanceof File)) {
    throw new BadRequestError("video file is missing");
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError(
      `Maximum file size is 1 GB. File is ${file.size >> 30} MB.`,
    );
  }

  const mediaType = file.type;

  if (mediaType !== "video/mp4") {
    throw new BadRequestError("Invalid file type. Only mp4 allowed.");
  }

  // create a temp file to disk -- delete later
  const tempFilePath = path.join("/tmp", `${videoId}.mp4`);
  await Bun.write(tempFilePath, file);

  // put the object into S3
  // use the s3 client we created in the config object
  let s3FileKey = `${videoId}.mp4`;
  await uploadVideoToS3(cfg, s3FileKey, tempFilePath, mediaType);

  video.videoURL = `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${s3FileKey}`;

  updateVideo(cfg.db, video);

  await Promise.all([rm(tempFilePath, { force: true })]);

  return respondWithJSON(200, video);
}
