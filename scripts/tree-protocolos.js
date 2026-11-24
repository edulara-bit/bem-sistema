const fs = require('fs');
const sql = fs.readFileSync('C:/xampp/htdocs/backup_hostgator/extracted/backup-11.8.2026_11-56-54_jose7914/mysql/jose7914_bemcenter.sql', 'utf8');

const start = sql.indexOf('INSERT INTO `tb_protocolos`');
const end = sql.indexOf(';\n', start);
const block = sql.substring(start, end);

const regex = /\((\d+),\s*'([^']*)',\s*(\d+),\s*'([^']*)'\)/g;
const protocolos = [];
let m;
while ((m = regex.exec(block)) !== null) {
  protocolos.push({
    id: parseInt(m[1]),
    titulo: m[2],
    pai: parseInt(m[3]),
  });
}

console.log(`Total de protocolos/situações: ${protocolos.length}`);

// Constrói árvore hierárquica
const raiz = protocolos.filter(p => p.pai === 0);
for (const r of raiz) {
  console.log(`\n📁 [${r.id}] ${r.titulo}`);
  const filhos = protocolos.filter(p => p.pai === r.id);
  for (const f of filhos) {
    console.log(`  ├── [${f.id}] ${f.titulo}`);
    const netos = protocolos.filter(p => p.pai === f.id);
    for (const n of netos) {
      console.log(`  │    ├── [${n.id}] ${n.titulo}`);
      const bisnetos = protocolos.filter(p => p.pai === n.id);
      for (const b of bisnetos) {
        console.log(`  │    │    └── [${b.id}] ${b.titulo}`);
      }
    }
  }
}
