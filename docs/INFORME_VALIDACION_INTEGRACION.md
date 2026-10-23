# Informe de validación e integración — Escudo Comunitario

Fecha: 2026-10-22. Alcance: frontend en main y backend en diego-dev. No se hicieron llamadas a Gemini, OpenAI ni Google Search.

## A. Resumen ejecutivo

**LISTO PARA PRUEBAS MANUALES LOCALES.** Instalé las dependencias autorizadas, el build de producción pasó, las 8 pruebas del cliente pasaron y la suite backend obtuvo 22 aprobadas. También arranqué FastAPI y Vite, verifiqué los cuatro endpoints principales con HTTP real y llamé al backend desde el cliente api.js del frontend.

Corregí en el frontend la presentación de riesgo MEDIO/BAJO y el envío del modo voz/texto. La prueba de integración usó la caché offline del backend, sin proveedor LLM; no prueba el comportamiento de Gemini. CORS local permite las pruebas en localhost, pero rechaza un origen Vercel. No hice pruebas visuales en navegador, dictado, cámara ni micrófono.

## B. Entorno y repositorios

| Repositorio | Rama/commit inicial y final | Estado final |
|---|---|---|
| escudo-comunitario.github.io | main / 246226e | Cambios solo en los cuatro archivos listados en E y este informe. Sin cambios en package-lock.json. |
| backend | diego-dev / 8f1e59c | Limpio; no modifiqué archivos, configuración ni dependencias del repositorio. |

La carpeta común es C:\Users\Emanuel\Desktop\Escudo Comunitario Project. El proyecto Python está en backend\backend. Node v24.21.0, npm 11.19.0 y Python 3.12.14 (runtime disponible en Codex; Python no está en PATH del sistema).

Ejecuté npm ci --no-audit --no-fund: instaló 125 paquetes desde package-lock.json. npm advirtió que el postinstall de esbuild no estaba aprobado; el build posterior sí se completó. Instalé requirements.txt en un venv temporal fuera de ambos repositorios; no instalé paquetes globales. Versiones resueltas incluyeron FastAPI 0.161.1, Uvicorn 0.54.0, SQLAlchemy 2.1.6, Pydantic 2.14.1, httpx 0.28.1 y pytest 9.1.1.

El backend no contiene .env real ni escudo.db al comenzar. Las pruebas de API usan una SQLite temporal según backend/conftest.py; la integración HTTP también usó una base temporal fuera del repositorio. La ejecución de pytest dejó/refrescó cachés ignorados .pytest_cache y __pycache__; no las borré para no eliminar artefactos preexistentes. No hay escudo.db ni cambios de código/configuración en backend. Los servidores de prueba se detuvieron al terminar.

## C. Tabla de pruebas

| Prueba | Comando/procedimiento | Resultado | Evidencia |
|---|---|---|---|
| Instalación frontend | npm ci --no-audit --no-fund | APROBADA | 125 paquetes instalados con lockfile. Advertencia de scripts de esbuild; build verificado después. |
| Pruebas del cliente API | node --test src/services/api.test.mjs | APROBADA | 8 pruebas, 0 fallidas, incluida una prueba nueva para modo voz. |
| Build frontend | npm run build | APROBADA | Vite 5.4.21; transformó 975 módulos y generó dist, incluido sw.js. |
| Lint/otros scripts | npm run | NO EJECUTADA | package.json solo define dev, build y preview; no hay scripts de test, lint ni tipos. |
| Suite backend | Python del venv temporal: -m pytest -q, desde backend\backend | APROBADA | 22 passed, 1 warning, 4.98 s. Advertencia: Starlette depreca el uso de httpx con TestClient y sugiere httpx2. |
| Arranque backend | python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 | APROBADA | GET /openapi.json respondió HTTP 200. Base de datos configurada en Temp. |
| Endpoints HTTP reales | POST analyze/report; GET verify-integrity/stats | APROBADA | analyze 200 con respuesta válida; report 200 con id/hash; integridad 200 íntegra; stats 200 con los tres campos esperados. |
| Tres riesgos de fallback | POST analyze con textos sintéticos | APROBADA | Respuestas HTTP reales ALTO/ROJO, MEDIO/AMARILLO y BAJO/VERDE. Sin credenciales, el backend usó su fallback offline; no es inferencia LLM. |
| Integridad y estadísticas | Solicitudes posteriores al análisis y reporte sintéticos | APROBADA | Cadena válida; conteos y UPZ coherentes con los registros temporales creados. |
| Contrato de modo voz | Cliente api.js contra FastAPI y lectura del ledger temporal | APROBADA | El cliente envió modo voz; el registro lo guardó como voz. |
| CORS | Preflight local y origen de prueba Vercel | MIXTA | localhost:5173 recibió HTTP 200 y Allow-Origin; https://escudo-prueba.vercel.app recibió HTTP 400 sin Allow-Origin. |
| Servidor frontend | npm run dev -- --host 127.0.0.1 y GET / | APROBADA | Vite respondió HTTP 200 en 127.0.0.1:5173. |
| Error sin backend | Cliente api.js tras detener FastAPI | APROBADA | Error real AnalysisServiceError, kind=connection, con mensaje de conexión. |
| Presentación de resultados | Render SSR del componente con datos representativos | APROBADA | Tras la corrección, las tres parejas aceptadas no muestran advertencia; una pareja incoherente sí la muestra. No equivale a prueba visual en navegador. |
| Prueba de navegador/voz/cámara | No ejecutada | NO EJECUTADA | Requiere revisión manual en navegador/dispositivo. |
| Gemini/OpenAI/Google Search | Bloqueados en pruebas; claves vacías | NO EJECUTADA | No se validaron proveedor, cuota, red ni latencia LLM real. |

