import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const SRC_DIR = new URL('../src/', import.meta.url);

export function createTempHome(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

export function cleanupTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export async function importFreshModule<T>(relativePath: string, homeDir?: string): Promise<T> {
  const previousHome = process.env.HOME;
  if (homeDir) {
    process.env.HOME = homeDir;
  }

  try {
    const moduleUrl = new URL(relativePath, SRC_DIR);
    return (await import(`${pathToFileURL(moduleUrl.pathname).href}?t=${Date.now()}-${Math.random()}`)) as T;
  } finally {
    if (homeDir) {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  }
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export interface BackupHandle {
  originalPath: string;
  backupPath: string | null;
}

export function backupPath(path: string): BackupHandle {
  if (!existsSync(path)) {
    return { originalPath: path, backupPath: null };
  }

  const backupPath = `${path}.codex-backup-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  renameSync(path, backupPath);
  return { originalPath: path, backupPath };
}

export function restorePath(handle: BackupHandle): void {
  rmSync(handle.originalPath, { recursive: true, force: true });
  if (handle.backupPath) {
    ensureDir(join(handle.originalPath, '..'));
    renameSync(handle.backupPath, handle.originalPath);
  }
}

export function getOpenclawDir(): string {
  return join(homedir(), '.openclaw');
}

export function getOpenclawAgentsDir(): string {
  return join(homedir(), '.openclaw-agents');
}
