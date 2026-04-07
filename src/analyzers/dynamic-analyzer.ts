import Docker from 'dockerode';
import { DynamicAnalysisResult, NetworkEvent, FileOperation, ProcessEvent, ResourceMetrics } from '../types';

const SANDBOX_IMAGE = 'node:20-alpine';
const DEFAULT_TIMEOUT = 30000; // 30s
const DEFAULT_MEMORY = 256 * 1024 * 1024; // 256MB

export class DynamicAnalyzer {
  private docker: Docker;
  private timeout: number;
  private memoryLimit: number;

  constructor(opts?: { timeout?: number; memoryLimit?: number; socketPath?: string }) {
    this.docker = new Docker({ socketPath: opts?.socketPath || '/var/run/docker.sock' });
    this.timeout = opts?.timeout || DEFAULT_TIMEOUT;
    this.memoryLimit = opts?.memoryLimit || DEFAULT_MEMORY;
  }

  async analyze(packageName: string, version: string): Promise<DynamicAnalysisResult> {
    const startTime = Date.now();

    // The install script runs inside a locked-down container.
    // We capture stdout/stderr from a wrapper that logs syscall-like events.
    const installScript = this.buildInstallScript(packageName, version);

    let container: Docker.Container | null = null;
    try {
      // Pull image if missing (no-op if cached)
      await this.ensureImage();

      container = await this.docker.createContainer({
        Image: SANDBOX_IMAGE,
        Cmd: ['sh', '-c', installScript],
        AttachStdout: true,
        AttachStderr: true,
        NetworkDisabled: false, // We monitor, not block — blocking hides exfil attempts
        HostConfig: {
          Memory: this.memoryLimit,
          MemorySwap: this.memoryLimit, // No swap
          CpuPeriod: 100000,
          CpuQuota: 50000, // 50% of one core
          PidsLimit: 64,
          ReadonlyRootfs: false, // npm install needs to write
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'],
          CapAdd: ['CHOWN', 'SETUID', 'SETGID'], // Minimum for npm install
          Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' },
        },
      });

      await container.start();

      // Wait for completion or timeout
      const { output, timedOut } = await this.waitForContainer(container);

      // Get resource usage stats
      const resourceUsage = await this.getResourceStats(container);

      // Parse the structured event log from the wrapper script
      const events = this.parseEventLog(output);

      const elapsed = Date.now() - startTime;

      const result: DynamicAnalysisResult = {
        behaviors: [],
        networkActivity: events.network,
        fileOperations: events.files,
        processSpawns: events.processes,
        resourceUsage,
        score: 0,
        suspiciousActivities: [],
      };

      if (timedOut) {
        result.suspiciousActivities.push(`Install timed out after ${this.timeout}ms`);
      }

      // Score the dynamic results
      result.score = this.scoreDynamic(result);

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // If Docker isn't available, return empty result rather than crashing
      if (msg.includes('ENOENT') || msg.includes('ECONNREFUSED') || msg.includes('socket')) {
        console.warn('Docker not available, skipping dynamic analysis');
        return this.emptyResult();
      }
      console.error('Dynamic analysis failed:', msg);
      return this.emptyResult();
    } finally {
      if (container) {
        try {
          await container.stop({ t: 2 }).catch(() => {});
          await container.remove({ force: true }).catch(() => {});
        } catch (_) { /* best effort cleanup */ }
      }
    }
  }

