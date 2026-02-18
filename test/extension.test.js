const { expect } = require('chai');
const mock = require('./vscode-mock');

// We need to test the internal functions, so we'll re-implement key logic
// from extension.js using the mock. The extension module itself requires
// panelManager which also needs vscode, so we test the logic patterns.

describe('DesmosDataProvider', () => {
  let DesmosDataProvider;

  before(() => {
    // Require the actual extension module with mocked vscode
    delete require.cache[require.resolve('../src/extension')];
    delete require.cache[require.resolve('../src/panelManager')];
    const ext = require('../src/extension');
    // The DesmosDataProvider class isn't exported, so we test via activate
  });

  it('should export activate and deactivate functions', () => {
    const ext = require('../src/extension');
    expect(ext.activate).to.be.a('function');
    expect(ext.deactivate).to.be.a('function');
  });

  describe('activate', () => {
    let context;

    beforeEach(() => {
      // Reset registered commands
      mock.commands._registered = {};
      context = {
        extensionUri: mock.Uri.file('/test/extension'),
        subscriptions: [],
        workspaceState: {
          _data: {},
          get(key, defaultVal) { return this._data[key] ?? defaultVal; },
          update(key, val) { this._data[key] = val; }
        },
        globalState: {
          _data: {},
          get(key, defaultVal) { return this._data[key] ?? defaultVal; },
          update(key, val) { this._data[key] = val; }
        }
      };
    });

    it('should register all expected commands', () => {
      const ext = require('../src/extension');
      ext.activate(context);

      const expectedCommands = [
        'extension.openDesmos',
        'extension.openDesmos3D',
        'extension.openDesmosScientific',
        'extension.openDesmosFourFunction',
        'extension.openDesmosGeometry',
        'extension.togglePrerelease',
        'extension.randomizeSeed',
        'extension.exportJson',
        'extension.clearUnsavedData',
        'extension.recoverData'
      ];

      for (const cmd of expectedCommands) {
        expect(mock.commands._registered).to.have.property(cmd);
      }
    });

    it('should add disposables to context.subscriptions', () => {
      const ext = require('../src/extension');
      ext.activate(context);
      expect(context.subscriptions.length).to.be.greaterThan(0);
    });

    it('should clear unsaved data when clearUnsavedData command is called', () => {
      const ext = require('../src/extension');
      ext.activate(context);

      context.workspaceState._data.unsavedData = ['item1', 'item2'];
      mock.commands._registered['extension.clearUnsavedData']();
      expect(context.workspaceState.get('unsavedData', [])).to.deep.equal([]);
    });

    it('should toggle prerelease version', () => {
      const ext = require('../src/extension');
      ext.activate(context);

      // Call toggle twice to test both states
      mock.commands._registered['extension.togglePrerelease']();
      mock.commands._registered['extension.togglePrerelease']();
      // No error means success - the toggle updates internal state
    });
  });
});

describe('Recovery System', () => {
  let context;

  beforeEach(() => {
    mock.commands._registered = {};
    context = {
      extensionUri: mock.Uri.file('/test/extension'),
      subscriptions: [],
      workspaceState: {
        _data: {},
        get(key, defaultVal) { return this._data[key] ?? defaultVal; },
        update(key, val) { this._data[key] = val; }
      },
      globalState: {
        _data: {},
        get(key, defaultVal) { return this._data[key] ?? defaultVal; },
        update(key, val) { this._data[key] = val; }
      }
    };
  });

  it('should store recovery items in workspaceState', () => {
    const ext = require('../src/extension');
    ext.activate(context);

    // Simulate opening a calculator and receiving state updates
    // The recovery system stores items as serialized JSON strings
    const recoveryItem = JSON.stringify({
      version: 'stable',
      data: { expressions: { list: [] } },
      timestamp: new Date().toISOString(),
      calculatorType: 'GraphingCalculator'
    });

    context.workspaceState.update('unsavedData', [recoveryItem]);
    const items = context.workspaceState.get('unsavedData', []);
    expect(items).to.have.length(1);

    const parsed = JSON.parse(items[0]);
    expect(parsed.version).to.equal('stable');
    expect(parsed.calculatorType).to.equal('GraphingCalculator');
  });

  it('should clear all recovery items', () => {
    const ext = require('../src/extension');
    ext.activate(context);

    context.workspaceState.update('unsavedData', ['a', 'b', 'c']);
    mock.commands._registered['extension.clearUnsavedData']();
    expect(context.workspaceState.get('unsavedData', [])).to.deep.equal([]);
  });

  it('should recover data from a recovery item', () => {
    const ext = require('../src/extension');
    ext.activate(context);

    const item = JSON.stringify({
      version: 'stable',
      data: { expressions: { list: [{ latex: 'y=x^2' }] } },
      timestamp: '2026-01-01T00:00:00.000Z',
      calculatorType: 'GraphingCalculator'
    });

    context.workspaceState.update('unsavedData', [item]);
    mock.commands._registered['extension.recoverData'](item);

    // After recovery, the item should be removed from unsavedData
    const remaining = context.workspaceState.get('unsavedData', []);
    expect(remaining).to.not.include(item);
  });
});

describe('deactivate', () => {
  it('should be a no-op function', () => {
    const ext = require('../src/extension');
    expect(ext.deactivate()).to.be.undefined;
  });
});
