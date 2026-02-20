import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { parse } from 'twemoji-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const destDir = path.join(__dirname, 'public', 'assets', 'emojis');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// We need a list of all emojis to download.
// Instead of hardcoding all Unicode, let's fetch a list or use a comprehensive list.
// For expediency, we download the dataset from unicode.org or similar, but
// let's grab a popular emoji list json for 14.0 or just a defined array for the game's actual currencies.
// Since the user said "Download all twitter emojis. they will act as materials=currency",
// there are over 3600 emojis. Let's download a predefined set of "materials" or grab a list from an API.

// For now, let's get a list from a public github emoji raw json
const EMOJI_LIST_URL = 'https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json';

https.get(EMOJI_LIST_URL, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            let downloaded = 0;
            let total = parsedData.length;
            console.log(`Found ${total} emojis. Starting download...`);

            parsedData.forEach(entry => {
                const char = entry.emoji;
                if (!char) return;

                const entities = parse(char);
                if (entities.length > 0) {
                    const url = entities[0].url;
                    // change 72x72 to svg format url
                    // "https://twemoji.maxcdn.com/v/14.0.2/72x72/1f600.png"
                    // -> "https://twemoji.maxcdn.com/v/14.0.2/svg/1f600.svg"
                    const svgUrl = url.replace('72x72', 'svg').replace('.png', '.svg');
                    const fileName = svgUrl.split('/').pop();
                    const filePath = path.join(destDir, fileName);

                    if (!fs.existsSync(filePath)) {
                        https.get(svgUrl, (downloadRes) => {
                            if (downloadRes.statusCode === 200) {
                                const fileStream = fs.createWriteStream(filePath);
                                downloadRes.pipe(fileStream);
                                downloadRes.on('end', () => {
                                    downloaded++;
                                    if (downloaded % 100 === 0) console.log(`Downloaded ${downloaded}...`);
                                });
                            }
                        }).on('error', (e) => {
                            // Ignored silently, some might not exist in twemoji
                        });
                    }
                }
            });
        } catch (e) {
            console.error(e.message);
        }
    });
});
