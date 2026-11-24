const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

// Mostra alguns registros de tb_sessoes
const sStart = sql.indexOf('INSERT INTO `tb_sessoes`');
if (sStart !== -1) {
  const sEnd = sql.indexOf(';', sStart);
  console.log('=== AMOSTRA tb_sessoes ===');
  console.log(sql.substring(sStart, Math.min(sStart + 2500, sEnd)));
}

// Mostra tb_pacientes
const pStart = sql.indexOf('INSERT INTO `tb_pacientes`');
if (pStart !== -1) {
  const pEnd = sql.indexOf(';', pStart);
  console.log('\n=== AMOSTRA tb_pacientes ===');
  console.log(sql.substring(pStart, Math.min(pStart + 1500, pEnd)));
}
