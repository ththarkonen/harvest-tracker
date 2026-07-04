# Publication Strategy

This document is for maintainers preparing release artifacts.

Harvest tracker has two runtime targets that share the same Vue UI and JSON data model.

The current UI languages are English, Finnish, Swedish, German, French, and Spanish.

## Development

Use the web development mode while building UI features:

```sh
npm run dev
```

This starts:

- Vite on `http://127.0.0.1:5174`
- The local JSON API on `http://127.0.0.1:5173`

Use Electron development mode when testing the packaged-app path:

```sh
npm run electron:dev
```

Electron uses the same Vue renderer, but reads and writes JSON through IPC instead of the HTTP API.

## Web Build

Build the static frontend:

```sh
npm run build
```

Then run the local web app:

```sh
npm start
```

This serves the built `dist/` files and uses JSON files in the repository `data/` directory.

## Desktop Build

Create a user-facing desktop app:

```sh
npm run electron:pack
```

Electron Builder writes installers to `release/`.

The desktop app does not require the user to run Node manually. Node is embedded inside Electron, and data is saved under Electron's per-user app data directory. This keeps user data separate from the installed application files.

On Linux, the packaged app saves season JSON files in:

```text
~/.config/Harvest tracker/data/
```

The Debian package should be the preferred distribution when users need native file dialogs for importing and exporting season JSON files.

## Data Portability

The web server and Electron app both use the same JSON schema through `server/series-store.js`.

For future import/export features, the safest workflow is:

- Export a season as its JSON file.
- Import a JSON file through the shared store validation path.
- Keep stored weights in grams and treat category unit settings as display preferences.
- Keep water usage as season-level `waterUsage` entries in liters, separate from harvest categories.

## Release Recommendation

For public Linux releases, publish the Electron Debian package:

- Linux: `.deb`

The Linux release avoids AppImage because AppImage Type 2 requires `libfuse.so.2`, which is not installed by default on many modern Ubuntu systems. Do not publish AppImage as the primary release artifact.

The Debian package uses `build/deb-after-install.sh` to configure Electron's Chromium sandbox helper. The script always sets `/opt/harvest-tracker/chrome-sandbox` to `root:root` and mode `4755`, avoiding runtime failures on systems where Electron's default user-namespace probe is misleading.

The web build should remain useful for development, self-hosting, and debugging, but the `.deb` package is the primary "run without Node" distribution.

Windows and macOS installers can also be produced with Electron Builder:

- Windows: NSIS `.exe`
- macOS: experimental `.dmg`

Release artifact filenames should use lowercase hyphenated names without spaces. The configured examples are `harvest-tracker-<version>-<arch>.deb`, `harvest-tracker-<version>-<arch>-setup.exe`, and `harvest-tracker-<version>-<arch>-experimental.dmg`.

The macOS build is experimental until Developer ID signing and notarization are configured. It is useful for technical testing, but it should not be presented as the polished public macOS installer yet.

## Local Linux Package

To build the Linux package locally:

```sh
npm install
npm run build
npx electron-builder --linux deb
cd release
sha256sum harvest-tracker-<version>-<arch>.deb > SHA256SUMS
```

The generated `release/` directory is ignored by Git and should not be committed.

The GitHub Actions workflow in `.github/workflows/release.yml` builds Linux, Windows, and experimental macOS installers on their native runners.

When the workflow runs from a tag such as `v1.1.0`, it creates or updates the GitHub Release for that tag and uploads the installers plus one combined `SHA256SUMS` file. When the workflow is started manually from the Actions tab, it only uploads workflow artifacts for testing.
