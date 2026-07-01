import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, UserForbiddenError } from "./errors";

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  // TODO: implement the upload here
  const formData = await req.formData();
  const file = formData.get("thumbnail");
  if (!(file instanceof File)) {
    throw new BadRequestError("Thumbnail file is missing");
  }

  const MAX_UPLOAD_SIZE = 10 << 20; // 10 MB

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError(
      `Maximum file size is 10 MB. File is ${file.size >> 20} MB.`,
    );
  }

  const mediaType = file.type;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64BufferString = buffer.toString("base64");

  const dataUrl = `data:${mediaType};base64,${base64BufferString}`;

  const video = getVideo(cfg.db, videoId);

  if (!video) {
    throw new UserForbiddenError(
      `User (ID ${userID}) is not authorized to edit video (ID ${videoId})`,
    );
  }

  video.thumbnailURL = dataUrl;

  updateVideo(cfg.db, video);

  return respondWithJSON(200, video);
}
