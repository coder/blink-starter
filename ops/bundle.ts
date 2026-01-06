import { execSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const ROOT_DIR = join(import.meta.dirname, "..");

// Build the project
execSync("bun blink build", { cwd: ROOT_DIR, stdio: "inherit" });

// Get all git-tracked files
const gitFiles = execSync("git ls-files", { cwd: ROOT_DIR, encoding: "utf-8" })
  .trim()
  .split("\n")
  .filter(
    (f) =>
      !f.startsWith("ops/") &&
      !f.startsWith("out/") &&
      !f.startsWith(".github/")
  );

// Create a temp file with the list of files to include
const tempDir = mkdtempSync(join(tmpdir(), "bundle-"));
const fileListPath = join(tempDir, "files.txt");

// Add git-tracked files (excluding ops/, out/, .github/) and .blink/build folder
const filesToInclude = [...gitFiles, ".blink/build"];
writeFileSync(fileListPath, filesToInclude.join("\n"));

const outputDir = join(ROOT_DIR, "out");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "bundle.tar.gz");

// Create tar.gz archive
execSync(`tar -czf "${outputPath}" -T "${fileListPath}"`, {
  cwd: ROOT_DIR,
  stdio: "inherit",
});

// Cleanup temp files
rmSync(tempDir, { recursive: true });

console.log(`Bundle created: ${outputPath}`);
