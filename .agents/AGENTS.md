# AGENTS.md — Protocolo del Agente de Inteligencia Artificial (Frontend)

**Módulo:** Cliente Web Móvil (PWA) — Capa de Presentación e Interacción  
**Ubicación en Repositorio:** `frontend/`  
**Iniciativa:** Escudo Comunitario  
**Equipo:** Bacata Tech Group  
**Responsable Técnico:** Emanuel (Líder Full Stack / Frontend)  
**Marco Operativo:** Hackathon Colombia 5.0 (MinTIC / Universidad Distrital Francisco José de Caldas)  

---

## 1. Misión y Propósito del Agente Frontend

Este documento instruye a cualquier agente de Inteligencia Artificial o asistente de codificación que actúe sobre la carpeta `frontend/`. 

La misión principal del frontend es **eliminar por completo la fricción cognitiva para comunidades vulnerables de Bosa** (adultos mayores, comerciantes de plazas de mercado, líderes comunitarios y madres cabeza de familia). La interfaz debe transformar diagnósticos técnicos complejos de ciberseguridad en decisiones binarias inmediatas (Seguro / Peligro), accionables mediante voz, color y tipografía de alta legibilidad, garantizando disponibilidad offline durante la sustentación.

---

## 2. Reglas Cardinales de Interfaz y Desarrollo (Inviolables)

1. **Estrategia Mock-First Obligatoria:**  
   El frontend debe ser 100% autónomo. Todas las vistas, estados interactivos y flujos deben poder ejecutarse consumiendo el archivo estático `/public/mock_response.json` sin requerir que el backend en FastAPI esté levantado. La conmutación a la API real se gestionará únicamente mediante variables de entorno (`VITE_USE_MOCK=false`).

2. **Cero Jerga Tecnológica en Vistas y Respuestas Sonoras:**  
   Queda terminantemente prohibido mostrar o verbalizar tecnicismos como *phishing*, *malware*, *keylogger*, *payload*, *troyano*, *vector de ataque* o *probabilidad bayesiana*.  
   * **Traducción obligatoria:**  
     * *Phishing* $\rightarrow$ «Mensaje engañoso» o «Página trampa».  
     * *Robo de credenciales* $\rightarrow$ «Quieren sacarle la clave de su cuenta».  
     * *Malware* $\rightarrow$ «Archivo dañino para su celular».  
     * *Falso embargo* $\rightarrow$ «Asustarlo con una deuda falsa».

3. **Confinamiento Visual Smartphone (390px Mobile-First):**  
   * En navegadores de escritorio: La aplicación se renderiza dentro de un marco centrado horizontalmente con un ancho fijo máximo de `390px` a `412px` (viewport estándar iPhone 13/Android moderno) con elevación/sombra lateral simulando un teléfono móvil.  
   * En dispositivos móviles: Ancho al `100%`, `overflow-x: hidden`.

4. **Accesibilidad Extrema (WCAG 2.1 AA — Res. MinTIC 1519 de 2020):**  
   * Área mínima de contacto táctil de **$48\text{ px} \times 48\text{ px}$** (óptimo $56\text{ px}$) para evitar pulsaciones erróneas en personas mayores o con baja motricidad.  
   * Sin botones en mayúsculas sostenidas (`textTransform: 'none'`) para transmitir serenidad.  
   * Ratios de contraste de color superiores a 4.5:1 en todos los textos sobre fondos de color.

5. **Cláusula Preventiva Obligatoria (Circular Externa 002 de 2024 - SIC):**  
   Todo veredicto o vista de diagnóstico debe exhibir de forma permanente y legible:  
   > *«El análisis emitido por la Inteligencia Artificial es preventivo y orientativo; no reemplaza una denuncia penal ni un dictamen pericial oficial emitido por las autoridades judiciales competentes.»*

6. **Privacidad Irreversible y Protección de Datos (Ley 1581 de 2012):**  
   Bajo ninguna circunstancia se implementarán formularios que soliciten cédulas, contraseñas, números bancarios, nombres reales o números celulares directos. Toda georreferenciación debe disociarse y limitarse a nivel de **UPZ** (Bosa Central, Bosa Occidental, Tintal Sur, El Porvenir).

---

## 3. Stack Tecnológico y Tokens de Material Design 3 (MUI)

* **Framework Base:** React 18+ empaquetado con Vite.  
* **Biblioteca de UI:** Material UI (MUI v5/v6) configurado bajo directrices estáticas de **Material Design 3 (MD3)**.  
* **Regla de Estilos:** Cero configuraciones dinámicas pesadas (Emotion runtime excesivo o extracción dinámica de paletas tipo Material You). Se usa un único archivo de configuración estática `src/theme/md3Theme.js`.

