const API_BASE_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const MAX_ANALYSIS_LENGTH = 2000;
const VALID_UPZS = new Set(["Bosa Central", "Bosa Occidental", "Tintal Sur", "El Porvenir"]);
// 5 MB is the documented backend default (IMAGE_MAX_MB); keep this guard aligned with deployment config.
export const MAX_RECEIPT_IMAGE_BYTES = 5 * 1024 * 1024;
const RECEIPT_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

export class AnalysisServiceError extends Error {
  constructor(message, kind = "service", status = null) {
    super(message);
    this.name = "AnalysisServiceError";
    this.kind = kind;
    this.status = Number.isInteger(status) ? status : null;
  }
}

async function requestJson(path, { method = "GET", body, signal, errorMessage }) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new AnalysisServiceError("No fue posible conectar con el servicio. Revise su conexión e inténtelo de nuevo.", "connection");
  }

  if (!response.ok) {
    throw new AnalysisServiceError(`${errorMessage}. Inténtelo de nuevo más tarde.`, "service");
  }

  try {
    return await response.json();
  } catch {
    throw new AnalysisServiceError("El servicio respondió con un formato que no se pudo leer. Inténtelo de nuevo.", "invalid-response");
  }
}

export async function analyzeMessage(textPayload, upzSelected = "Bosa Central", { signal, modo = "texto" } = {}) {
  const message = typeof textPayload === "string" ? textPayload.trim() : "";
  if (!message) throw new AnalysisServiceError("Escriba o dicte el mensaje antes de analizarlo.", "validation");
  if (message.length > MAX_ANALYSIS_LENGTH) {
    throw new AnalysisServiceError(`El mensaje puede tener hasta ${MAX_ANALYSIS_LENGTH} caracteres.`, "validation");
  }
  if (!VALID_UPZS.has(upzSelected)) {
    throw new AnalysisServiceError("Seleccione una UPZ válida de Bosa.", "validation");
  }

  return requestJson("analyze", {
    method: "POST",
    body: { texto: message, upz: upzSelected, modo },
    signal,
    errorMessage: "El servicio no pudo completar el análisis",
  });
}

