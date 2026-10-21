const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

// Keep the existing request shape until Diego confirms whether /analyze expects `upz` or `modo`.
// The current default is Bosa Central; do not map it to Ciudad Bolívar until Diego confirms valid UPZ values.

export class AnalysisServiceError extends Error {
  constructor(message, kind = "service") {
    super(message);
    this.name = "AnalysisServiceError";
    this.kind = kind;
  }
}

export async function analyzeMessage(textPayload, upzSelected = "Bosa Central", { signal } = {}) {
  const message = typeof textPayload === "string" ? textPayload.trim() : "";
  if (!message) throw new AnalysisServiceError("Escriba o dicte el mensaje antes de analizarlo.", "validation");

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: message, upz: upzSelected }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new AnalysisServiceError("No fue posible conectar con el servicio. Revise su conexión e inténtelo de nuevo.", "connection");
  }

  if (!response.ok) {
    throw new AnalysisServiceError(`El servicio no pudo completar el análisis (código ${response.status}). Inténtelo de nuevo más tarde.`, "service");
  }

  try {
    return await response.json();
  } catch {
    throw new AnalysisServiceError("El servicio respondió con un formato que no se pudo leer. Inténtelo de nuevo.", "invalid-response");
  }
}

export function validateAnalysisResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return { valid: false, reason: "La respuesta del servicio está vacía o no tiene el formato esperado." };
  }

  const risk = typeof result.nivel_riesgo === "string" ? result.nivel_riesgo.trim().toUpperCase() : "";
  const light = typeof result.color_semaforo === "string" ? result.color_semaforo.trim().toUpperCase() : "";
  if (!risk || !light) {
    return { valid: false, reason: "La respuesta no incluye el nivel de riesgo y el semáforo necesarios para mostrar el resultado." };
  }
  if (typeof result.explicacion_ciudadana !== "string" || !result.explicacion_ciudadana.trim()) {
    return { valid: false, reason: "La respuesta no incluye una explicación comprensible." };
  }
  if (result.recomendaciones !== undefined && (!Array.isArray(result.recomendaciones) || !result.recomendaciones.every((item) => typeof item === "string" && item.trim()))) {
    return { valid: false, reason: "Las recomendaciones recibidas no tienen el formato esperado." };
  }

  return { valid: true };
}

// This endpoint is outside the first delivery; retained only for existing callers.
export async function verifyIncidentIntegrity(incidentId) {
  const response = await fetch(`${API_BASE_URL}/verify-integrity?id=${encodeURIComponent(incidentId)}`);
  if (!response.ok) throw new AnalysisServiceError("No se pudo verificar la integridad del incidente.");
  return response.json();
}
