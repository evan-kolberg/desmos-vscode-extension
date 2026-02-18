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
const StatusBarAlignment = { Left: 1, Right: 2 };

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
  registerCustomEditorProvider() { return { dispose: () => {} }; },
  showInformationMessage() {},
  showErrorMessage() {},
  showSaveDialog() { return Promise.resolve(null); },
  showOpenDialog() { return Promise.resolve(null); },
  createStatusBarItem() {
    return { text: '', tooltip: '', show() {}, hide() {}, dispose() {} };
  }
};

class RelativePattern {
  constructor(base, pattern) {
    this.base = base;
    this.pattern = pattern;
  }
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class WorkspaceEdit {
  constructor() { this._edits = []; }
  replace(uri, range, text) { this._edits.push({ uri, range, text }); }
  createFile(uri, options) { this._edits.push({ type: 'create', uri, options }); }
  renameFile(oldUri, newUri, options) { this._edits.push({ type: 'rename', oldUri, newUri, options }); }
}

const workspace = {
  workspaceFolders: [{ uri: Uri.file('/tmp/test-workspace') }],
  fs: {
    readFile() { return Promise.resolve(Buffer.from('{}', 'utf8')); },
    writeFile() { return Promise.resolve(); },
    delete() { return Promise.resolve(); }
  },
  createFileSystemWatcher() {
    return {
      onDidChange() { return { dispose: () => {} }; },
      onDidCreate() { return { dispose: () => {} }; },
      dispose() {}
    };
  },
  findFiles() { return Promise.resolve([]); },
  openTextDocument() {
    return Promise.resolve({
      getText() { return '{}'; },
      get lineCount() { return 1; },
      positionAt(offset) { return { line: 0, character: offset }; },
      save() { return Promise.resolve(true); }
    });
  },
  applyEdit() { return Promise.resolve(true); }
};

const extensions = {
  getExtension() { return null; }
};

module.exports = {
  EventEmitter,
  Uri,
  Range,
  WorkspaceEdit,
  RelativePattern,
  ThemeIcon,
  ThemeColor,
  TreeItemCollapsibleState,
  TreeItem,
  ViewColumn,
  StatusBarAlignment,
  commands,
  window,
  workspace,
  extensions,
  _panels
};
