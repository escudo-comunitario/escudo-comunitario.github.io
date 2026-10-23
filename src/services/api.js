const API_BASE_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const MAX_ANALYSIS_LENGTH = 2000;
const VALID_UPZS = new Set(["Bosa Central", "Bosa Occidental", "Tintal Sur", "El Porvenir"]);

export class AnalysisServiceError extends Error {
  constructor(message, kind = "service") {
    super(message);
    this.name = "AnalysisServiceError";
    this.kind = kind;
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
    throw new AnalysisServiceError(`${errorMessage} (código ${response.status}). Inténtelo de nuevo más tarde.`, "service");
  }

  try {
    return await response.json();
  } catch {
    throw new AnalysisServiceError("El servicio respondió con un formato que no se pudo leer. Inténtelo de nuevo.", "invalid-response");
  }
}

export async function analyzeMessage(textPayload, upzSelected = "Bosa Central", { signal } = {}) {
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
    body: { texto: message, upz: upzSelected },
    signal,
    errorMessage: "El servicio no pudo completar el análisis",
  });
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
