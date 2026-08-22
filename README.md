# Writing Asset

Link files on your computer (photos, figures, spreadsheets, PDFs, and more) to Obsidian notes **without copying them into the vault**. Each **asset group** (`asset-group` by default) has one catalog note that stores metadata. Writing notes that share the same group value see the **same asset browser**.

**Desktop only** (uses Electron dialogs and Node file access).

## Features

- **Asset groups** — One catalog per group; many writing notes can share it
- **Register local files** — Pick files or drag-and-drop from Finder / File Explorer into the asset window
- **Categories** — Photo, Figure, Table, Document, Other
- **Insert by id** — Notes store a `writing-asset` code block with an id (not a fragile absolute path). Update the catalog once; every note that uses that id updates
- **Embed or link** — Images (and audio/video) can render in the note; PDFs, Office files, and similar open as title links with optional description / kind badge
- **Edit after insert** — Change title, description, and category from the pencil control or **Edit info**; already-inserted blocks refresh
- **Relocate & bulk path fix** — When files move, relocate one item or rewrite path prefixes for a whole group
- **Export folder** — Copy related notes and assets into `Notes/`, `Assets/`, plus `catalog.md` and `README.md`
- **Print / PDF options** — Images only, or all linked asset info (works with Obsidian print and companions such as Beautiful PDF)

## Commands

| Command | Description |
| --- | --- |
| Writing Asset: Browse assets | Open the asset browser for the current note’s group (ribbon: paperclip) |
| Writing Asset: Register files | Add files from a system file dialog |
| Writing Asset: Assign asset group to this note | Set or create the note’s `asset-group` |
| Writing Asset: Export this group to a folder | Export notes + assets for the group |

## Settings

- **Asset group property** — Frontmatter key shared by writing notes and catalogs (default `asset-group`)
- **Catalog note folder** — Where new catalog notes are created (empty = vault root)
- **Asset root folder** — Preferred PC folder for research files; paths under this root are stored relatively
- **When exporting to PDF** — Images only / All linked assets
- **Link card style** — Normal / Simple / Very simple, plus toggles for title, filename, description, and kind

## Usage

1. On a writing note, set:

```yaml
---
asset-group: dissertation
---
```

Or run **Assign asset group to this note**.

2. Open **Browse assets** (or the paperclip ribbon). Add files with **Add files** or drag them onto the window.
3. Select an item → **Insert into note** or **Insert link only**.
4. To change title or description later, use **Edit info** in the browser or the pencil / paperclip on the in-note card.

Inserted blocks look like:

```writing-asset
id: sketch-03
group: dissertation
mode: embed
```

## Installation

### Community plugins (after approval)

Search for **Writing Asset** in Obsidian Settings → Community plugins.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Creative781/writing-asset/releases).
2. Create a folder named `writing-asset` inside your vault’s `.obsidian/plugins/` directory.
3. Place the downloaded files in that folder.
4. Enable the plugin in Obsidian settings (desktop).

### BRAT (beta)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat).
2. Add beta plugin: `https://github.com/Creative781/writing-asset`

## Develop

```bash
npm install
npm run build
```

Copy or symlink this folder to `.obsidian/plugins/writing-asset/` (needs `manifest.json`, `main.js`, `styles.css`).

## License

MIT

## Connect

