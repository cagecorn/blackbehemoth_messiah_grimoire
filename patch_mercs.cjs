const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'modules', 'Player');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let patched = false;

    // Patch getSkillProgress
    if (content.includes('getSkillProgress() {') && content.includes('if (!this.skill) return 0;')) {
        content = content.replace(
            /getSkillProgress\(\) \{\s*if \(\!this\.skill\) return 0;/g,
            'getSkillProgress() {\n        if (!this.skill || !this.scene || !this.scene.time) return 0;'
        );
        patched = true;
    }

    // Patch super.update
    if (content.includes('super.update(time, delta);')) {
        if (!content.includes('if (!this.active || !this.scene) return;')) {
            content = content.replace(
                /super\.update\(time\, delta\);/g,
                'super.update(time, delta);\n        if (!this.active || !this.scene) return;'
            );
            patched = true;
        }
    }

    if (patched) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Patched ' + file);
    }
});
