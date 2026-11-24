const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

const start = sql.indexOf('INSERT INTO `tb_emocoes`');
const end = sql.indexOf(';\n', start);
const content = sql.substring(start, end);
const regex = /\((\d+),\s*'([^']+)',\s*'([^']*)',\s*([^,]+),\s*'([^']+)',\s*'([^']+)'\)/g;

let match;
const emocoes = [];
while ((match = regex.exec(content)) !== null) {
  emocoes.push({
    id: match[1],
    title: match[2],
    letra: match[5],
    tipo: match[6],
  });
}

console.log('Total de emoções encontradas:', emocoes.length);
console.log('Amostra:', emocoes.slice(0, 15));
fs.writeFileSync('src/lib/emotions-data.json', JSON.stringify(emocoes, null, 2));
console.log('Salvo em src/lib/emotions-data.json');
