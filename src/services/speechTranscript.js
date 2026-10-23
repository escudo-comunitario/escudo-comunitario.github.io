export function transcriptFromResults(results) {
  return Array.from(results || [])
    .map((item) => item?.[0]?.transcript || '')
    .join('');
}