### Archivo Canónico del Tema (`src/theme/md3Theme.js`)
```javascript
import { createTheme } from '@mui/material/styles';

export const md3Theme = createTheme({
  palette: {
    primary: {
      main: '#006A60',       // Verde institucional comunitario accesible
      contrastText: '#FFFFFF',
    },
    // Contenedores tonales para el Semáforo de Veredicto
    success: {
      main: '#137333',       // Texto e icono veredicto seguro
      light: '#E6F4EA',      // Fondo tonal superficie segura
    },
    error: {
      main: '#C5221F',       // Texto e icono veredicto peligro
      light: '#FCE8E6',      // Fondo tonal superficie de alerta
    },
    background: {
      default: '#F8FAF8',    // Superficie neutra cálida
      paper: '#FFFFFF',
    },
    text: {
      primary: '#191C1B',
      secondary: '#404944',
    },
  },
  shape: {
    borderRadius: 16,        // Curvatura base MD3
  },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", sans-serif',
    button: {
      textTransform: 'none', // Sin mayúsculas agresivas
      fontWeight: 600,
      fontSize: '1rem',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Estilo plano con contenedor tonal
      },
      styleOverrides: {
        root: {
          borderRadius: 28,     // Botones tipo píldora
          minHeight: 48,        // Target táctil accesible
          padding: '12px 24px',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: 'outlined',   // Tarjetas planas con contorno sutil
      },
      styleOverrides: {
        root: {
          borderRadius: 20,
          borderColor: '#E0E3E0',
        },
      },
    },
  },
});
```

---

## 4. Topología del Proyecto Frontend

```
frontend/
├── public/
│   ├── mock_response.json        # Contrato de datos estático offline (Inmutable)
│   ├── manifest.json             # Manifiesto PWA (Standalone, theme_color #006A60)
│   └── favicon.ico
├── src/
│   ├── assets/                   # Recursos visuales y logotipos
│   ├── components/
│   │   ├── WalkieTalkie.jsx      # FAB central de audio y dictado por voz (Web Speech API)
│   │   ├── TrafficLight.jsx      # Semáforo tonal (Rojo/Verde) con síntesis de voz
│   │   ├── FamilyShield.jsx      # Botón de enlace preformateado a WhatsApp
│   │   ├── CertificateQR.jsx     # Tarjeta pericial con código QR y Hash SHA-256
│   │   ├── TerritorialRadar.jsx  # Radar territorial por UPZ de Bosa
│   │   └── PushBanner.jsx        # Banner de suscripción y alerta comunitaria temprana
│   ├── theme/
│   │   └── md3Theme.js           # Tokens estáticos de diseño MD3
│   ├── services/
│   │   └── api.js                # Switch conmutable: Mock local vs FastAPI
│   ├── App.jsx                   # Contenedor visual de 390px y orquestación de vistas
│   ├── main.jsx                  # Entrypoint de React con ThemeProvider y CssBaseline
│   └── index.css                 # Reglas globales de contenedor y viewport
├── package.json
└── vite.config.js
```

---

## 5. Especificaciones de Componentes Clave

### 5.1 `WalkieTalkie.jsx` (Entrada por Voz)
* **Principio:** Cero tipeo requerido para el ciudadano en pánico.
* **Componente:** `Fab` de MUI de tamaño extendido ($72\text{ px} \times 72\text{ px}$), centrado verticalmente, con icono `Mic` (`@mui/icons-material/Mic`).
* **Lógica Web Speech API (SpeechRecognition):**
  * Validar compatibilidad:
    ```javascript
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    ```
  * Configurar `recognition.lang = 'es-CO'`.
  * Estados visuales: En reposo (Verde institucional), Escuchando (Pulsación visual / onda expansiva), Procesando (Indicador circular).
  * **Fallback elegante:** Si el navegador no soporta la API, desplegar automáticamente un campo `TextField` multilínea accesible con botón de envío manual sin romper la aplicación.

### 5.2 `TrafficLight.jsx` (Veredicto y Síntesis de Audio)
* **Principio:** Certeza inmediata binaria.
* **Superficie Tonal:**
  * Si `color_semaforo === "ROJO"`: Fondo `palette.error.light` (`#FCE8E6`), texto e iconos en `palette.error.main` (`#C5221F`).
  * Si `color_semaforo === "VERDE"`: Fondo `palette.success.light` (`#E6F4EA`), texto e iconos en `palette.success.main` (`#137333`).
* **Síntesis por Voz Barrial (Text-to-Speech):**
  * Al renderizar el veredicto, invocar `window.speechSynthesis` con `SpeechSynthesisUtterance`.
  * Leer estrictamente el contenido del campo `audio_guion`.
  * Configurar idioma `es-CO` (o `es-419`) con velocidad pausada (`rate: 0.95`).
* **Explicabilidad:** Mostrar `explicacion_ciudadana` en tipografía clara y viñetas de `recomendaciones`.

### 5.3 `FamilyShield.jsx` (Botón "Tutor de Confianza")
* **Principio:** Romper el secuestro emocional mediante soporte de la red de apoyo.
* **Comportamiento:** Botón de ancho completo (`fullWidth`) con tono verde WhatsApp (`#25D366`), que ejecuta un enlace profundo hacia la API web de WhatsApp:
  ```javascript
  export function openFamilyShield(modalidadDetectada) {
    const mensaje = encodeURIComponent(
      `Hola familiar, me enviaron un mensaje sospechoso y en Escudo Comunitario salió en ROJO como peligroso (${modalidadDetectada}). ¿Me ayudas a revisar antes de tocar algo?`
    );
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  }
  ```