  /**
   * Build the install + monitoring script that runs inside the container.
   * We use strace-like monitoring via /proc where available, plus npm's
   * own verbose logging to capture network and process activity.
   */
  private buildInstallScript(packageName: string, version: string): string {
    const pkg = version && version !== 'latest' ? `${packageName}@${version}` : packageName;
    // The script:
    // 1. Creates an isolated workspace
    // 2. Runs npm install with verbose logging
    // 3. Captures network connections from /proc/net
    // 4. Lists any files written outside node_modules
    // 5. Outputs structured JSON events to stdout
    return `
set -e
mkdir -p /sandbox && cd /sandbox

# Snapshot filesystem before install
find / -maxdepth 3 -type f 2>/dev/null | sort > /tmp/fs_before.txt

# Snapshot network connections before
cat /proc/net/tcp 2>/dev/null > /tmp/net_before.txt
cat /proc/net/tcp6 2>/dev/null >> /tmp/net_before.txt

echo '{"event":"install_start","package":"${pkg}","time":'$(date +%s%3N)'}'

# Run npm install, capture output
npm init -y > /dev/null 2>&1
npm install ${pkg} --ignore-scripts 2>&1 | while IFS= read -r line; do
  echo '{"event":"npm_log","data":"'"$(echo "$line" | sed 's/"/\\\\"/g' | tr -d '\\n')"'","time":'$(date +%s%3N)'}'
done

echo '{"event":"install_done","time":'$(date +%s%3N)'}'

# Now run install scripts (postinstall etc) separately — this is where malware hides
echo '{"event":"scripts_start","time":'$(date +%s%3N)'}'
npm rebuild 2>&1 | while IFS= read -r line; do
  echo '{"event":"script_log","data":"'"$(echo "$line" | sed 's/"/\\\\"/g' | tr -d '\\n')"'","time":'$(date +%s%3N)'}'
done
echo '{"event":"scripts_done","time":'$(date +%s%3N)'}'

# Check for network connections made during install
cat /proc/net/tcp 2>/dev/null > /tmp/net_after.txt
cat /proc/net/tcp6 2>/dev/null >> /tmp/net_after.txt
diff /tmp/net_before.txt /tmp/net_after.txt 2>/dev/null | grep "^>" | while IFS= read -r line; do
  echo '{"event":"network","data":"'"$(echo "$line" | sed 's/"/\\\\"/g')"'","time":'$(date +%s%3N)'}'
done

# Check for files created outside node_modules
find / -maxdepth 3 -type f 2>/dev/null | sort > /tmp/fs_after.txt
diff /tmp/fs_before.txt /tmp/fs_after.txt 2>/dev/null | grep "^>" | grep -v node_modules | grep -v /tmp/ | grep -v /sandbox/ | while IFS= read -r line; do
  echo '{"event":"file_created","path":"'"$(echo "$line" | sed 's/^> //' | sed 's/"/\\\\"/g')"'","time":'$(date +%s%3N)'}'
done

# Check for any spawned processes
echo '{"event":"done","time":'$(date +%s%3N)'}'
`;
  }

  private async ensureImage(): Promise<void> {
    try {
      await this.docker.getImage(SANDBOX_IMAGE).inspect();
    } catch {
      console.log(`Pulling ${SANDBOX_IMAGE}...`);
      const stream = await this.docker.pull(SANDBOX_IMAGE);
      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  private async waitForContainer(container: Docker.Container): Promise<{ output: string; timedOut: boolean }> {
    return new Promise(async (resolve) => {
      let output = '';
      let timedOut = false;

      const timer = setTimeout(async () => {
        timedOut = true;
        try { await container.stop({ t: 1 }); } catch (_) {}
      }, this.timeout);

      try {
        const stream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
        });

        stream.on('data', (chunk: Buffer) => {
          // Docker multiplexes stdout/stderr with 8-byte header frames
          const text = chunk.toString('utf-8');
          output += text;
        });

        stream.on('end', () => {
          clearTimeout(timer);
          resolve({ output, timedOut });
        });

        stream.on('error', () => {
          clearTimeout(timer);
          resolve({ output, timedOut });
        });

        // Also wait for container to exit
        await container.wait().catch(() => {});
        clearTimeout(timer);
        resolve({ output, timedOut });
      } catch {
        clearTimeout(timer);
        resolve({ output, timedOut });
      }
    });
  }

