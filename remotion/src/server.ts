import express from "express";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import path from "path";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "remotion-renderer" });
});

// POST /render
// Body: { session_id, scenes, phrases, render_config }
// Expects images at /shared/session_{id}/images/scene_XX.jpg
// Expects narration at /shared/session_{id}/narration.wav
// Outputs video to /shared/session_{id}/video/lesson_{id}.mp4
app.post("/render", (req, res) => {
  const { session_id, scenes, phrases, render_config } = req.body;

  if (!session_id || !scenes) {
    return res.status(400).json({ error: "session_id and scenes are required" });
  }

  const sessionDir = `/shared/session_${session_id}`;
  const publicDir = path.join(__dirname, "..", "public");
  const outputPath = `${sessionDir}/video/lesson_${session_id}.mp4`;

  try {
    // Clean and recreate public dir to avoid stale files from prior renders
    const fs = require("fs");
    if (existsSync(publicDir)) {
      fs.rmSync(publicDir, { recursive: true, force: true });
    }
    mkdirSync(path.dirname(outputPath), { recursive: true });
    mkdirSync(publicDir, { recursive: true });

    // Copy images from shared dir to public/
    const imagesDir = `${sessionDir}/images`;
    if (existsSync(imagesDir)) {
      const fs = require("fs");
      for (const file of fs.readdirSync(imagesDir)) {
        if (file.endsWith(".jpg") || file.endsWith(".png")) {
          copyFileSync(path.join(imagesDir, file), path.join(publicDir, file));
        }
      }
    }

    // Copy animated clips from shared dir to public/
    const clipsDir = `${sessionDir}/clips`;
    if (existsSync(clipsDir)) {
      const fs = require("fs");
      for (const file of fs.readdirSync(clipsDir)) {
        if (file.endsWith(".mp4")) {
          copyFileSync(path.join(clipsDir, file), path.join(publicDir, file));
        }
      }
    }

    // Copy narration (wav or mp3)
    const narrationWav = `${sessionDir}/narration.wav`;
    const narrationMp3 = `${sessionDir}/narration.mp3`;
    if (existsSync(narrationWav)) {
      copyFileSync(narrationWav, path.join(publicDir, "narration.wav"));
    } else if (existsSync(narrationMp3)) {
      copyFileSync(narrationMp3, path.join(publicDir, "narration.mp3"));
    }

    // Determine audio filename
    const audioFile = existsSync(path.join(publicDir, "narration.wav"))
      ? "narration.wav"
      : "narration.mp3";

    // Write story-scenes.json
    const storyData = {
      title: `Lesson ${session_id}`,
      scenes: scenes,
      phrases: phrases || [],
      audio_file: audioFile,
      render_config: render_config || {
        fps: 30,
        width: 1920,
        height: 1080,
      },
    };
    writeFileSync(
      path.join(publicDir, "story-scenes.json"),
      JSON.stringify(storyData, null, 2)
    );

    // Run remotion render
    console.log(`[render] Starting render for session ${session_id}...`);
    const result = execSync(
      `npx remotion render src/index.ts LessonVideo ${outputPath}`,
      {
        cwd: path.join(__dirname, ".."),
        timeout: 600000, // 10 min timeout
        stdio: "pipe",
      }
    );
    console.log(`[render] Complete: ${outputPath}`);

    res.json({
      status: "complete",
      video_path: outputPath,
      message: result.toString().slice(-200),
    });
  } catch (err: any) {
    console.error(`[render] Failed:`, err.message);
    res.status(500).json({
      status: "error",
      error: err.message,
      stderr: err.stderr?.toString().slice(-500),
    });
  }
});

const PORT = parseInt(process.env.PORT || "3100");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Remotion render API listening on port ${PORT}`);
});
