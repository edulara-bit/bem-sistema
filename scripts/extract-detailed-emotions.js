const fs = require('fs');

const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

const marker = 'INSERT INTO `tb_emocoes`';
const start = sql.indexOf(marker);
const end = sql.indexOf(';\n', start);
const insertBlock = sql.substring(start, end);

// Regex para capturar os values: (emo_id, emo_titulo, emo_descricao, emo_frases, emo_letra, emo_tipo)
const regex = /\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*(NULL|'((?:\\'|[^'])*)'),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\)/g;

const emotions = [];
let match;

while ((match = regex.exec(insertBlock)) !== null) {
  const id = match[1];
  const title = match[2].replace(/\\'/g, "'").replace(/\\r/g, '').replace(/\\n/g, '\n');
  const description = match[3].replace(/\\'/g, "'").replace(/\\r/g, '').replace(/\\n/g, '\n');
  const phrases = match[4] === 'NULL' ? null : (match[5] ? match[5].replace(/\\'/g, "'").replace(/\\r/g, '').replace(/\\n/g, '\n') : null);
  const letra = match[6].replace(/\\'/g, "'");
  const tipo = match[7].replace(/\\'/g, "'");

  emotions.push({
    id,
    title,
    description,
    phrases,
    letra,
    tipo,
  });
}

console.log(`Total de emoções extraídas com descrições: ${emotions.length}`);
fs.writeFileSync('src/lib/emotions-detailed.json', JSON.stringify(emotions, null, 2), 'utf8');

if (emotions.length > 0) {
  console.log('Exemplo 1:', emotions[0]);
  console.log('Exemplo 2:', emotions[1]);
}
