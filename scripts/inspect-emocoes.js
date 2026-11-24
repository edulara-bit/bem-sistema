const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

const tStart = sql.indexOf('CREATE TABLE `tb_emocoes`');
const tEnd = sql.indexOf(';', tStart);
console.log('=== DEFINIÇÃO DA TABELA tb_emocoes ===');
console.log(sql.substring(tStart, tEnd));

// Mostra o primeiro INSERT de tb_emocoes
const iStart = sql.indexOf('INSERT INTO `tb_emocoes`');
const iEnd = sql.indexOf(';', iStart);
console.log('\n=== INSERT tb_emocoes ===');
console.log(sql.substring(iStart, Math.min(iStart + 2000, iEnd)));

// Verifica tb_sessoes_emocoes
const seStart = sql.indexOf('CREATE TABLE `tb_sessoes_emocoes`');
const seEnd = sql.indexOf(';', seStart);
console.log('\n=== DEFINIÇÃO DA TABELA tb_sessoes_emocoes ===');
console.log(sql.substring(seStart, seEnd));

// Verifica tb_sessoes
const sStart = sql.indexOf('CREATE TABLE `tb_sessoes`');
const sEnd = sql.indexOf(';', sStart);
console.log('\n=== DEFINIÇÃO DA TABELA tb_sessoes ===');
console.log(sql.substring(sStart, sEnd));
