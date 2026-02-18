# Desmos Software Suite for VS Code

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/evan-kolberg.desmos-graphing-calculator)](https://marketplace.visualstudio.com/items?itemName=evan-kolberg.desmos-graphing-calculator)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/evan-kolberg.desmos-graphing-calculator)](https://marketplace.visualstudio.com/items?itemName=evan-kolberg.desmos-graphing-calculator)
[![License: MIT](https://img.shields.io/github/license/evan-kolberg/desmos-vscode-extension)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/evan-kolberg/desmos-vscode-extension/ci.yml?label=CI)](https://github.com/evan-kolberg/desmos-vscode-extension/actions)
[![GitHub Issues](https://img.shields.io/github/issues/evan-kolberg/desmos-vscode-extension)](https://github.com/evan-kolberg/desmos-vscode-extension/issues)
[![Last Commit](https://img.shields.io/github/last-commit/evan-kolberg/desmos-vscode-extension)](https://github.com/evan-kolberg/desmos-vscode-extension/commits)
[![GitHub Stars](https://img.shields.io/github/stars/evan-kolberg/desmos-vscode-extension)](https://github.com/evan-kolberg/desmos-vscode-extension/stargazers)

![demonstration](https://github.com/user-attachments/assets/b130a314-66db-42c5-b041-4fe3ad3709c6)

## Note for users:
> If you have any saved files that are saved with the .json extension, rename these to .desmos so that you can open them up by simply clicking them in the file sidebar. No longer will imports happen via the Desmos extension sidebar button.


## Features
- Offline & local
- Recover unsaved work
- Import & Export data
- Stable & Prerelease versions
- Randomize seed for random() generator
- Web access to other calculators
- Side-by-side panel for viewing & altering Desmos json data
- Live Share integration -- real-time calculator sessions


## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=evan-kolberg.desmos-graphing-calculator), or search for **"Desmos"** in the VS Code Extensions panel.

## Getting Started

1. After installation, find the **Desmos** icon in the Activity Bar (left sidebar).
2. Click any calculator type to open it in a new tab.
3. Use the sidebar buttons to import, export, randomize seed, or recover unsaved work.
4. For best experience, make sure to be inside an active workspace or folder

> **Tip:** Set [`window.confirmBeforeClose`](vscode://settings/window.confirmBeforeClose) to `"always"` in VS Code settings as an extra precaution against losing unsaved work.

## Live Share

When both participants have the extension installed and are in a [VS Code Live Share](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare) session, calculator state syncs automatically and bidirectionally (host -> joiners, joiners -> host)

*** Note!
You must be within a workspace/folder for this to work. Now, when you open a calculator session, it will immediately create a ```.desmos``` file within the active directory. This is how the joiners are able to see/edit your calculator files through Live Share. 

Tutorial:

https://github.com/user-attachments/assets/61cb7d43-9760-447b-9673-c4df8b8521ec


## Supported Calculators
<img src="https://github.com/user-attachments/assets/55e28c86-a449-4bb8-9892-d09d15d143da" width="200" />

| Calculator | Description |
|---|---|
| Graphing | Full-featured graphing with expressions, tables, and sliders |
| 3D | Three-dimensional graphing and visualization |
| Geometry | Interactive geometric constructions |
| Scientific | Standard scientific calculator |
| Four Function | Basic arithmetic calculator |

## Caveats

- Recovery list is capped at 1000 items (by design).

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the [MIT License](LICENSE).

---

*The Desmos API key used is the official demo key: `dcb31709b452b1cf9dc26972add0fda6`*

*Desmos Graphing Calculator is intellectual property of [Desmos Studio, PBC](https://www.desmos.com).*
