const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function analyzeMessage(textPayload, upzSelected = "Bosa Central") {
  if (USE_MOCK) {
    console.warn("[ESCUDO COMUNITARIO] Operando en MOCK MODE local offline.");
    const response = await fetch("/mock_response.json");
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo mock_response.json");
    }
    return await response.json();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: textPayload, upz: upzSelected }),
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor FastAPI: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.error("[FALLBACK ACTIVADO] Error de red. Retornando mock de contingencia:", err);
    const fallback = await fetch("/mock_response.json");
    return await fallback.json();
  }
}

export async function verifyIncidentIntegrity(incidentId) {
  if (USE_MOCK) {
    return { cadena_valida: true, bloque_adulterado: null };
  }
  const res = await fetch(`${API_BASE_URL}/verify-integrity?id=${incidentId}`);
  return await res.json();
}