- **YouTube**: [Creative781](https://www.youtube.com/@creative781)
- **Blog**: [Creative781 Blog](https://creative781.cafe24.com/)

## Support

- **Buy me a coffee**: [Support the developer](https://www.buymeacoffee.com/creative781)

---

# Writing Asset (한국어)

컴퓨터에 있는 파일(사진, 그림, 엑셀, PDF 등)을 옵시디안 글과 **볼트에 복사하지 않고** 연결합니다. **자료 묶음**(`asset-group`, 설정에서 이름 변경 가능)마다 목록 노트 하나에 메타데이터를 두고, 같은 묶음 값을 가진 글 노트는 **같은 자료 화면**을 봅니다.

**데스크톱 전용**입니다 (Electron 대화상자·Node 파일 접근).

## 기능

- **자료 묶음** — 묶음당 목록 노트 하나, 여러 글 노트가 공유
- **로컬 파일 등록** — 파일 선택 또는 탐색기에서 자료 창으로 드래그 앤 드롭
- **카테고리** — 사진, 그림, 표, 문서, 기타
- **id로 삽입** — 본문에는 절대 경로 대신 `writing-asset` 코드 블록의 id. 목록만 고치면 같은 id를 쓰는 노트에 반영
- **임베드 / 링크** — 이미지·음성·영상은 본문에 표시 가능, PDF·Office 등은 제목 링크(+ 설명·종류 뱃지)
- **넣은 뒤에도 수정** — 연필 / **정보 수정**으로 제목·설명·종류 변경, 이미 넣은 블록도 갱신
- **다시 찾기·경로 일괄 수정** — 파일 이동 시 항목별 또는 접두어 일괄 수정
- **폴더로 내보내기** — `Notes/`, `Assets/`, `catalog.md`, `README.md`로 복사
- **인쇄·PDF 옵션** — 이미지만 / 모든 연결 자료 정보 (옵시디안 인쇄 및 Beautiful PDF 등과 함께 사용)

## 명령

| 명령 | 설명 |
| --- | --- |
| Writing Asset: Browse assets | 현재 노트 묶음의 자료 보기 (리본: 클립) |
| Writing Asset: Register files | 시스템 파일 대화상자로 등록 |
| Writing Asset: Assign asset group to this note | 이 노트에 `asset-group` 지정 |
| Writing Asset: Export this group to a folder | 묶음의 노트·자료 내보내기 |

## 설정

- **Asset group property** — 글 노트와 목록이 공유하는 속성 키 (기본 `asset-group`)
- **Catalog note folder** — 새 목록 노트 위치 (비우면 볼트 루트)
- **Asset root folder** — 연구 자료용 PC 폴더. 루트 안은 상대 경로로 저장
- **When exporting to PDF** — Images only / All linked assets
- **Link card style** — Normal / Simple / Very simple + 제목·파일명·설명·종류 토글

## 사용

1. 글 노트에 속성을 두거나 **Assign asset group to this note**를 실행합니다.

```yaml
---
asset-group: dissertation
---
```

2. **Browse assets**(또는 클립 리본)를 연 뒤 **Add files** 또는 창으로 드래그해 등록합니다.
3. 항목을 고른 뒤 **Insert into note** 또는 **Insert link only**.
4. 제목·설명은 나중에 **Edit info** 또는 본문 카드의 연필/클립으로 고칩니다.

본문 블록 예:

```writing-asset
id: sketch-03
group: dissertation
mode: embed
```

## 설치

### 커뮤니티 플러그인 (승인 후)

옵시디안 설정 → 커뮤니티 플러그인에서 **Writing Asset**을 검색합니다.

### 수동 설치

1. [최신 릴리스](https://github.com/Creative781/writing-asset/releases)에서 `main.js`, `manifest.json`, `styles.css`를 받습니다.
2. 볼트의 `.obsidian/plugins/` 아래에 `writing-asset` 폴더를 만듭니다.
3. 받은 파일을 그 폴더에 넣습니다.
4. 옵시디안 설정에서 플러그인을 켭니다 (데스크톱).

### BRAT (베타)

1. [BRAT 플러그인](https://github.com/TfTHacker/obsidian42-brat)을 설치합니다.
2. 베타 플러그인으로 `https://github.com/Creative781/writing-asset` 을 추가합니다.

## 개발

```bash
npm install
npm run build
```

이 폴더를 `.obsidian/plugins/writing-asset/`에 복사하거나 심볼릭 링크합니다 (`manifest.json`, `main.js`, `styles.css` 필요).

## 라이선스

MIT

## 연결

- **YouTube**: [Creative781](https://www.youtube.com/@creative781)
- **Blog**: [Creative781 Blog](https://creative781.cafe24.com/)

## 후원

- **Buy me a coffee**: [Support the developer](https://www.buymeacoffee.com/creative781)
