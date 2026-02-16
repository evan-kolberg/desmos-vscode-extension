# Desmos Software Suite for VS Code

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/evan-kolberg.desmos-graphing-calculator)](https://marketplace.visualstudio.com/items?itemName=evan-kolberg.desmos-graphing-calculator)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/evan-kolberg.desmos-graphing-calculator)](https://marketplace.visualstudio.com/items?itemName=evan-kolberg.desmos-graphing-calculator)
[![License: MIT](https://img.shields.io/github/license/evan-kolberg/desmos-vscode-extension)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/evan-kolberg/desmos-vscode-extension/ci.yml?label=CI)](https://github.com/evan-kolberg/desmos-vscode-extension/actions)
[![GitHub Issues](https://img.shields.io/github/issues/evan-kolberg/desmos-vscode-extension)](https://github.com/evan-kolberg/desmos-vscode-extension/issues)
[![Last Commit](https://img.shields.io/github/last-commit/evan-kolberg/desmos-vscode-extension)](https://github.com/evan-kolberg/desmos-vscode-extension/commits)
[![GitHub Stars](https://img.shields.io/github/stars/evan-kolberg/desmos-vscode-extension?style=flat)](https://github.com/evan-kolberg/desmos-vscode-extension/stargazers)

<img width="1756" height="1016" alt="Screenshot 2026-02-16 at 3 32 46 PM" src="https://github.com/user-attachments/assets/b130a314-66db-42c5-b041-4fe3ad3709c6" />

## Features

- Offline & local
- Recover unsaved work
- Import & Export data
- Stable & Prerelease versions
- Randomize seed for random() generator
- Web access to other calculators
- Side-by-side panel for viewing & altering Desmos json data

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=evan-kolberg.desmos-graphing-calculator), or search for **"Desmos"** in the VS Code Extensions panel.

## Getting Started

1. After installation, find the **Desmos** icon in the Activity Bar (left sidebar).
2. Click any calculator type to open it in a new tab.
3. Use the sidebar buttons to import, export, randomize seed, or recover unsaved work.

> **Tip:** Set [`window.confirmBeforeClose`](vscode://settings/window.confirmBeforeClose) to `"always"` in VS Code settings as an extra precaution against losing unsaved work.

## Supported Calculators
<img src="https://github.com/user-attachments/assets/55e28c86-a449-4bb8-9892-d09d15d143da" width="200" />

| Calculator | Description |
|---|---|
| Graphing | Full-featured graphing with expressions, tables, and sliders |
| 3D | Three-dimensional graphing and visualization |
| Geometry | Interactive geometric constructions |
| Scientific | Standard scientific calculator |
| Four Function | Basic arithmetic calculator |

## Known Limitations

- Recovery list is capped at 1000 items (by design).
- The embedded web version cannot sign in with Google (iframe security restrictions).
- Import, export, and recovery are not available for the embedded web version.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the [MIT License](LICENSE).

---

*The Desmos API key used is the official demo key: `dcb31709b452b1cf9dc26972add0fda6`*

*Desmos Graphing Calculator is intellectual property of [Desmos Studio, PBC](https://www.desmos.com).*
