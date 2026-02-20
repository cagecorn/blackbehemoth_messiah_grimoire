const fs = require('fs');

const PhaserPath = 'node_modules/phaser/src/tilemaps/components/PutTileAt.js';
if (fs.existsSync(PhaserPath)) {
    const code = fs.readFileSync(PhaserPath, 'utf8');
    console.log(code);
} else {
    console.log('Phaser source not found at', PhaserPath);
}