async function requestMultipart(path, { formData, signal, errorMessage, timeoutMs = 30000 }) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response;
    try {
      // Do not set Content-Type here: fetch adds the multipart boundary for FormData.
      response = await fetch(`${API_BASE_URL}/${path}`, { method: "POST", body: formData, signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new AnalysisServiceError("El servicio está tardando. Puedes intentarlo de nuevo.", "timeout");
      if (signal?.aborted || error?.name === "AbortError") throw error;
      throw new AnalysisServiceError("No fue posible conectar con el servicio. Revise su conexión e inténtelo de nuevo.", "connection");
    }

    if (!response.ok) {
      throw new AnalysisServiceError(`${errorMessage}. Inténtelo de nuevo más tarde.`, "http", response.status);
    }
    try {
      return await response.json();
    } catch (error) {
      if (timedOut) throw new AnalysisServiceError("El servicio está tardando. Puedes intentarlo de nuevo.", "timeout");
      if (signal?.aborted || error?.name === "AbortError") throw error;
      throw new AnalysisServiceError("El servicio respondió con un formato que no se pudo leer. Inténtelo de nuevo.", "invalid-json");
    }
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function analyzeReceiptImage(image, textPayload, upzSelected = "Bosa Central", { signal, timeoutMs } = {}) {
  // The backend currently requires a text form field. Keep this neutral default
  // internal so the citizen only has to choose the receipt image.
  const message = typeof textPayload === "string" && textPayload.trim()
    ? textPayload.trim()
    : "Revisión visual solicitada. Sin contexto adicional del ciudadano.";
  if (!image || typeof image.size !== "number" || typeof image.type !== "string") {
    throw new AnalysisServiceError("Selecciona una imagen JPG o PNG.", "validation");
  }
  if (!RECEIPT_IMAGE_TYPES.has(image.type)) {
    throw new AnalysisServiceError("Solo se aceptan imágenes JPG o PNG.", "validation");
  }
  if (!image.size) throw new AnalysisServiceError("La imagen está vacía. Selecciona otra imagen.", "validation");
  if (image.size > MAX_RECEIPT_IMAGE_BYTES) {
    throw new AnalysisServiceError("La imagen debe pesar máximo 5 MB.", "validation");
  }
  if (message.length > MAX_ANALYSIS_LENGTH) throw new AnalysisServiceError(`El contexto puede tener hasta ${MAX_ANALYSIS_LENGTH} caracteres.`, "validation");
  if (!VALID_UPZS.has(upzSelected)) throw new AnalysisServiceError("Seleccione una UPZ válida de Bosa.", "validation");

  const formData = new FormData();
  formData.append("imagen", image, image.name || "comprobante");
  formData.append("texto", message);
  formData.append("upz", upzSelected);
  const result = await requestMultipart("analyze-image", { formData, signal, timeoutMs, errorMessage: "El servicio no pudo completar la revisión del comprobante" });
  const validation = validateReceiptAnalysisResult(result);
  if (!validation.valid) throw new AnalysisServiceError(validation.reason, "invalid-response");
  return result;
}

export function validateReceiptAnalysisResult(result) {
  const requiredStrings = ["id_analisis", "timestamp", "es_autentico", "nivel_riesgo", "color_semaforo", "entidad_detectada", "explicacion_ciudadana", "audio_guion"];
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return { valid: false, reason: "La respuesta del servicio está vacía o no tiene el formato esperado." };
  }
  if (requiredStrings.some((field) => typeof result[field] !== "string" || !result[field].trim())) {
    return { valid: false, reason: "La respuesta no incluye todos los datos del comprobante." };
  }
  if (!["AUTENTICO", "SOSPECHOSO", "FALSO"].includes(result.es_autentico.trim().toUpperCase())) {
    return { valid: false, reason: "La respuesta no incluye una evaluación de autenticidad válida." };
  }
  const expectedLight = { ALTO: "ROJO", MEDIO: "AMARILLO", BAJO: "VERDE" };
  const risk = result.nivel_riesgo.trim().toUpperCase();
  const light = result.color_semaforo.trim().toUpperCase();
  if (expectedLight[risk] !== light) return { valid: false, reason: "La respuesta no incluye un nivel de riesgo y semáforo coherentes." };
  if (!Array.isArray(result.senales_detectadas) || !result.senales_detectadas.every((item) => typeof item === "string")) {
    return { valid: false, reason: "Las señales detectadas no tienen el formato esperado." };
  }
  if (result.senales_detectadas.length > 5) return { valid: false, reason: "La respuesta excede el máximo de señales permitido." };
  if (result.url_qr_extraida !== null && typeof result.url_qr_extraida !== "string") {
    return { valid: false, reason: "La URL del QR no tiene el formato esperado." };
  }
  if (result.qr_dominio_legitimo !== null && typeof result.qr_dominio_legitimo !== "boolean") {
    return { valid: false, reason: "La evaluación del dominio QR no tiene el formato esperado." };
  }
  if (!Array.isArray(result.recomendaciones) || result.recomendaciones.length !== 2 || !result.recomendaciones.every((item) => typeof item === "string" && item.trim())) {
    return { valid: false, reason: "La respuesta debe incluir exactamente dos recomendaciones válidas." };
  }
  const evidence = result.evidencia_criptografica;
  if (!evidence || typeof evidence !== "object" || ["hash_actual", "hash_anterior", "qr_payload_url"].some((field) => typeof evidence[field] !== "string") || typeof evidence.cadena_valida !== "boolean") {
    return { valid: false, reason: "La evidencia criptográfica no tiene el formato esperado." };
  }
  const reference = result.datos_abiertos_referencia;
  if (!reference || typeof reference !== "object" || typeof reference.fuente !== "string" || !Number.isInteger(reference.coincidencias_similares_mes)) {
    return { valid: false, reason: "La referencia de datos abiertos no tiene el formato esperado." };
  }
  return { valid: true };
}

export function validateAnalysisResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return { valid: false, reason: "La respuesta del servicio está vacía o no tiene el formato esperado." };
  }

  const risk = typeof result.nivel_riesgo === "string" ? result.nivel_riesgo.trim().toUpperCase() : "";
  const light = typeof result.color_semaforo === "string" ? result.color_semaforo.trim().toUpperCase() : "";
  const coherent = { ALTO: "ROJO", MEDIO: "AMARILLO", BAJO: "VERDE" };
  if (!risk || !light || coherent[risk] !== light) {
    return { valid: false, reason: "La respuesta no incluye un nivel de riesgo y semáforo válidos y coherentes." };
  }
  if (typeof result.explicacion_ciudadana !== "string" || !result.explicacion_ciudadana.trim()) {
    return { valid: false, reason: "La respuesta no incluye una explicación comprensible." };
  }
  if (result.recomendaciones !== undefined && (!Array.isArray(result.recomendaciones) || !result.recomendaciones.every((item) => typeof item === "string" && item.trim()))) {
    return { valid: false, reason: "Las recomendaciones recibidas no tienen el formato esperado." };
  }

  return { valid: true };
}

export async function reportIncident(payload, upz = "Bosa Central", { signal } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AnalysisServiceError("No se pudo preparar el reporte.", "validation");
  }
  if (!VALID_UPZS.has(upz)) throw new AnalysisServiceError("Seleccione una UPZ válida de Bosa.", "validation");

  const result = await requestJson("report", {
    method: "POST",
    body: { payload, upz },
    signal,
    errorMessage: "No se pudo guardar el reporte",
  });
  if (result?.status !== "registrado" || typeof result.id !== "string" || typeof result.hash !== "string") {
    throw new AnalysisServiceError("El servicio no confirmó el registro del reporte.", "invalid-response");
  }
  return result;
}

export async function verifyIncidentIntegrity({ signal } = {}) {
  const result = await requestJson("verify-integrity", {
    signal,
    errorMessage: "No se pudo verificar la integridad de la cadena",
  });
  if (typeof result?.integro !== "boolean" || !Number.isInteger(result.bloques_auditados)) {
    throw new AnalysisServiceError("La verificación respondió con un formato inesperado.", "invalid-response");
  }
  return result;
}

export async function getCommunityStats({ signal } = {}) {
  const result = await requestJson("stats", {
    signal,
    errorMessage: "No se pudieron cargar las estadísticas",
  });
  if (!result || typeof result.por_modalidad !== "object" || typeof result.por_upz !== "object" || typeof result.historico_bosa !== "object") {
    throw new AnalysisServiceError("Las estadísticas respondieron con un formato inesperado.", "invalid-response");
  }
  return result;
}
