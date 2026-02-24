const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const buildConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  external: ['vscode'],
  sourcemap: true,
};

if (watch) {
  esbuild
    .context(buildConfig)
    .then((ctx) => {
      console.log('Watching for changes...');
      return ctx.watch();
    })
    .catch(() => process.exit(1));
} else {
  esbuild.build(buildConfig).catch(() => process.exit(1));
}