Para las pruebas backend fijé claves vacías y dirigí el proxy HTTPS al loopback para bloquear el precalentamiento externo. La suite validó el modo offline y los tests que sustituyen el LLM; no se presentó como prueba del proveedor real.

## D. Contrato API

| Endpoint | Contrato confirmado en el código y resultado observado |
|---|---|
| POST /api/analyze | Frontend envía JSON con texto, UPZ y modo; backend acepta texto de 1–2.000 caracteres, UPZ opcional de su lista y modo voz/texto opcional (predeterminado texto). La respuesta real incluye id_analisis, timestamp, nivel_riesgo, color_semaforo, modalidad_detectada, explicacion_ciudadana, audio_guion, recomendaciones, evidencia_criptografica y datos_abiertos_referencia. Las tres parejas de riesgo se observaron con fallback local. |
| POST /api/report | JSON {payload, upz}; respuesta observada {status: registrado, id, hash}. Compatible con el cliente. Se usaron datos ficticios. |
| GET /api/verify-integrity | Respuesta observada con integro, bloques_auditados y registro_alterado/motivo opcionales. Compatible. Verifica la cadena global; no una transacción por ID. |
| GET /api/stats | Respuesta observada con por_modalidad, por_upz e historico_bosa. Compatible. Los históricos vienen del catálogo local del backend. |
| GET /api/campaigns/latest | Existe en backend, pero el frontend no lo llama. |
| POST /api/analyze-image | Existe en backend; multipart con imagen, texto y UPZ opcional. No hay integración UI de imagen. |

Una solicitud real inválida a analyze recibió HTTP 422. El cliente transforma HTTP no exitosos en error de servicio; la caída real del servidor se tradujo a kind=connection. El análisis backend no incluye campo que distinga LLM de fallback; la interfaz no puede señalar cuál produjo el resultado sin una ampliación contractual. No se inventó ese campo.

## E. Correcciones realizadas

| Archivo | Defecto reproducido | Corrección | Comprobación |
|---|---|---|---|
| src/components/AnalysisResult.jsx | El render SSR mostraba advertencia de combinación no confirmada para MEDIO/AMARILLO y BAJO/VERDE, pese a que el backend admite esas parejas. | Reconoce las tres parejas y muestra estilos semánticos de peligro, precaución y bajo riesgo. Mantiene la advertencia para parejas incoherentes. | Render SSR después del cambio: sin advertencia para las tres parejas; advertencia para ALTO/AMARILLO. Build aprobado. |
| src/services/api.js | No incluía modo en el cuerpo aunque el backend lo admite. | Agrega modo al cuerpo con valor predeterminado texto. | Prueba cliente y llamada real confirmaron modo voz. |
| src/components/AnalysisModule.jsx | No transmitía si la entrada fue voz o texto. | Pasa voz cuando el modo actual es voice y texto en otro caso. | El ledger temporal confirmó modo voz. |
| src/services/api.test.mjs | La prueba de contrato no cubría modo. | Actualiza el cuerpo esperado y añade prueba para voz. | 8/8 pruebas aprobadas. |

No modifiqué backend ni agregué campañas o análisis de imágenes al frontend.

## F. Riesgos y limitaciones

