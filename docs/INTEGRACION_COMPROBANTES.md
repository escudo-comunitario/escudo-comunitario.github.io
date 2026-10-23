# Integración de verificación de comprobantes

## Contrato implementado

El frontend usa `POST /api/analyze-image` con `multipart/form-data`: `imagen`, `texto` y `upz`. El servicio conserva `VITE_API_URL` y no fija el encabezado multipart para que el navegador añada el boundary. El límite de cliente es 5 MiB, igual al valor documentado por defecto de `IMAGE_MAX_MB` en el backend.

El contrato del backend no incluye una señal que distinga el fallback de una respuesta de Gemini. Por eso el frontend presenta cualquier respuesta como una evaluación visual orientativa; no etiqueta ninguna respuesta como confirmación de pago. La vista advierte que la imagen no prueba la recepción y que el destinatario debe consultar su cuenta o aplicación bancaria oficial. La URL detectada en un QR se presenta como texto, no como enlace.

## Backend

Se añadió lectura limitada a `IMAGE_MAX_MB + 1` bytes, comprobación de firma y estructura inicial de JPG/PNG contra el MIME declarado, máximo de cuatro señales incluso al agregar una señal QR, y validación de dos recomendaciones con máximo diez palabras cada una. La inspección de imagen es estructural y no decodifica todos los píxeles; para una decodificación completa se necesitaría acordar e incorporar una biblioteca de imágenes.

No se cambió el significado del veredicto `AUTENTICO`, el prompt que lo genera, la lista de dominios QR ni la forma de la respuesta. La lista QR puede ser incompleta y una coincidencia con ella no confirma una transacción. Estas decisiones requieren revisión del responsable del backend.

## Despliegue pendiente

El backend permite los orígenes configurados en `CORS_ALLOWED_ORIGINS`, separados por comas. Si la variable no está definida, solo permite `http://localhost:5173` y `http://127.0.0.1:5173`. No se conoce en este repositorio la URL de producción del backend ni el origen final de Vercel, por lo que no se añadieron orígenes inventados ni comodines. Antes del despliegue, el responsable debe proporcionar:

- URL HTTPS de producción del backend para configurar `VITE_API_URL` al compilar.
- Origen HTTPS exacto de Vercel que el backend debe permitir mediante CORS.
- Aprobación de los textos y de la semántica que describe `AUTENTICO`.
- Confirmación de quién mantiene los dominios QR autorizados.

El backend registra cada evaluación en el ledger. No conserva los bytes de imagen en el payload registrado; el contexto se anonimiza antes de registrarse y enviarse al proveedor.

## Presentación ciudadana actual

Los resultados de mensajes y comprobantes comparten una tarjeta accesible con conclusión, explicación, señales y recomendaciones. Los hashes, el identificador del ledger, las direcciones de verificación y la URL QR no aparecen en el flujo ciudadano. La lectura en voz alta es iniciada por la persona en ambos modos; en modo guiado también se conserva el acompañamiento automático ya existente.

El backend devuelve `es_autentico`, pero no confirma una transacción bancaria ni identifica si respondió Gemini o el fallback. Por eso `AUTENTICO` se presenta únicamente como coincidencia visual con precaución, nunca como comprobante validado o pago recibido. El fallback actual (`image_offline_cache.IMAGE_FALLBACK`) devuelve `SOSPECHOSO` con el texto «No fue posible analizar la imagen automáticamente»; el frontend reconoce esas frases y lo representa como no comprobable. La detección depende del texto porque el contrato no tiene un campo de estado o fuente de análisis.

El flujo visual ya no solicita contexto ni UPZ. Para conservar el contrato multipart, el frontend envía una frase neutral en `texto` y la UPZ predeterminada actual; el backend requiere `texto` y usa `Bosa Central` si falta UPZ. Esto significa que los registros de comprobantes sin zona elegida pueden quedar agrupados bajo Bosa Central. Conviene confirmar con Diego si se debe aceptar contexto vacío y cómo clasificar estos registros sin inventar una ubicación.

## Cambios de contrato recomendados para el backend (pendientes)

- Añadir un campo de estado explícito que diferencie análisis visual, resultado sospechoso con señales y análisis no concluyente o fallback. No habilitar `VALIDADO` hasta que haya una fuente de evidencia transaccional definida.
- Hacer que el contexto sea opcional o permitir un valor vacío sin fabricar contexto del ciudadano.
- Definir cómo registrar la UPZ cuando la persona no la proporciona, para evitar atribuir automáticamente un comprobante a Bosa Central.

Hasta que esos campos y reglas se acuerden, el frontend usa el contrato existente y aplica una presentación prudente; no simula llamadas a banco ni certifica pagos.
