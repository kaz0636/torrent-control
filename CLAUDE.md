# CLAUDE.md — 自分用フォークの作業メモ

Firefoxアドオン「Torrent Control」の自分用フォーク。本家は mika-si/torrent-control。
**本家への Issue / PR は作らない。** 会話は日本語で。

## ブランチ
- `master` … 本家と同じ状態に保つ（直接コミットしない）
- `fix-fetch-fallback` … 自分用の修正はすべてここ。作業の基準ブランチ

## 入っている修正
1. `src/content-script.js` / `src/index.js`
   本家 0.2.52（コミット cbc2ddb「fix: fetch in page context」）以降、.torrent をページ内の
   `content.fetch` で取得するため CORS に縛られ、別ドメインの .torrent（例: ehtracker.org）が取れない。
   さらに失敗時に `fetchTorrent()` のコールバック内で例外が出て Promise が解決せず、通知も出なかった。
   → ページ内 fetch が失敗したら拡張側 fetch（credentials: 'include'）にフォールバック。
     失敗時は `{error}` を返し、無応答・runtime.lastError も reject する。
2. `src/lib/rutorrent.js`
   ruTorrent の `$enableCSRFCheck` 対策。拡張が出すリクエスト（tabId -1）だけ
   Origin / Referer を ruTorrent 自身のものに書き換える。
3. `src/manifest.json`
   独自ID `torrent-control-csrf-fix@local`、`data_collection_permissions: { required: ["none"] }`、
   バージョンは本家番号＋4桁目（例 0.2.52.2）。

## 配布（AMO）
- AMO に「自分で配布（unlisted）」で登録済み。署名は AMO の Web 画面でユーザーが手動で行う。
- **同じバージョン番号は再アップロード不可**。xpi を作り直すたびに manifest の version を上げる。
- strict_min_version 68 による data_collection_permissions の警告2件は無視してよい（エラーではない）。
- xpi の作り方: `cd src && zip -r ../torrent-control-fix-<version>.xpi .`
- ソースコード提出は不要（ビルド・難読化なし）。

## 本家の更新を取り込む手順
1. ユーザーに GitHub で「Sync fork」して master を最新にしてもらう（または upstream を fetch）
2. `fix-fetch-fallback` を最新 master に rebase（自分のコミットだけを載せ直す）
3. 本家側でフォールバック不具合が直っていれば、該当コミットを外すか、フォーク不要と報告する
4. `npm ci && npm test` が全件通ることを確認
5. manifest の version を「本家番号.1」などに上げて xpi を作成し、ユーザーに渡す

## 利用環境
- ruTorrent 5.3.23 / rTorrent 0.16.28（seedbox、HTTP Basic 認証）
- Torrent Control の認証設定は「HTTP Auth」