- **Producción:** CORS del backend solo contiene los dos orígenes localhost. El preflight de un dominio de Vercel falla. Debe configurarse en la rama/backend responsable antes del deploy; no lo cambié.
- **URL API:** frontend usa VITE_API_URL o http://localhost:8000/api. En Vercel se debe configurar la URL HTTPS pública; no hay proxy API en vercel.json.
- **Fallback:** se comprobó que el fallback de palabras clave devuelve resultados, pero no equivale a un análisis LLM y la respuesta no lo etiqueta. No mostrarlo como resultado confirmado por IA sin aclarar el contrato con Diego.
- **Privacidad:** backend anonimiza ciertos correos, teléfonos, números y claves conocidas; no puede asegurar detección de nombres/direcciones en texto libre. El endpoint de imagen envía la imagen completa a Gemini y lee el archivo completo antes de aplicar el límite de tamaño. No se probó con información personal real ni se llamó al proveedor.
- **Persistencia:** SQLite usa ruta relativa al directorio desde el que se inicia. Para pruebas manuales se creará una base de desarrollo local; no apuntar a una DB de producción.
- **Dependencias Python:** requirements.txt expresa mínimos sin versiones fijadas; el venv de esta comprobación resolvió versiones actuales y emitió una advertencia de compatibilidad TestClient/httpx. Para reproducción idéntica haría falta fijar dependencias en una etapa autorizada.
- **PWA:** el build produjo sw.js. La caché es de interfaz; las peticiones API no se cachean.

## G. Guía para arrancar localmente

El venv utilizado está fuera de los repositorios en Temp. Esta ruta funciona mientras Windows conserve esa carpeta. Si se elimina, crea otro venv temporal con el Python disponible y requirements.txt; no es necesario instalar paquetes globales.

Terminal 1 — backend, desde la carpeta Python:

    cd C:\Users\Emanuel\Desktop\Escudo Comunitario Project\backend\backend
    & 'C:\Users\Emanuel\AppData\Local\Temp\escudo-backend-check-czGQgc\venv\Scripts\python.exe' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Sin GEMINI_API_KEY/OPENAI_API_KEY, el endpoint usa fallback offline. No pongas la clave en el informe ni en Git. La app crea escudo.db relativo a esta carpeta si no se define DATABASE_URL. El arranque también hace un precalentamiento de conexión al proveedor configurado.

Terminal 2 — frontend:

    cd C:\Users\Emanuel\Desktop\Escudo Comunitario Project\escudo-comunitario.github.io
    npm run dev

La URL por defecto es http://localhost:5173 y API http://localhost:8000/api. Comprueba backend abriendo http://127.0.0.1:8000/openapi.json y frontend en http://localhost:5173. La configuración CORS actual admite localhost:5173 y 127.0.0.1:5173.

Comprobaciones reproducibles adicionales, desde backend\backend: el comando de pytest es la ruta de Python anterior seguida de -m pytest -q. Desde la raíz frontend: node --test src/services/api.test.mjs y npm run build.

## H. Checklist de pruebas manuales

- [ ] Abrir la app en localhost:5173; comprobar carga inicial y navegación entre modos/pantallas.
- [ ] Probar un texto sintético con señales de urgencia/enlace; anotar que sin clave el resultado proviene del fallback local.
- [ ] Probar texto genérico sin palabras de los escenarios para observar MEDIO/AMARILLO y un aviso público genérico para BAJO/VERDE.
- [ ] Confirmar que las tres parejas se representan sin falsa advertencia y que recomendaciones y explicación aparecen.
- [ ] Detener backend y comprobar mensaje de desconexión; reiniciarlo y reintentar.
- [ ] Registrar un incidente ficticio, revisar id/hash y después consultar integridad y estadísticas. Usar solo la base de desarrollo local.
- [ ] Navegar entre pantallas sin errores críticos en consola.
- [ ] Probar dictado y locución con permiso de micrófono en un navegador compatible; no automatizados en esta validación.
- [ ] No considerar campañas ni análisis de imagen como flujo frontend: aún no están integrados.

Automatizadas: cliente API, build, suite backend, llamadas HTTP de los cuatro endpoints, CORS local/prod de prueba, modo voz guardado, render SSR del resultado y error de conexión. Manuales pendientes: interacción visual real, accesibilidad con lector de pantalla, voz/micrófono y cualquier credencial/proveedor LLM.

## I. Veredicto final

**LISTO PARA PRUEBAS MANUALES.** Build y pruebas relevantes pasaron; las rutas principales respondieron en una integración local real con datos ficticios, DB temporal y fallback offline. Las pruebas de navegador, voz/cámara y LLM real quedan pendientes. No está listo para despliegue público mientras CORS y VITE_API_URL de producción no se configuren y se decidan las condiciones de privacidad.

Cambios frontend: los cuatro archivos enumerados en E y este informe. Backend: sin cambios de código, configuración ni datos; pytest dejó cachés ignoradas como se documenta en B. Sin commits, push, cambio de rama ni despliegue.
