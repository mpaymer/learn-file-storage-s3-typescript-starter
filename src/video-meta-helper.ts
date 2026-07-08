export async function getVideoAspectRatio(filePath: string) {
  const proc = Bun.spawn([
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
  ]);
  const stdoutText = await new Response(proc.stdout).text();
  const stderrText = await new Response(proc.stderr).text();

  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(`Error getting video aspect ratio. Error ${stderrText}`);
  }

  const stdoutJson = JSON.parse(stdoutText) as {
    streams: [{ width: number; height: number }];
  };

  const { width, height } = stdoutJson.streams[0];

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
