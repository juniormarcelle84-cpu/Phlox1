import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const zipPath = path.join(rootDir, 'infinityfree-phlox-togo.zip');

if (!fs.existsSync(distDir)) {
  console.error('Error: "dist" folder not found. Please run "npm run build" first.');
  process.exit(1);
}

const output = fs.createWriteStream(zipPath);
const archive = new ZipArchive({
  zlib: { level: 9 }
});

output.on('close', () => {
  const sizeMb = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`\n======================================================`);
  console.log(`✅ Archive ZIP InfinityFree générée avec succès !`);
  console.log(`📁 Fichier : ${zipPath}`);
  console.log(`📦 Taille  : ${sizeMb} Mo (${archive.pointer()} octets)`);
  console.log(`======================================================\n`);
  console.log(`🚀 Étapes pour InfinityFree :`);
  console.log(`1. Connectez-vous sur votre panneau InfinityFree (cPanel).`);
  console.log(`2. Ouvrez Online File Manager.`);
  console.log(`3. Rendez-vous dans le dossier "htdocs" de votre nom de domaine.`);
  console.log(`4. Cliquez sur "Upload" -> "Upload Zip" et choisissez "infinityfree-phlox-togo.zip".`);
  console.log(`5. Confirmez l'extraction automatique.`);
  console.log(`6. Votre boutique Phlox Togo et son backend PHP sont en ligne !\n`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Append all files and folders from dist, including hidden files like .htaccess
archive.glob('**/*', {
  cwd: distDir,
  dot: true
});

archive.finalize();
