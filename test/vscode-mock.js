// Mock for the vscode module used in unit tests

class EventEmitter {
  constructor() {
    this.listeners = [];
  }
  fire(data) {
    this.listeners.forEach(fn => fn(data));
  }
  get event() {
    return (fn) => {
      this.listeners.push(fn);
      return { dispose: () => {} };
    };
  }
}

class Uri {
  constructor(fsPath) {
    this.fsPath = fsPath;
    this.scheme = 'file';
    this.path = fsPath;
  }
  toString() {
    return `file://${this.fsPath}`;
  }
  static file(p) {
    return new Uri(p);
  }
  static joinPath(base, ...segments) {
    const joined = [base.fsPath, ...segments].join('/');
    return new Uri(joined);
  }
}

class ThemeIcon {
  constructor(id, color) {
    this.id = id;
    this.color = color;
  }
}

class ThemeColor {
  constructor(id) {
    this.id = id;
  }
}

const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
};

class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState || TreeItemCollapsibleState.None;
  }
}

const ViewColumn = { One: 1, Two: 2, Three: 3 };

const commands = {
  _registered: {},
  registerCommand(id, handler) {
    commands._registered[id] = handler;
    return { dispose: () => { delete commands._registered[id]; } };
  }
};

const _panels = [];

const window = {
  createWebviewPanel(viewType, title, viewColumn, options) {
    const panel = {
      viewType,
      title,
      viewColumn,
      options,
      visible: true,
      webview: {
        html: '',
        _messageHandlers: [],
        asWebviewUri(uri) { return uri; },
        onDidReceiveMessage(handler) {
          panel.webview._messageHandlers.push(handler);
          return { dispose: () => {} };
        },
        postMessage(msg) {
          return Promise.resolve(true);
        }
      },
      _disposeHandlers: [],
      onDidDispose(handler) {
        panel._disposeHandlers.push(handler);
        return { dispose: () => {} };
      },
      dispose() {
        panel._disposeHandlers.forEach(fn => fn());
      }
    };
    _panels.push(panel);
    return panel;
  },
  registerTreeDataProvider() {},
  showInformationMessage() {},
  showErrorMessage() {},
  showSaveDialog() { return Promise.resolve(null); },
  showOpenDialog() { return Promise.resolve(null); }
};

const workspace = {};

module.exports = {
  EventEmitter,
  Uri,
  ThemeIcon,
  ThemeColor,
  TreeItemCollapsibleState,
  TreeItem,
  ViewColumn,
  commands,
  window,
  workspace,
  _panels
};
