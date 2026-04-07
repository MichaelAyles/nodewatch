import { useState, useCallback, useEffect, useRef } from 'react';
import { api, JobStatusResponse, JobResultResponse, AnalysisResult } from '../api';

export type JobPhase = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export interface TrackedJob {
  jobId: string;
  phase: JobPhase;
  progress: number;
  stage?: string;
  packageName: string;
  version: string;
  result?: AnalysisResult;
  error?: string;
  startedAt: number;
}

export function useJobTracker() {
  const [job, setJob] = useState<TrackedJob | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const status: JobStatusResponse = await api.getJobStatus(jobId);

      if (status.status === 'completed') {
        stopPolling();
        const resultResp: JobResultResponse = await api.getJobResult(jobId);
        setJob(prev => prev ? {
          ...prev,
          phase: 'completed',
          progress: 100,
          result: resultResp.result,
        } : null);
        return;
      }

      if (status.status === 'failed') {
        stopPolling();
        setJob(prev => prev ? {
          ...prev,
          phase: 'failed',
          error: status.failedReason || 'Analysis failed',
        } : null);
        return;
      }

      const progress = typeof status.progress === 'number'
        ? status.progress
        : (status.progress as any)?.percentage || 0;

      const stage = typeof status.progress === 'object' && status.progress !== null
        ? (status.progress as any)?.stage
        : undefined;

      setJob(prev => prev ? {
        ...prev,
        phase: status.status === 'active' ? 'running' : 'queued',
        progress,
        stage,
      } : null);
    } catch (err) {
      // Don't stop polling on transient errors
      console.error('Poll error:', err);
    }
  }, [stopPolling]);

  const startAnalysis = useCallback(async (packageName: string, version?: string) => {
    stopPolling();
    const versionStr = version || 'latest';

    setJob({
      jobId: '',
      phase: 'queued',
      progress: 0,
      packageName,
      version: versionStr,
      startedAt: Date.now(),
    });

    try {
      const resp = await api.analyze(packageName, version);
      setJob(prev => prev ? { ...prev, jobId: resp.jobId } : null);

      pollingRef.current = setInterval(() => pollJob(resp.jobId), 1500);
    } catch (err: any) {
      setJob(prev => prev ? {
        ...prev,
        phase: 'failed',
        error: err.message || 'Failed to start analysis',
      } : null);
    }
  }, [pollJob, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
  }, [stopPolling]);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  return { job, startAnalysis, reset };
}
