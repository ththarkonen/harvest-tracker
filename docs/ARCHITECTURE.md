# Architecture

This document is for contributors who want to understand or extend the application.

Harvest tracker is split into three layers.

## Renderer

`src/` contains the Vue 3 application.

- `src/App.vue`: application state, modal orchestration, repository calls.
- `src/components/`: presentational and form components.
- `src/domain/`: framework-independent helpers for translations, units, dates, Plotly setup, and catalog data.
- `src/repositories/seriesRepository.js`: data access adapter. It talks to HTTP in browser mode and Electron IPC in desktop mode.

The renderer does not know where JSON files live. It only calls the repository.

## Storage

`server/series-store.js` owns JSON persistence and validation.

It is shared by:

- `server/index.js`, the local HTTP API.
- `electron/main.cjs`, the desktop application's main process.

Weights are stored in grams. Category unit settings are display/input preferences for the frontend.

Water usage is season-level data stored in `waterUsage`. It is not modeled as a harvest category, so it does not appear in category plots or category totals.

## Runtimes

### Web Runtime

`server/index.js` serves:

- API routes under `/api`
- built Vue assets from `dist/`

Development uses Vite proxying:

- Vite: `127.0.0.1:5174`
- API: `127.0.0.1:5173`

### Desktop Runtime

Electron loads the same Vue build.

Data access goes through:

- `electron/preload.cjs`: exposes a narrow `window.harvestApi`
- `electron/main.cjs`: handles IPC and calls the shared store

The desktop app does not require users to run a Node server.

Season import/export also goes through the repository boundary. Browser mode uses a file picker/download path, while Electron mode uses native open/save dialogs.

## Extension Points

Add new languages in:

- `src/domain/catalog.js`
- `src/domain/translations.js`

Add new plot types in:

- `src/domain/plotly.js`
- `src/components/PlotGrid.vue`

Add storage operations in:

- `server/series-store.js`
- `src/repositories/seriesRepository.js`
- `electron/main.cjs`
- `electron/preload.cjs`
