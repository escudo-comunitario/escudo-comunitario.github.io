import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalysisServiceError,
  analyzeMessage,
  getCommunityStats,
  reportIncident,
  validateAnalysisResult,
  verifyIncidentIntegrity,
} from './api.js';

const originalFetch = globalThis.fetch;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('analysis sends the backend request shape and accepts its response', async () => {
  let request;
  const result = {
    nivel_riesgo: 'MEDIO',
    color_semaforo: 'AMARILLO',
    explicacion_ciudadana: 'Revise el mensaje con cuidado.',
  };
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response(result);
  };

  assert.deepEqual(await analyzeMessage('  revise este mensaje  '), result);
  assert.equal(request.url, 'http://localhost:8000/api/analyze');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { texto: 'revise este mensaje', upz: 'Bosa Central' });
});

test('analysis rejects messages above the backend limit without sending them', async () => {
  let requested = false;
  globalThis.fetch = async () => { requested = true; return response({}); };

  await assert.rejects(
    analyzeMessage('a'.repeat(2001)),
    (error) => error instanceof AnalysisServiceError && error.kind === 'validation',
  );
  assert.equal(requested, false);
});

test('analysis preserves request cancellation and reports network failures', async () => {
  const controller = new AbortController();
  let passedSignal;
  globalThis.fetch = async (_url, options) => {
    passedSignal = options.signal;
    return response({ nivel_riesgo: 'BAJO', color_semaforo: 'VERDE', explicacion_ciudadana: 'Sin señales.' });
  };
  await analyzeMessage('mensaje', 'Bosa Central', { signal: controller.signal });
  assert.equal(passedSignal, controller.signal);

  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(analyzeMessage('mensaje'), (error) => error.kind === 'connection');
});

test('report sends only the payload and UPZ expected by the backend', async () => {
  let request;
  const receipt = { status: 'registrado', hash: 'a'.repeat(64), id: 'REP-2026-BOSA-0001' };
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response(receipt);
  };

  assert.deepEqual(await reportIncident({ categoria: 'Llamada sospechosa' }, 'Tintal Sur'), receipt);
  assert.equal(request.url, 'http://localhost:8000/api/report');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), {
    payload: { categoria: 'Llamada sospechosa' },
    upz: 'Tintal Sur',
  });
});

test('integrity checks the chain endpoint without pretending to verify an individual ID', async () => {
  let requestedUrl;
  const result = { integro: true, bloques_auditados: 3, registro_alterado: null };
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return response(result);
  };

  assert.deepEqual(await verifyIncidentIntegrity(), result);
  assert.equal(requestedUrl, 'http://localhost:8000/api/verify-integrity');
});

test('statistics reads aggregate counts and example history from the backend', async () => {
  let requestedUrl;
  const result = { por_modalidad: { 'Llamada sospechosa': 1 }, por_upz: { 'Bosa Central': 1 }, historico_bosa: {} };
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return response(result);
  };

  assert.deepEqual(await getCommunityStats(), result);
  assert.equal(requestedUrl, 'http://localhost:8000/api/stats');
});

test('non-success responses become service errors and malformed analysis is rejected', async () => {
  globalThis.fetch = async () => response({ detail: 'invalid' }, 422);
  await assert.rejects(analyzeMessage('mensaje válido'), (error) => error.kind === 'service');

  globalThis.fetch = async () => new Response('not json', { status: 200 });
  await assert.rejects(analyzeMessage('mensaje válido'), (error) => error.kind === 'invalid-response');

  assert.equal(validateAnalysisResult({ nivel_riesgo: 'ALTO', color_semaforo: 'ROJO' }).valid, false);
});