### 5.4 `CertificateQR.jsx` (Certificado Forense de Evidencia)
* **Principio:** Aportar validez pericial demostrable en el minuto 3 del pitch.
* Renderiza un contenedor `Card variant="outlined"` que aloja:
  1. Identificador de caso (`id_analisis`, ej. `ESC-2026-BOSA-0042`).
  2. Código QR generado localmente apuntando a `qr_payload_url`.
  3. Hash criptográfico SHA-256 en bloque tipográfico monoespaciado (`fontFamily: 'monospace'`).
  4. **Insignia Dinámica de Integridad:**
     * Si `evidencia_criptografica.cadena_valida === true`: Chip verde con texto *«Evidencia Íntegra — Cumple Ley 527/1999»*.
     * Si `evidencia_criptografica.cadena_valida === false`: Alerta roja parpadeante indicando *«ALTERACIÓN DETECTADA — Cadena Rota»* (soporte para el test de adulteración de Erick).

### 5.5 `TerritorialRadar.jsx` (Radar Comunitario por UPZ)
* Despliega contadores agregados por UPZ de Bosa para contextualizar el riesgo barrial:
  * UPZ 84: Bosa Central
  * UPZ 85: Bosa Occidental
  * UPZ 86: Tintal Sur
  * UPZ 87: El Porvenir
* Utiliza barras de progreso lineales (`LinearProgress`) con colores tonales, sin exponer datos individuales de ciudadanos.

### 5.6 `PushBanner.jsx` (Notificaciones Comunitarias)
* Banner discreto en la cabecera solicitando permiso mediante `Notification.requestPermission()`.
* Muestra de inmediato alertas de campañas activas simuladas si el ciudadano autoriza la recepción de avisos barriales.

---

## 6. Servicio de Conexión y Modo Mock-First (`src/services/api.js`)

```javascript
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
```

---

## 7. Contrato de Datos Estático Canónico (`/public/mock_response.json`)

El agente frontend asume que cualquier fuente de datos (mock o backend real) provee exactamente esta firma de datos:

```json
{
  "id_analisis": "ESC-2026-BOSA-0042",
  "timestamp": "2026-10-22T14:30:00Z",
  "nivel_riesgo": "ALTO",
  "color_semaforo": "ROJO",
  "modalidad_detectada": "Suplantación de Billetera Digital (Nequi / Daviplata)",
  "explicacion_ciudadana": "Están fingiendo ser de Daviplata para asustarlo con un falso embargo y pedirle que entre a una página falsa a poner su clave.",
  "audio_guion": "Peligro. No toque ningún enlace ni comparta claves. Su cuenta no tiene ningún problema.",
  "recomendaciones": [
    "No ingrese al enlace adjunto.",
    "No comparta contraseñas ni códigos que le lleguen por mensaje de texto.",
    "Avise de inmediato a su familiar de confianza."
  ],
  "evidencia_criptografica": {
    "hash_actual": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "hash_anterior": "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    "cadena_valida": true,
    "qr_payload_url": "https://escudo-bosa.gov.co/verify?id=ESC-2026-BOSA-0042"
  },
  "datos_abiertos_referencia": {
    "fuente": "Datos Abiertos Bogotá - Delitos Informáticos Bosa",
    "coincidencias_similares_mes": 28
  }
}
```

---

## 8. Guion de Soporte para la Demostración en Vivo (5 Minutos)

El frontend está estructurado para protagonizar los minutos 1 y 2 del pitch a cargo de Emanuel, y soportar visualmente a Erick y Diego:

* **Minuto 1 (Contexto):** App visible en pantalla de inicio con diseño sobrio y el FAB de micrófono destacándose.
* **Minuto 2 (Demo Walkie-Talkie):** Se presiona el micrófono, se dicta el audio sospechoso («*Su cuenta de Daviplata será embargada...*»), salta la pantalla en **ROJO**, el navegador lee el `audio_guion` en voz alta y se exhibe el botón de WhatsApp preconfigurado.
* **Minuto 3 (Prueba de Integridad de Erick):** Se muestra la tarjeta `CertificateQR.jsx` con el sello verde. Tras la ejecución del script alterador en backend, la tarjeta conmuta a **ROJO** mostrando la advertencia de evidencia adulterada.
* **Minuto 4 (Radar Territorial):** Se abre la pestaña del radar mostrando la concentración de casos en Bosa Central y Tintal Sur.

---

## 9. Directrices de Codificación para el Agente

1. **No instalar librerías pesadas innecesarias:** Evitar Redux o gestores complejos de estado. La aplicación requiere un estado central simple en `App.jsx` o React Context.
2. **Defensividad con APIs del Navegador:** Siempre comprobar la presencia de `window.webkitSpeechRecognition`, `window.SpeechRecognition` y `window.speechSynthesis` antes de invocarlos para evitar bloqueos en entornos de prueba.
3. **Respeto a la identidad del equipo:** Todos los pies de página y créditos deben rezar:  
   *«Escudo Comunitario — Diseñado por Bacata Tech Group para Bosa»*.