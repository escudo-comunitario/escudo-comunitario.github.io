import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

function pwaServiceWorker() {
  return {
    name: 'escudo-pwa-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const generatedAssets = Object.values(bundle)
        .filter((item) => item.type === 'chunk' || (item.type === 'asset' && /\.css$|\.html$/i.test(item.fileName)))
        .map((item) => `/${item.fileName}`);
      const precacheUrls = [...new Set([
        '/',
        '/index.html',
        '/manifest.json',
        '/icons/icon-180.png',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        ...generatedAssets,
      ])];
      const template = readFileSync(resolve(projectRoot, 'src/pwa/service-worker-template.js'), 'utf8');
      const buildHash = createHash('sha256').update(template).update(JSON.stringify(precacheUrls));
      for (const url of precacheUrls) {
        const fileName = url === '/' ? 'index.html' : url.replace(/^\//, '');
        const asset = bundle[fileName];
        if (asset?.type === 'chunk') buildHash.update(asset.code);
        else if (asset?.type === 'asset') buildHash.update(asset.source);
        else {
          const sourcePath = fileName === 'index.html'
            ? resolve(projectRoot, 'index.html')
            : resolve(projectRoot, 'public', fileName);
          buildHash.update(readFileSync(sourcePath));
        }
      }
      const buildId = buildHash.digest('hex').slice(0, 12);
      const serviceWorker = template
        .replace('__BUILD_ID__', buildId)
        .replace('__PRECACHE_URLS__', JSON.stringify(precacheUrls));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorker });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pwaServiceWorker()],
  base: '/',
});
