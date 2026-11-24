const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

function inspectTable(tableName) {
  console.log(`\n=================== ${tableName} ===================`);
  const cStart = sql.indexOf(`CREATE TABLE \`${tableName}\``);
  if (cStart !== -1) {
    const cEnd = sql.indexOf(';', cStart);
    console.log(sql.substring(cStart, cEnd));
  }

  const iStart = sql.indexOf(`INSERT INTO \`${tableName}\``);
  if (iStart !== -1) {
    const iEnd = sql.indexOf(';\n', iStart);
    console.log('--- AMOSTRA DADOS ---');
    console.log(sql.substring(iStart, Math.min(iStart + 1500, iEnd !== -1 ? iEnd : iStart + 1500)));
  } else {
    console.log('Sem dados INSERT.');
  }
}

inspectTable('tb_protocolos');
inspectTable('tb_sessoes_protocolos');
inspectTable('tb_condicoes');
inspectTable('tb_categorias');
