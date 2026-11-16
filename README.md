# Linear Algebro

線形代数を図を動かしながら学ぶ、スマートフォン向けの学習サイトです。

公開ページ: https://rikkunn.github.io/linear-algebro/

## 内容

- 全 12 章の解説。ベクトルから固有値、対角化、特異値分解まで
- 指で動かせる図が 15 個
- 用語集 118 語。読み、英語、重要度つき
- 問題集 389 問。用語と定義、理論、計算の 3 種類。計算問題は使う方法を明示

## 動かし方

ビルドは不要です。このフォルダを静的サーバーで配信すると動きます。

```
python3 -m http.server 8000
```

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面の骨組み |
| `assets/style.css` | 見た目 |
| `assets/app.js` | 画面の切り替え、用語集、問題集、学習記録 |
| `assets/plot.js` | 平面の図を描く部品 |
| `assets/viz.js` | 各章の図 |
| `assets/data-chapters.js` | 章の本文 |
| `assets/data-terms.js` | 用語集 |
| `assets/data-quiz.js` | 問題 |
| `assets/vendor/` | KaTeX と Geist フォント |

学習の記録はブラウザの localStorage にだけ保存され、外部には送信しません。

## ライセンス表示

- KaTeX (MIT License) `assets/vendor/katex/LICENSE`
- Geist, Geist Mono (SIL Open Font License 1.1) `assets/vendor/fonts/LICENSE`
