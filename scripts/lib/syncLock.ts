/**
 * Single-instance lock for long-running sync scripts.
 * Prevents concurrent runs from corrupting shared checkpoint files.
 */
import { open, readFile, unlink } from 'node:fs/promises';

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Acquire an exclusive lock; throws if another live instance holds it. */
export async function acquireSyncLock(lockPath: string): Promise<() => Promise<void>> {
  try {
    const handle = await open(lockPath, 'wx');
    await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`, 'utf8');
    await handle.close();
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    if (code !== 'EEXIST') throw err;

    try {
      const raw = await readFile(lockPath, 'utf8');
      const pid = Number.parseInt(raw.split('\n')[0] ?? '', 10);
      if (Number.isFinite(pid) && isProcessAlive(pid)) {
        throw new Error(`Another sync is already running (pid ${pid}). Stop it before starting a new run.`);
      }
      await unlink(lockPath);
      return acquireSyncLock(lockPath);
    } catch (inner) {
      if (inner instanceof Error && inner.message.includes('Another sync')) throw inner;
      throw new Error(`Could not acquire sync lock at ${lockPath}`);
    }
  }

  return async () => {
    await unlink(lockPath).catch(() => undefined);
  };
}
