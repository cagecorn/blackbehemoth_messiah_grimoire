import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const twemojiDir = path.join(__dirname, 'node_modules', 'twemoji', 'assets', 'svg');
const destDir = path.join(__dirname, 'public', 'assets', 'emojis');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

if (!fs.existsSync(twemojiDir)) {
    console.error(`Twemoji SVG directory not found at: ${twemojiDir}`);
    // Download them directly if package doesn't bundle them
    process.exit(1);
}

const files = fs.readdirSync(twemojiDir);
let count = 0;
files.forEach(file => {
    fs.copyFileSync(path.join(twemojiDir, file), path.join(destDir, file));
    count++;
});
console.log(`Copied ${count} emojis to public/assets/emojis`);
