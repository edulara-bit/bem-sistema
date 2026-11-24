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
    title: m[2],
    parentId: parseInt(m[3]),
  });
}

// Organiza em categorias e subcategorias
const categories = [
  {
    id: 2,
    name: 'Medos',
    items: protocolos.filter(p => p.parentId === 2).map(p => ({ id: p.id, title: p.title }))
  },
  {
    id: 3,
    name: 'Relacionamento',
    items: protocolos.filter(p => p.parentId === 3).map(p => ({ id: p.id, title: p.title }))
  },
  {
    id: 1,
    name: 'Timeline',
    subcategories: [
      {
        id: 4,
        name: 'Passado',
        items: protocolos.filter(p => p.parentId === 4 || p.parentId === 7 || p.parentId === 8 || p.parentId === 10).map(p => ({ id: p.id, title: p.title }))
      },
      {
        id: 5,
        name: 'Presente',
        items: protocolos.filter(p => p.parentId === 5 || p.parentId === 11 || p.parentId === 12 || p.parentId === 13 || p.parentId === 28 || p.parentId === 30).map(p => ({ id: p.id, title: p.title }))
      },
      {
        id: 6,
        name: 'Futuro',
        items: [{ id: 6, title: 'Projeção / Futuro' }]
      }
    ]
  }
];

fs.writeFileSync('src/lib/protocols-data.json', JSON.stringify({ protocols: protocolos, categories }, null, 2), 'utf8');
console.log('✅ protocols-data.json gerado com sucesso!');
