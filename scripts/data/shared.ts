import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const projectRoot = process.cwd();
export const rawDir = path.join(projectRoot, "data", "raw");
export const mockRawDir = path.join(projectRoot, "data", "mock", "raw");
export const generatedFile = path.join(projectRoot, "frontend", "src", "fixtures", "generated", "referenceCatalog.ts");

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live reference-data sync.`);
  return value;
}
