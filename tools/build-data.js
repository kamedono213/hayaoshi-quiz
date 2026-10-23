// 問題データを作る: 効果・現象クイズ(KoukaQuiz)の元データを、競技クイズの「短文」形式(〜を何という?)に直す。
// 出力: app/data/questions.json  実行: node tools/build-data.js
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '../../KoukaQuiz/data');
const out = [];
let cat = '';
for (const f of fs.readdirSync(SRC).filter(f => /^effects-\d+\.txt$/.test(f)).sort()) {
  for (const line of fs.readFileSync(path.join(SRC, f), 'utf8').split(/\r?\n/)) {
    if (!line || line[0] === '#') continue;
    if (line[0] === '@') { cat = line.split('|')[1]; continue; }
    const [a, d, e] = line.split('|');
    if (!/。$/.test(d)) throw new Error('説明が「。」で終わっていない: ' + a);
    out.push({ id: out.length + 1, cat, q: d.replace(/。$/, 'を何という?'), a, exp: e });
  }
}
// 答えの言葉(語尾を除く)が問題文に入っていないか
const core = a => a.replace(/(効果|現象|の法則|法則|バイアス|症候群|コンプレックス|のパラドックス|パラドックス|理論|仮説)$/, '');
const leak = out.filter(x => core(x.a).length >= 2 && x.q.includes(core(x.a)));
if (leak.length) console.warn('答えが問題文に入っているかも:', leak.map(x => x.a).join(', '));
fs.writeFileSync(path.join(__dirname, '../app/data/questions.json'), JSON.stringify(out));
console.log('questions', out.length, 'categories', [...new Set(out.map(x => x.cat))].length);
