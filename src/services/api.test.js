import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { AnalysisServiceError, analyzeReceiptImage, validateReceiptAnalysisResult } from './api.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function validReceipt(overrides = {}) {
  return {
    id_analisis: 'IMG-test',
    timestamp: '2026-01-01T00:00:00Z',
    es_autentico: 'FALSO',
    nivel_riesgo: 'ALTO',
    color_semaforo: 'ROJO',
    entidad_detectada: 'DaviPlata',
    senales_detectadas: ['Señal uno'],
    url_qr_extraida: null,
    qr_dominio_legitimo: null,
    explicacion_ciudadana: 'Se encontró una señal de alerta.',
    audio_guion: 'Peligro. Verifique con su banco.',
    recomendaciones: ['No entregue el producto.', 'Confirme en la aplicación oficial.'],
    evidencia_criptografica: {
      hash_actual: 'hash-actual',
      hash_anterior: 'hash-anterior',
      cadena_valida: true,
      qr_payload_url: 'https://example.test/verify',
    },
    datos_abiertos_referencia: { fuente: 'referencia', coincidencias_similares_mes: 0 },
    ...overrides,
  };
}

function testImage() {
  return new Blob(['image bytes'], { type: 'image/jpeg' });
}

async function rejectsAs(promise, kind, status) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof AnalysisServiceError);
    assert.equal(error.kind, kind);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

test('el contrato acepta cinco señales', () => {
  assert.deepEqual(
    validateReceiptAnalysisResult(validReceipt({ senales_detectadas: ['1', '2', '3', '4', '5'] })),
    { valid: true },
  );
});

test('el contrato rechaza seis señales', () => {
  const result = validateReceiptAnalysisResult(validReceipt({ senales_detectadas: ['1', '2', '3', '4', '5', '6'] }));
  assert.equal(result.valid, false);
  assert.match(result.reason, /máximo de señales/);
});

test('una respuesta HTTP 200 con JSON que incumple el contrato se clasifica invalid-response', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify(validReceipt({ recomendaciones: ['solo una'] })), { status: 200 });
  await rejectsAs(analyzeReceiptImage(testImage()), 'invalid-response');
});

test('un cuerpo que no es JSON se clasifica invalid-json sin exponer el cuerpo', async () => {
  globalThis.fetch = async () => new Response('sensitive server body', { status: 200 });
  await assert.rejects(analyzeReceiptImage(testImage()), (error) => {
    assert.equal(error.kind, 'invalid-json');
    assert.doesNotMatch(error.message, /sensitive server body/);
    return true;
  });
});

test('una respuesta HTTP no exitosa conserva solo el estado, no el cuerpo', async () => {
  globalThis.fetch = async () => new Response('sensitive server body', { status: 503 });
  await assert.rejects(analyzeReceiptImage(testImage()), (error) => {
    assert.equal(error.kind, 'http');
    assert.equal(error.status, 503);
    assert.doesNotMatch(error.message, /sensitive server body/);
    return true;
  });
});

test('un rechazo de fetch se clasifica como error de conexión', async () => {
  globalThis.fetch = async () => { throw new TypeError('network failure'); };
  await rejectsAs(analyzeReceiptImage(testImage()), 'connection');
});

test('un aborto por timeout se clasifica como timeout', async () => {
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  await rejectsAs(analyzeReceiptImage(testImage(), undefined, 'Bosa Central', { timeoutMs: 5 }), 'timeout');
});
