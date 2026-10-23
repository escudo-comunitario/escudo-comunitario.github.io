import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;
let ReceiptAnalysisResult;
let getReceiptPresentation;
let getReceiptSpeechText;
let AnalysisResult;
let getMessageSpeechText;

before(async () => {
  vite = await createServer({
    configFile: 'vite.config.js',
    server: { middlewareMode: true },
    appType: 'custom',
  });
  ({ default: ReceiptAnalysisResult, getReceiptPresentation, getReceiptSpeechText } = await vite.ssrLoadModule('/src/components/ReceiptAnalysisResult.jsx'));
  ({ default: AnalysisResult, getMessageSpeechText } = await vite.ssrLoadModule('/src/components/AnalysisResult.jsx'));
});

after(async () => {
  await vite?.close();
});

test('receipt result uses citizen language and hides ledger IDs, hashes, and QR URLs', () => {
  const result = {
    id_analisis: 'IMG-2026-BOSA-0001',
    timestamp: '2026-10-22T12:00:00Z',
    es_autentico: 'AUTENTICO',
    nivel_riesgo: 'BAJO',
    color_semaforo: 'VERDE',
    entidad_detectada: '<img src=x onerror=alert(1)>',
    senales_detectadas: ['Señal <script>alert(1)</script>'],
    url_qr_extraida: 'https://sitio-malicioso.example/<img src=x>',
    qr_dominio_legitimo: false,
    explicacion_ciudadana: 'Evaluación visual solamente.',
    audio_guion: 'Precaución.',
    recomendaciones: ['Confirma en la aplicación oficial.', 'No entregues el producto aún.'],
    evidencia_criptografica: { hash_actual: 'a'.repeat(64), hash_anterior: '0'.repeat(64), cadena_valida: true, qr_payload_url: 'https://escudo-bosa.gov.co/verify?id=IMG-2026-BOSA-0001' },
    datos_abiertos_referencia: { fuente: 'Datos abiertos', coincidencias_similares_mes: 0 },
  };
  const markup = renderToStaticMarkup(React.createElement(ReceiptAnalysisResult, { result }));
  assert.match(markup, /El aspecto del comprobante parece compatible/);
  assert.match(markup, /no confirma que el pago se haya recibido/);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<img src=x/);
  assert.doesNotMatch(markup, /<script>/);
  assert.doesNotMatch(markup, /href="https:\/\/sitio-malicioso\.example/);
  assert.doesNotMatch(markup, /Hash actual|Hash anterior|Identificador:|Dirección de verificación|IMG-2026-BOSA-0001/);
  assert.doesNotMatch(markup, /Comprobante validado/);
});

test('a suspect result needs a concrete signal; an unsupported verdict stays uncertain', () => {
  const base = {
    es_autentico: 'SOSPECHOSO', nivel_riesgo: 'MEDIO', color_semaforo: 'AMARILLO',
    explicacion_ciudadana: 'No fue posible confirmar los datos.', senales_detectadas: [], recomendaciones: [],
  };
  assert.equal(getReceiptPresentation(base).neutral, true);
  assert.equal(getReceiptPresentation({ ...base, senales_detectadas: ['El QR apunta a un dominio no oficial.'] }).neutral, false);
  assert.equal(getReceiptPresentation({ ...base, es_autentico: 'AUTENTICO', nivel_riesgo: 'BAJO', color_semaforo: 'VERDE' }).risk, 'MEDIO');
  assert.equal(getReceiptPresentation({
    ...base,
    senales_detectadas: ['No fue posible analizar la imagen automáticamente'],
    explicacion_ciudadana: 'No pudimos verificar el comprobante ahora.',
  }).neutral, true);
});

test('receipt narration includes the citizen recommendation and excludes technical details', () => {
  const speech = getReceiptSpeechText({
    es_autentico: 'AUTENTICO', nivel_riesgo: 'BAJO', color_semaforo: 'VERDE',
    explicacion_ciudadana: 'La apariencia es compatible.', senales_detectadas: [],
    recomendaciones: ['Confirma el pago en tu cuenta bancaria.'],
    evidencia_criptografica: { hash_actual: 'abc123' }, url_qr_extraida: 'https://example.com',
  });
  assert.match(speech, /Confirma el pago en tu cuenta bancaria/);
  assert.doesNotMatch(speech, /abc123|https:|semáforo|hash/i);
});

test('message result explains low risk without claiming safety and includes speech recommendations', () => {
  const result = {
    nivel_riesgo: 'BAJO', color_semaforo: 'VERDE',
    explicacion_ciudadana: 'No incluye enlaces ni solicitudes de claves.',
    recomendaciones: ['Confirma quién envió el mensaje.'],
  };
  const markup = renderToStaticMarkup(React.createElement(AnalysisResult, { result }));
  assert.match(markup, /No encontramos señales claras de engaño/);
  assert.match(markup, /no demuestra que el mensaje sea auténtico/);
  assert.match(markup, /Confirma quién envió el mensaje/);
  assert.doesNotMatch(markup, /El mensaje es seguro/);
  assert.match(getMessageSpeechText(result), /Confirma quién envió el mensaje/);
});
