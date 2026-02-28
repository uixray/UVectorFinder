import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default defineConfig([
  {
    name: 'sandbox',
    entry: { code: 'src/code.ts' },
    format: ['iife'],
    outDir: 'dist',
    minify: false,
    sourcemap: false,
    target: 'es2017',
    noExternal: [/.*/],
    globalName: 'PluginCode',
    outExtension: () => ({ js: '.js' }),
  },
  {
    name: 'ui',
    entry: { ui: 'src/ui/ui.ts' },
    format: ['iife'],
    outDir: 'dist',
    minify: false,
    sourcemap: false,
    target: 'es2017',
    noExternal: [/.*/],
    globalName: 'PluginUI',
    outExtension: () => ({ js: '.js' }),
    onSuccess: async () => {
      mkdirSync('dist', { recursive: true });
      const html = readFileSync('src/ui/ui.html', 'utf-8');
      const css = readFileSync('src/ui/styles.css', 'utf-8');
      const js = readFileSync('dist/ui.js', 'utf-8');
      let result = html.replace('/* __INLINE_CSS__ */', css);
      result = result.replace('/* __INLINE_JS__ */', js);
      writeFileSync('dist/ui.html', result);
    },
  },
]);
