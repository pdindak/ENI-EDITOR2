// Electron entrypoint
import { app } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';

async function run() {
  const mainPath = pathToFileURL(path.join(process.cwd(), 'electron', 'main.ts')).toString();
  await import(mainPath);
}

if (process.type === 'browser') {
  run().catch((err) => {
    console.error(err);
    app.quit();
  });
} else {
  run().catch((err) => console.error(err));
}
