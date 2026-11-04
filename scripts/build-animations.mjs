import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(new URL('../node_modules/animejs/package.json', import.meta.url), 'utf8'));
const license = await readFile(new URL('../node_modules/animejs/LICENSE.md', import.meta.url), 'utf8');
const result = await build({
  absWorkingDir: root,
  stdin: { contents: "export { animate, createTimeline, stagger, svg } from 'animejs';", resolveDir: root, sourcefile: 'animejs-entry.js' },
  bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2022',
  legalComments: 'eof', write: false,
  banner: { js: `// Anime.js ${version} | MIT | Julian Garnier | /vendor/animejs.LICENSE.txt` },
});
const outputs = new Map([
  ['animejs.js', result.outputFiles[0].text],
  ['animejs.LICENSE.txt', license],
]);
const destination = new URL('../public/vendor/', import.meta.url);
if (process.argv.includes('--check')) {
  for (const [name, content] of outputs) {
    if (await readFile(new URL(name, destination), 'utf8') !== content) throw new Error(`Regenera ${name} con npm run animations:build.`);
  }
  console.log(`Anime.js ${version}: paquete local y licencia actualizados.`);
} else {
  await mkdir(destination, { recursive: true });
  for (const [name, content] of outputs) await writeFile(new URL(name, destination), content);
  console.log(`Anime.js ${version}: paquete local generado (${Math.round(result.outputFiles[0].contents.length / 1024)} KB).`);
}