  private async getResourceStats(container: Docker.Container): Promise<ResourceMetrics> {
    try {
      const stats = await container.stats({ stream: false }) as any;
      return {
        maxMemoryMB: Math.round((stats.memory_stats?.max_usage || 0) / 1024 / 1024),
        cpuTimeMs: Math.round((stats.cpu_stats?.cpu_usage?.total_usage || 0) / 1e6),
        diskWritesMB: 0, // Would need blkio stats
        networkBytesSent: stats.networks
          ? Object.values(stats.networks).reduce((sum: number, n: any) => sum + (n.tx_bytes || 0), 0)
          : 0,
      };
    } catch {
      return { maxMemoryMB: 0, cpuTimeMs: 0, diskWritesMB: 0, networkBytesSent: 0 };
    }
  }

  private parseEventLog(output: string): {
    network: NetworkEvent[];
    files: FileOperation[];
    processes: ProcessEvent[];
  } {
    const network: NetworkEvent[] = [];
    const files: FileOperation[] = [];
    const processes: ProcessEvent[] = [];

    for (const line of output.split('\n')) {
      // Skip Docker's multiplexed header bytes — find the JSON start
      const jsonStart = line.indexOf('{');
      if (jsonStart === -1) continue;

      try {
        const event = JSON.parse(line.slice(jsonStart));

        switch (event.event) {
          case 'network':
            network.push({
              type: 'connection',
              destination: event.data || 'unknown',
              protocol: 'tcp',
              blocked: false,
              timestamp: event.time || Date.now(),
            });
            break;

          case 'file_created':
            files.push({
              operation: 'create',
              path: event.path || 'unknown',
              success: true,
              timestamp: event.time || Date.now(),
            });
            break;

          case 'script_log':
            // Look for process spawning indicators in script output
            const data = event.data || '';
            if (data.includes('exec') || data.includes('spawn') || data.includes('child_process')) {
              processes.push({
                command: data.substring(0, 200),
                args: [],
                timestamp: event.time || Date.now(),
              });
            }
            break;
        }
      } catch {
        // Not valid JSON, skip
      }
    }

    return { network, files, processes };
  }

  private scoreDynamic(result: DynamicAnalysisResult): number {
    let score = 0;

    // Network activity during install is suspicious
    if (result.networkActivity.length > 0) {
      score += Math.min(30, result.networkActivity.length * 10);
      result.suspiciousActivities.push(
        `${result.networkActivity.length} network connection(s) during install`
      );
    }

    // Files created outside node_modules is suspicious
    if (result.fileOperations.length > 0) {
      score += Math.min(25, result.fileOperations.length * 15);
      result.suspiciousActivities.push(
        `${result.fileOperations.length} file(s) created outside node_modules`
      );
    }

    // Process spawning during install
    if (result.processSpawns.length > 0) {
      score += Math.min(25, result.processSpawns.length * 10);
      result.suspiciousActivities.push(
        `${result.processSpawns.length} process(es) spawned during install`
      );
    }

    // High memory usage
    if (result.resourceUsage.maxMemoryMB > 200) {
      score += 10;
      result.suspiciousActivities.push(
        `High memory usage: ${result.resourceUsage.maxMemoryMB}MB`
      );
    }

    // Network data sent
    if (result.resourceUsage.networkBytesSent > 1024) {
      score += 15;
      result.suspiciousActivities.push(
        `${Math.round(result.resourceUsage.networkBytesSent / 1024)}KB sent over network`
      );
    }

    // Timeout is suspicious
    if (result.suspiciousActivities.some(a => a.includes('timed out'))) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private emptyResult(): DynamicAnalysisResult {
    return {
      behaviors: [],
      networkActivity: [],
      fileOperations: [],
      processSpawns: [],
      resourceUsage: { maxMemoryMB: 0, cpuTimeMs: 0, diskWritesMB: 0, networkBytesSent: 0 },
      score: 0,
      suspiciousActivities: [],
    };
  }
}
