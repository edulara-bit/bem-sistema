const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

const tables = [];
const lines = sql.split('\n');
for (const line of lines) {
  if (line.startsWith('CREATE TABLE `')) {
    const parts = line.split('`');
    if (parts[1]) tables.push(parts[1]);
  }
}
console.log('Tabelas encontradas no bemcenter:');
console.log(tables);

// Procura por tabelas relacionadas a categorias, situações, queixas, protocolos
for (const t of tables) {
  if (t.includes('categ') || t.includes('situac') || t.includes('queix') || t.includes('protocol') || t.includes('medo') || t.includes('apont') || t.includes('sesso') || t.includes('emoc')) {
    console.log('Tabela relevante:', t);
  }
}
