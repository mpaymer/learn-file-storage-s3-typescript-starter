import path from "path";

export async function getVideoAspectRatio(filePath: string) {
  const proc = Bun.spawn(
    [
      "ffprobe",
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      filePath,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  const stdoutText = await new Response(proc.stdout).text();
  const stderrText = await new Response(proc.stderr).text();

  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(`Error getting video aspect ratio. Error ${stderrText}`);
  }

  const stdoutJson = JSON.parse(stdoutText) as {
    streams: { width?: number; height?: number }[];
  };

  if (!stdoutJson.streams || stdoutJson.streams.length === 0) {
    throw new Error("No video streams found");
  }

  const { width, height } = stdoutJson.streams[0];

  if (!width || !height) {
    throw new Error(
      "Malformed video meta data. Missing width or height of video.",
    );
  }

  let aspectRatioName: "landscape" | "portrait" | "other";

  if (width > height) {
    aspectRatioName = "landscape";
  } else if (height > width) {
    aspectRatioName = "portrait";
  } else {
    aspectRatioName = "other";
  }

  return aspectRatioName;
}

export async function processVideoForFastStart(inputFilePath: string) {
  // file path looks like /tmp/videoId.mp4
  const dirName = path.dirname(inputFilePath);
  const fileExt = path.extname(inputFilePath);
  const baseName = path.basename(inputFilePath, fileExt);

  const processedFilename = `${baseName}.processed${fileExt}`;
  const outputFilePath = path.join(dirName, processedFilename);

  const proc = Bun.spawn(
    [
      "ffmpeg",
      "-y",
      "-i",
      inputFilePath,
      "-movflags",
      "+faststart",
      "-map_metadata",
      "0",
      "-codec",
      "copy",
      "-f",
      "mp4",
      outputFilePath,
    ],
    { stderr: "pipe" },
  );

  const stderrText = await new Response(proc.stderr).text();

  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(
      `Error running ffmpeg copy to fast start mp4 file. Error ${stderrText}`,
    );
  }

  if (!(await Bun.file(outputFilePath).exists())) {
    throw new Error(
      "ffmpeg exited successfully but output file does not exist",
    );
  }

  return outputFilePath;
}
