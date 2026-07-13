# C2PA 署名 Web アプリ サンプル

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![C2PA](https://img.shields.io/badge/C2PA-Content%20Credentials-1F6FEB)](https://c2pa.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English](./README-en.md) | 日本語

C2PA SDK が書き込みに対応する AVI、AVIF、DNG、FLAC、GIF、HEIC、HEIF、JPEG、JPEG XL、M4A、MP3、MP4、MOV、PNG、SVG、TIFF、WAV、WebP に Content Credentials を付与できる、ローカル実行向けの Web アプリケーションサンプルです。受け付ける拡張子は `.avi`、`.avif`、`.dng`、`.flac`、`.gif`、`.heic`、`.heif`、`.jpg`、`.jpeg`、`.jxl`、`.m4a`、`.mp3`、`.mp4`、`.mov`、`.png`、`.svg`、`.tif`、`.tiff`、`.wav`、`.webp` です。

この一覧は、アプリに搭載したネイティブ SDK（`c2pa-rs 0.82.1`）の file I/O 書き込み対応表に基づきます。C2PA Technical Specification 2.4 が埋め込み方式を定義する形式でも、この SDK が書き込めない形式は受け付けません。PDF は同 SDKで読み取り専用、`.c2pa` はメディアではなく外部マニフェストストアなので、署名対象のアップロード形式から除外しています。

ブラウザからメディアを登録し、バックエンドで C2PA マニフェストと署名を埋め込みます。署名処理には公式の [`@contentauth/c2pa-node`](https://github.com/contentauth/c2pa-js/tree/main/packages/c2pa-node) を使用します。

## 構成

- `apps/web`: React / Vite のフロントエンド
- `apps/api`: Fastify の API と非同期署名ジョブ
- `packages/shared`: API と UI で共有する TypeScript 型
- `storage`: アップロード元と署名済みファイルの一時保存先
- `scripts/generate-dev-credentials.ps1`: 開発用証明書の生成

ジョブ情報はメモリ、メディアはローカルファイルとして保存します。API の再起動時に前回のジョブとファイルを削除し、署名は常に 1 件ずつ処理します。

## 前提条件

- Node.js 22 以上
- npm
- 開発用証明書を生成する場合は OpenSSL
  - Git for Windows 付属の OpenSSL も自動検出します。

`@contentauth/c2pa-node` はインストール時に Windows、macOS、Linux 向けのネイティブバイナリを取得します。ソースからビルドしない限り Rust は不要です。

現行の `0.6.0` は `c2pa-js` monorepo への移行リリースですが、プラットフォーム別 Release asset が公開されていません。このサンプルは JavaScript API を `0.6.0` に固定したまま、API 互換な直前版 `0.5.5` の公式ネイティブバイナリを `postinstall` で取得し、公開 SHA-256 と照合します。`0.6.x` の asset 公開後は、この互換処理を削除してパッケージ標準のバイナリへ戻せます。

## セットアップ

```powershell
npm install
Copy-Item .env.example .env
.\scripts\generate-dev-credentials.ps1
```

既存ファイルの誤上書きを防ぐため、資格情報が存在する場合は生成スクリプトが停止します。再生成する場合は `credentials` ディレクトリを明示的に削除してから実行してください。

## 起動

```powershell
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:3001>
- Health check: <http://localhost:3001/api/health>

ブラウザでファイル、タイトル、作成者、説明、生成元を入力してください。生成元は C2PA の Digital Source Type として、デジタル撮影、AI 生成、合成コンテンツから選択できます。

### 署名済みコンテンツのマニフェストを検証する

このアプリからダウンロードした署名済みコンテンツファイルを [C2PA Viewer](https://c2paviewer.com/) へ読み込むと、ファイルに埋め込まれた Content Credentials の署名を検証し、C2PA マニフェストの内容を確認できます。C2PA Viewer の案内では、ファイルの処理はブラウザ内で行われます。対応するファイル形式とサイズの上限は同サイトで確認してください。

## 環境変数

| 変数                    | 既定例                       | 説明                       |
| ----------------------- | ---------------------------- | -------------------------- |
| `API_HOST`              | `127.0.0.1`                  | API の listen address      |
| `API_PORT`              | `3001`                       | API ポート                 |
| `WEB_ORIGIN`            | `http://localhost:5173`      | CORS を許可する Web Origin |
| `VITE_API_BASE_URL`     | `http://localhost:3001`      | Web が接続する API URL     |
| `UPLOAD_LIMIT_MB`       | `2048`                       | アップロード上限           |
| `C2PA_CERT_PATH`        | `./credentials/dev-cert.pem` | 署名証明書チェーン         |
| `C2PA_PRIVATE_KEY_PATH` | `./credentials/dev-key.pem`  | PEM 秘密鍵                 |
| `C2PA_ALGORITHM`        | `es256`                      | C2PA 署名アルゴリズム      |
| `C2PA_TSA_URL`          | 空                           | 任意のタイムスタンプ局 URL |

外部の証明書を使用する場合は、証明書チェーンを leaf から順に連結した PEM と、対応する秘密鍵を指定してください。秘密鍵と証明書本文は API へアップロードせず、バックエンドだけが読み込みます。

## Adobe で「不明な発行元」と表示される場合

`scripts/generate-dev-credentials.ps1` が生成する証明書は、このリポジトリ内だけで完結する自己管理の開発用 CA から発行されています。署名そのものは検証できても、Adobe Content Authenticity などの validator はこの CA を信頼していないため、次の警告を表示します。

> この Content Credential は不明な発行元によって発行されました。

警告を一般の利用者環境で消すには、**C2PA Trust List 上の CA へ連鎖する C2PA claim signing certificate を使用して、メディアを再署名する必要があります**。通常の TLS/SSL 証明書、一般的なコード署名証明書、自己署名証明書を使用しても代替できません。また、開発用ルート証明書を自分の Windows 証明書ストアへ追加しても、Adobe の公開 validator が参照する C2PA Trust List は変更されません。

### 1. Generator product の適合手続きを確認する

C2PA の conforming generator product は、C2PA 仕様に準拠したマニフェストを生成し、C2PA Trust List 上の CA が発行した有効な X.509 証明書で claim を署名する必要があります。

公開サービスまたは製品として信頼済み Content Credentials を発行する場合は、次を実施します。

1. [C2PA Conformance Program](https://c2pa.org/conformance/) の要件を確認する。
2. [Expression of Interest form](https://docs.google.com/forms/d/e/1FAIpQLScERZH5rKfoeSu3y6gGbkllkyeAhmF0G-kXS0eXpb2vR238Rg/viewform) から申請する。
3. 製品構成、鍵生成・保管、署名処理、悪用対策などのセキュリティ資料を提出する。
4. C2PA および利用する CA と、必要な assurance level、証明書プロファイル、発行方法を調整する。

適合プログラムと証明書発行は別の工程ですが、C2PA の公式説明では、Trust List 上の CA は conforming generator product に対して claim signing certificate を発行します。検証用途だけのローカルサンプルで適合申請を行わない場合、この警告が残ることは想定された動作です。

### 2. C2PA Trust List 上の CA から証明書を取得する

最新の発行元は [C2PA Conformance Explorer](https://spec.c2pa.org/conformance-explorer/) の **C2PA Trust List** で確認してください。Trust List は更新されるため、README に記載された CA 名ではなく、この一覧を正とします。

CA へ申し込む際は、少なくとも次を確認します。

- **C2PA claim signing certificate** であること。
- 製品の assurance level と C2PA Certificate Policy に適合すること。
- 使用する署名アルゴリズムがアプリの `C2PA_ALGORITHM` と一致すること。
- Adobe の表示に組織名を出す場合、証明書 Subject に `O`（Organization Name、OID `2.5.4.10`）が含まれること。
- leaf 証明書だけでなく、Trust List 上の trust anchor まで検証できる中間証明書を受け取れること。
- 秘密鍵を KMS/HSM 内で生成・保持する必要があるか、CA と確認すること。

証明書を購入できることだけで製品の適合や Adobe 上の表示が自動的に保証されるわけではありません。申請前に CA と C2PA Conformance Program の双方へ用途を伝えてください。

### 3. 証明書チェーンと秘密鍵を準備する

このサンプルの `LocalSigner` は PEM 形式の証明書チェーンと秘密鍵を読み込みます。CA から PKCS#12（`.p12` / `.pfx`）で受領した場合は、OpenSSL で変換できます。

```powershell
# PKCS#8 形式の秘密鍵を抽出する
openssl pkcs12 -in production.pfx -nocerts -nodes |
  openssl pkcs8 -topk8 -nocrypt -out production-key.pem

# leaf と CA 証明書を分けて抽出する
openssl pkcs12 -in production.pfx -clcerts -nokeys -out leaf.pem
openssl pkcs12 -in production.pfx -cacerts -nokeys -chain -out ca-certificates.pem

# leaf を先頭にした署名用チェーンを作成する
Get-Content .\leaf.pem, .\ca-certificates.pem |
  Set-Content .\production-chain.pem -Encoding ascii
```

CA からファイルを個別に受け取った場合も、**leaf、直近の中間 CA、その上位の中間 CA** の順で連結します。通常、root CA は署名データへ含めません。PKCS#12 に root CA も含まれていた場合は `ca-certificates.pem` から除外してください。CA の指定がある場合はその手順を優先します。

```powershell
Get-Content .\leaf.pem, .\intermediate-1.pem, .\intermediate-2.pem |
  Set-Content .\production-chain.pem -Encoding ascii
```

設定前に、秘密鍵と leaf 証明書の公開鍵が一致すること、および証明書の Subject、Issuer、期限、拡張を確認します。

```powershell
openssl x509 -in .\production-chain.pem -noout -subject -issuer -dates -text

openssl pkey -in .\production-key.pem -pubout -outform DER |
  openssl dgst -sha256

openssl x509 -in .\production-chain.pem -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
```

最後の 2 コマンドの SHA-256 値は一致する必要があります。

### 4. アプリの署名資格情報を切り替える

取得したファイルを Git 管理外の安全な場所へ配置し、`.env` を変更します。次は ES256 証明書の例です。

```dotenv
C2PA_CERT_PATH=C:\secure\c2pa\production-chain.pem
C2PA_PRIVATE_KEY_PATH=C:\secure\c2pa\production-key.pem
C2PA_ALGORITHM=es256
C2PA_TSA_URL=https://tsa.example.com/
```

`C2PA_ALGORITHM` は証明書と秘密鍵に対応する値を使用します。設定可能な値は `es256`、`es384`、`es512`、`ps256`、`ps384`、`ps512`、`ed25519` です。TSA URL は CA またはサービス提供者から指定された C2PA 対応 TSA を使用してください。

設定変更後に API を再起動し、新しいファイルを署名します。

```powershell
npm run dev
```

すでに開発用証明書で署名済みのファイルについて、証明書だけを後から差し替えることはできません。新しい資格情報で元メディアから署名済みファイルを再生成してください。

### 5. Adobe Content Authenticity で確認する

1. 新しい資格情報で署名したファイルをダウンロードする。
2. [Adobe Content Authenticity Inspect](https://inspect.cr/) へアップロードする。
3. 発行元、署名時刻、組織名、検証状態を確認する。
4. 警告が残る場合は、マニフェストの `signature_info` と証明書チェーンを確認し、CA へ次を問い合わせる。
   - 発行証明書が現在の C2PA Trust List へ連鎖するか。
   - 必要な中間証明書が署名へ含まれているか。
   - 証明書が C2PA claim signing 用プロファイルと assurance level を満たすか。
   - Adobe 側が参照する Trust List への反映に時間差がないか。

### タイムスタンプについて

C2PA Trust List による発行元の信頼と、C2PA TSA Trust List による署名時刻の信頼は別です。TSA は「不明な発行元」を単独で解消するものではありませんが、証明書の失効・期限切れ後も、証明書が有効だった時点の署名であることを長期的に検証するため、本番運用では使用を推奨します。利用する TSA は [C2PA TSA Trust List](https://github.com/c2pa-org/conformance-public/blob/main/trust-list/C2PA-TSA-TRUST-LIST.pem) へ連鎖するものを選択してください。

### 公式資料

- [Getting a signing certificate](https://opensource.contentauthenticity.org/docs/signing/get-cert/)
- [C2PA trust lists](https://opensource.contentauthenticity.org/docs/conformance/trust-lists/)
- [C2PA Conformance Program](https://opensource.contentauthenticity.org/docs/conformance/)
- [Using a certificate in production](https://opensource.contentauthenticity.org/docs/signing/prod-cert/)
- [C2PA Certificate Policy](https://github.com/c2pa-org/conformance-public/blob/main/docs/current/C2PA%20Certificate%20Policy.pdf)

## API

| Method   | Path                     | 説明                                   |
| -------- | ------------------------ | -------------------------------------- |
| `POST`   | `/api/jobs`              | multipart でメディアとメタデータを登録 |
| `GET`    | `/api/jobs/:id`          | ジョブ状態を取得                       |
| `GET`    | `/api/jobs/:id/file`     | 署名済みファイルを取得                 |
| `GET`    | `/api/jobs/:id/manifest` | 検証済みマニフェストを取得             |
| `DELETE` | `/api/jobs/:id`          | 完了または失敗したジョブを削除         |
| `GET`    | `/api/health`            | API と署名資格情報の準備状態           |

`POST /api/jobs` の multipart field は `file`、`title`、`creator`、`description`、`digitalSourceType` です。

## テストとビルド

```powershell
npm run typecheck
npm test
npm run build
```

## 制約とセキュリティ

- 生成スクリプトの証明書は開発専用です。暗号学的な署名は確認できますが、公開 C2PA trust list では信頼済みと表示されません。
- 本番環境では秘密鍵ファイルを直接配置せず、KMS/HSM と `CallbackSigner` の利用を検討してください。
- 認証、レート制限、ウイルススキャン、永続ジョブ DB、分散キュー、クラウドストレージは実装していません。
- 2 GB の上限は localhost サンプル向けです。公開環境ではリバースプロキシ、ディスク容量、タイムアウトも含めてより小さく制限してください。
- ファイル内容、拡張子、MIME type が一致しない入力は拒否します。

## ライセンス

[MIT License](./LICENSE) © 2026 tokawa-ms
