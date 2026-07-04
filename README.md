# Harvest tracker

Harvest tracker is a local app for recording garden harvests by season. It helps you log harvested weights, item counts, individual item weights, watering, and estimated value, then view the results as interactive charts.

Your harvest data stays on your computer. Each season can be imported or exported as a JSON file.

## Features

- Create separate seasons for different years or growing periods.
- Log harvests as a batch total or as individual item weights.
- Track item counts together with weight.
- Track watering separately from harvest categories.
- Configure categories with icons, colors, weight display units, and monetary value.
- View recent harvests and charts for weight, count, watering, item distribution, and cumulative value.
- Import and export season files.
- Use the interface in English, Finnish, Swedish, German, French, or Spanish.

## Install

The main Linux release is a Debian package for Debian and Ubuntu based systems:

```sh
sudo apt install ./harvest-tracker-<version>-<arch>.deb
```

Windows installers can be built as `.exe` files and should support Windows 10 22H2 and Windows 11 on 64-bit systems.

macOS builds are experimental until Developer ID signing and notarization are configured. They are intended for technical testing rather than a polished public macOS release.

## Data Location

Installed Linux desktop app:

```text
~/.config/Harvest tracker/data/
```

Development mode:

```text
data/
```

Each season is saved as one JSON file. Harvest weights are stored in grams so the same data can be shown in SI or imperial display units.

## Verify A Download

Release downloads include a `SHA256SUMS` file. To verify the Linux package:

```sh
sha256sum -c SHA256SUMS
```

## Development

Install dependencies:

```sh
npm install
```

Run the web development app:

```sh
npm run dev
```

Run the Electron development app:

```sh
npm run electron:dev
```

Build the web app:

```sh
npm run build
```

Build desktop installers:

```sh
npm run electron:pack
```

See [docs/PUBLICATION.md](docs/PUBLICATION.md) for release packaging notes and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for implementation details.

## License

Harvest tracker is released under the [MIT License](LICENSE).
