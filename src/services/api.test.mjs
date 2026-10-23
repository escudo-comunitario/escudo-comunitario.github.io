import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalysisServiceError,
  analyzeReceiptImage,
  analyzeMessage,
  getCommunityStats,
  reportIncident,
  validateReceiptAnalysisResult,
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
  assert.deepEqual(JSON.parse(request.options.body), { texto: 'revise este mensaje', upz: 'Bosa Central', modo: 'texto' });
});

test('analysis sends voice mode when the user dictated the message', async () => {
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return response({ nivel_riesgo: 'MEDIO', color_semaforo: 'AMARILLO', explicacion_ciudadana: 'Revise con cuidado.' });
  };

  await analyzeMessage('mensaje dictado', 'Bosa Central', { modo: 'voz' });
  assert.equal(requestBody.modo, 'voz');
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

const receiptResult = {
  id_analisis: 'IMG-2026-BOSA-0001',
  timestamp: '2026-10-22T12:00:00Z',
  es_autentico: 'SOSPECHOSO',
  nivel_riesgo: 'MEDIO',
  color_semaforo: 'AMARILLO',
  entidad_detectada: 'Nequi',
  senales_detectadas: ['No fue posible analizar la imagen automáticamente'],
  url_qr_extraida: null,
  qr_dominio_legitimo: null,
  explicacion_ciudadana: 'No pudimos verificar el comprobante ahora.',
  audio_guion: 'Precaución. Confirme este comprobante directamente con su banco.',
  recomendaciones: ['Llame a su banco por el número oficial.', 'Confirme el pago en su aplicación.'],
  evidencia_criptografica: { hash_actual: 'a'.repeat(64), hash_anterior: '0'.repeat(64), cadena_valida: true, qr_payload_url: 'https://escudo-bosa.gov.co/verify?id=IMG-2026-BOSA-0001' },
  datos_abiertos_referencia: { fuente: 'Datos abiertos', coincidencias_similares_mes: 0 },
};

function imageFile(name = 'comprobante.jpg', type = 'image/jpeg', size = 128) {
  return new File([new Uint8Array(size)], name, { type });
}

test('receipt analysis sends the exact multipart fields without setting Content-Type', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response(receiptResult);
  };

  assert.deepEqual(await analyzeReceiptImage(imageFile(), 'Me enviaron este comprobante.', 'Tintal Sur'), receiptResult);
  assert.equal(request.url, 'http://localhost:8000/api/analyze-image');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers, undefined);
  assert.ok(request.options.body instanceof FormData);
  assert.equal(request.options.body.get('imagen').name, 'comprobante.jpg');
  assert.equal(request.options.body.get('texto'), 'Me enviaron este comprobante.');
  assert.equal(request.options.body.get('upz'), 'Tintal Sur');
});

test('receipt analysis can omit citizen context while supplying the backend-required neutral text', async () => {
  let submittedText;
  globalThis.fetch = async (_url, options) => {
    submittedText = options.body.get('texto');
    return response(receiptResult);
  };

  await analyzeReceiptImage(imageFile(), undefined);
  assert.equal(submittedText, 'Revisión visual solicitada. Sin contexto adicional del ciudadano.');
});

test('receipt response validation accepts the backend schema and rejects missing or inconsistent data', async () => {
  assert.deepEqual(validateReceiptAnalysisResult(receiptResult), { valid: true });
  assert.equal(validateReceiptAnalysisResult({ ...receiptResult, evidencia_criptografica: undefined }).valid, false);
  assert.equal(validateReceiptAnalysisResult({ ...receiptResult, nivel_riesgo: 'ALTO' }).valid, false);
  assert.equal(validateReceiptAnalysisResult({ ...receiptResult, recomendaciones: ['Una sola recomendación.'] }).valid, false);
  globalThis.fetch = async () => response({ ...receiptResult, recomendaciones: 'no es una lista' });
  await assert.rejects(analyzeReceiptImage(imageFile(), 'Contexto'), (error) => error.kind === 'invalid-response');
});

test('receipt image validation rejects unsupported and oversized files before sending', async () => {
  let requested = false;
  globalThis.fetch = async () => { requested = true; return response(receiptResult); };
  await assert.rejects(analyzeReceiptImage(imageFile('documento.pdf', 'application/pdf'), 'Contexto'), (error) => error.kind === 'validation');
  await assert.rejects(analyzeReceiptImage(imageFile('grande.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1), 'Contexto'), (error) => error.kind === 'validation');
  assert.equal(requested, false);
});

test('receipt analysis reports HTTP failures, timeout, and caller cancellation', async () => {
  globalThis.fetch = async () => response({ detail: 'invalid' }, 413);
  await assert.rejects(analyzeReceiptImage(imageFile(), 'Contexto'), (error) => error.kind === 'service');

  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    const aborted = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    if (signal.aborted) aborted();
    else signal.addEventListener('abort', aborted, { once: true });
  });
  await assert.rejects(analyzeReceiptImage(imageFile(), 'Contexto', 'Bosa Central', { timeoutMs: 5 }), (error) => error.kind === 'timeout');

  const controller = new AbortController();
  const pending = analyzeReceiptImage(imageFile(), 'Contexto', 'Bosa Central', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => error.name === 'AbortError');
});
