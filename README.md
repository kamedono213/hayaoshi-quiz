# はやおしクイズ(早押しクイズの練習アプリ)

問題文が1文字ずつ出てきて、分かったところで「押す」→ 答える、競技クイズの早押しを練習するスマホ向けWebアプリ(PWA)。

- 公開URL: https://kamedono213.github.io/hayaoshi-quiz/
- 問題: 「効果・現象・法則」の名前を答えるオリジナル問題 236問・12ジャンル(元データは KoukaQuiz の data/effects-*.txt。`node tools/build-data.js` で「〜を何という?」の短文形式に直す)
- 答え方: 「口で答えて自分で採点(○×)」/「4択」。読み終わって約3秒で時間切れ
- 速さ: ゆっくり5字/秒・ふつう9字/秒・はやい15字/秒
- 記録: 正解率と「押した位置の平均(%)」(小さいほど早押し)。この端末のブラウザに保存
- 印刷できる問題集とCSVは BOOTH「けんていドリル」で販売(アプリから案内)

## 作り方
- `node tools/build-data.js` … app/data/questions.json
- `node tools/make-icons.js` / `node tools/build-pages.js` … アイコン / docs/(GitHub Pages用)
- `node serve.js docs` … http://localhost:5399
