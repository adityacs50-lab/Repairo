import { readFile } from "node:fs/promises";
import path from "node:path";

/** Read markdown from the repo root (docs/ or DEPLOY.md) at build/request time. */
export async function loadRepoMarkdown(relativePath: string): Promise<string> {
  const filePath = path.join(process.cwd(), relativePath);
  return readFile(filePath, "utf8");
}
