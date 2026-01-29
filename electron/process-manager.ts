import { ChildProcess, exec } from 'node:child_process';
import * as os from 'node:os';

/**
 * Singleton to track and manage child process lifecycles.
 * Ensures all spawned processes are terminated on app exit.
 */
class ProcessManager {
  private processes = new Set<ChildProcess>();

  /**
   * Register a child process to be tracked.
   * Automatically untracks when the process exits.
   */
  track(proc: ChildProcess) {
    if (!proc || !proc.pid) return;

    this.processes.add(proc);
    console.log(`[ProcessManager] Tracking process PID: ${proc.pid}`);

    proc.on('exit', (code, signal) => {
      console.log(`[ProcessManager] Process ${proc.pid} exited (code: ${code}, signal: ${signal})`);
      this.processes.delete(proc);
    });
  }

  /**
   * Untrack a process manually (e.g. if you kill it yourself).
   */
  untrack(proc: ChildProcess) {
    this.processes.delete(proc);
  }

  /**
   * Terminate all tracked processes.
   * Uses platform-specific commands to kill process trees (taskkill on Windows).
   */
  async killAll() {
    console.log(`[ProcessManager] Killing ${this.processes.size} tracked processes...`);
    const killPromises = Array.from(this.processes).map(async (proc) => {
      if (proc.pid) {
        return this.killProcessTree(proc.pid);
      }
    });

    await Promise.all(killPromises);
    this.processes.clear();
    console.log('[ProcessManager] All processes terminated.');
  }

  /**
   * Kill a process and its children.
   */
  private killProcessTree(pid: number): Promise<void> {
    return new Promise((resolve) => {
      if (os.platform() === 'win32') {
        // Windows: taskkill /F /T /PID <pid>
        // /F - Forcefully terminate
        // /T - Terminate child processes (tree)
        exec(`taskkill /F /T /PID ${pid}`, (error) => {
          if (error) {
            // Ignore "process not found" errors (128) as it might have already exited
            if (!error.message.includes('not found') && !error.message.includes('128')) {
              console.error(`[ProcessManager] Failed to kill PID ${pid}:`, error.message);
            }
          }
          resolve();
        });
      } else {
        // Unix: kill -9 <pid> (Using negative PID kills the process group)
        try {
          process.kill(-pid, 'SIGKILL');
        } catch (e) {
            // Fallback to normal PID kill if process group fails or not supported
            try {
                process.kill(pid, 'SIGKILL');
            } catch (inner) {
                 // ignore
            }
        }
        resolve();
      }
    });
  }
}

export const processManager = new ProcessManager();
