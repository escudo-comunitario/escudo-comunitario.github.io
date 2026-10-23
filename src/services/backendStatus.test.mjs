import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBackendOpenApiUrl } from './api.js';
import {
  BACKEND_CHECK_INTERVAL_MS,
  checkBackendAvailability,
  createBackendStatusMonitor,
} from './backendStatus.js';

const openApiDocument = { openapi: '3.1.0', paths: { '/api/analyze': {} } };

test('construye OpenAPI en la raíz del host y no bajo /api', () => {
  assert.equal(getBackendOpenApiUrl('https://api.example.test/api/'), 'https://api.example.test/openapi.json');
});

test('marca conectado solo si recibe un documento OpenAPI válido por HTTP 200', async () => {
  let requestedUrl;
  const connected = await checkBackendAvailability({
    apiBaseUrl: 'https://api.example.test/api',
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.Accept, 'application/json');
      return new Response(JSON.stringify(openApiDocument), { status: 200 });
    },
  });

  assert.equal(connected, true);
  assert.equal(requestedUrl, 'https://api.example.test/openapi.json');
});

test('trata HTTP no exitoso y JSON inválido como sin conexión', async () => {
  assert.equal(await checkBackendAvailability({ fetchImpl: async () => new Response('{}', { status: 503 }) }), false);
  assert.equal(await checkBackendAvailability({ fetchImpl: async () => new Response('{', { status: 200 }) }), false);
  assert.equal(await checkBackendAvailability({ fetchImpl: async () => new Response(JSON.stringify({ openapi: '3.1.0' }), { status: 200 }) }), false);
  assert.equal(await checkBackendAvailability({ fetchImpl: async () => new Response(JSON.stringify({ openapi: '3.1.0', paths: {} }), { status: 200 }) }), false);
  assert.equal(await checkBackendAvailability({ fetchImpl: async () => { throw new TypeError('network failure'); } }), false);
});

test('un timeout aborta la comprobación y produce sin conexión', async () => {
  let wasAborted = false;
  const connected = await checkBackendAvailability({
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        wasAborted = true;
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }),
  });

  assert.equal(connected, false);
  assert.equal(wasAborted, true);
});

test('el indicador mantiene conectando mientras espera y recupera conexión en el siguiente ciclo', async () => {
  const statuses = [];
  const scheduled = [];
  let calls = 0;
  const monitor = createBackendStatusMonitor({
    intervalMs: BACKEND_CHECK_INTERVAL_MS,
    onStatus: (status) => statuses.push(status),
    check: async () => (++calls > 1),
    schedule: (callback, delay) => {
      const timer = { callback, delay };
      scheduled.push(timer);
      return timer;
    },
    cancelSchedule: (timer) => { timer.cancelled = true; },
  });

  assert.equal(monitor.getStatus(), 'connecting');
  monitor.start();
  monitor.start();
  assert.equal(monitor.getStatus(), 'connecting');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(monitor.getStatus(), 'offline');
  assert.equal(calls, 1);
  assert.equal(scheduled[0].delay, BACKEND_CHECK_INTERVAL_MS);

  scheduled[0].callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(monitor.getStatus(), 'connected');
  assert.deepEqual(statuses, ['connecting', 'offline', 'connecting', 'connected']);
  monitor.stop();
  assert.equal(scheduled[1].cancelled, true);
});

test('detener el monitor aborta una comprobación pendiente sin publicar su resultado', async () => {
  let signalSeen;
  const statuses = [];
  const monitor = createBackendStatusMonitor({
    onStatus: (status) => statuses.push(status),
    check: ({ signal }) => new Promise((_resolve, reject) => {
      signalSeen = signal;
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }),
  });

  monitor.start();
  monitor.stop();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(signalSeen.aborted, true);
  assert.deepEqual(statuses, ['connecting']);
});

test('reiniciar el monitor durante una petición abortada inicia una única comprobación nueva', async () => {
  const statuses = [];
  let calls = 0;
  const monitor = createBackendStatusMonitor({
    onStatus: (status) => statuses.push(status),
    check: ({ signal }) => {
      calls += 1;
      if (calls === 1) {
        return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
      }
      return Promise.resolve(true);
    },
  });

  monitor.start();
  monitor.stop();
  monitor.start();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.equal(monitor.getStatus(), 'connected');
  monitor.stop();
});
