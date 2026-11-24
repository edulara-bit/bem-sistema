const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

function showTable(table) {
  const start = sql.indexOf('CREATE TABLE `' + table + '`');
  if (start === -1) return;
  const end = sql.indexOf('ENGINE=', start);
  console.log('=== ' + table + ' ===');
  console.log(sql.substring(start, end + 20));
}

showTable('tb_pacotes');
showTable('tb_pacotes_pacientes');
showTable('tb_emocoes');
showTable('tb_sessoes_emocoes');
showTable('tb_pacientes');
showTable('tb_sessoes');

// Mostra algumas emoções cadastradas
const emoStart = sql.indexOf('INSERT INTO `tb_emocoes`');
if (emoStart !== -1) {
  console.log('=== AMOSTRA EMOÇÕES ===');
  console.log(sql.substring(emoStart, emoStart + 800));
}
