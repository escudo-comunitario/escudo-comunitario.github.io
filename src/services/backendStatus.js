import { getBackendOpenApiUrl } from './api.js';

export const BACKEND_CHECK_TIMEOUT_MS = 60_000;
export const BACKEND_CHECK_INTERVAL_MS = 55_000;

function isOpenApiDocument(document) {
  return Boolean(
    document
    && typeof document === 'object'
    && typeof document.openapi === 'string'
    && document.paths
    && typeof document.paths === 'object'
    && !Array.isArray(document.paths)
    && Object.keys(document.paths).length > 0,
  );
}

export async function checkBackendAvailability({
  signal,
  timeoutMs = BACKEND_CHECK_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  apiBaseUrl,
} = {}) {
  if (typeof fetchImpl !== 'function') return false;

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(getBackendOpenApiUrl(apiBaseUrl), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok || timedOut) return false;
    const document = await response.json();
    return !timedOut && !signal?.aborted && isOpenApiDocument(document);
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function createBackendStatusMonitor({
  onStatus = () => {},
  check = checkBackendAvailability,
  intervalMs = BACKEND_CHECK_INTERVAL_MS,
  schedule = globalThis.setTimeout,
  cancelSchedule = globalThis.clearTimeout,
} = {}) {
  let status = 'connecting';
  let running = false;
  let inFlight = false;
  let restartRequested = false;
  let timer = null;
  let requestId = 0;
  let activeController = null;

  const publish = (nextStatus) => {
    status = nextStatus;
    onStatus(nextStatus);
  };

  const runCheck = async () => {
    if (!running || inFlight) return;
    inFlight = true;
    const currentRequestId = ++requestId;
    const controller = new AbortController();
    activeController = controller;
    publish('connecting');

    try {
      const connected = await check({ signal: controller.signal });
      if (running && currentRequestId === requestId) publish(connected ? 'connected' : 'offline');
    } catch {
      if (running && currentRequestId === requestId) publish('offline');
    } finally {
      if (activeController === controller) activeController = null;
      inFlight = false;
      if (running && restartRequested) {
        restartRequested = false;
        void runCheck();
      } else if (running && currentRequestId === requestId) {
        timer = schedule(() => {
          timer = null;
          void runCheck();
        }, intervalMs);
      }
    }
  };

  return {
    getStatus: () => status,
    start() {
      if (running) return;
      running = true;
      if (inFlight) restartRequested = true;
      else void runCheck();
    },
    stop() {
      if (!running && !activeController) return;
      running = false;
      restartRequested = false;
      requestId += 1;
      if (timer !== null) cancelSchedule(timer);
      timer = null;
      activeController?.abort();
      activeController = null;
    },
  };
}
