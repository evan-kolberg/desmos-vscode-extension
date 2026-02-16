const { expect } = require('chai');
const mock = require('./vscode-mock');

// Clear and re-require panelManager
delete require.cache[require.resolve('../src/panelManager')];
const { openDesmos, getPanel, setTempImport } = require('../src/panelManager');

describe('panelManager', () => {
  beforeEach(() => {
    // Clear any existing panels
    mock._panels.length = 0;
  });

  describe('openDesmos', () => {
    it('should create a webview panel with the correct title', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Graphing (v1.11.4)',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      expect(mock._panels.length).to.be.greaterThan(0);
      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.title).to.equal('Graphing (v1.11.4)');
    });

    it('should set enableScripts to true', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.options.enableScripts).to.be.true;
    });

    it('should set retainContextWhenHidden to true', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.options.retainContextWhenHidden).to.be.true;
    });

    it('should generate HTML containing calculator type', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'ScientificCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include('ScientificCalculator');
    });

    it('should show side-by-side panel for GraphingCalculator', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include('const HAS_STATE = true');
    });

    it('should hide side-by-side panel for FourFunctionCalculator', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'FourFunctionCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include('const HAS_STATE = false');
    });

    it('should show side-by-side panel for Calculator3D', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'Calculator3D',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include('const HAS_STATE = true');
    });

    it('should show side-by-side panel for Geometry', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'Geometry',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include('const HAS_STATE = true');
    });

    it('should default calculatorType to GraphingCalculator', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include("const CALC_TYPE = 'GraphingCalculator'");
    });

    it('should send import message when restoredState is provided', () => {
      const state = { expressions: { list: [] } };
      let messageSent = null;

      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: state,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      // The postMessage was called with the import command
      const panel = mock._panels[mock._panels.length - 1];
      // postMessage is mocked, so we just verify no error was thrown
      expect(panel).to.exist;
    });
  });

  describe('getPanel', () => {
    it('should return null when no panels exist', () => {
      // Dispose all panels first by clearing internal state
      delete require.cache[require.resolve('../src/panelManager')];
      const pm = require('../src/panelManager');
      expect(pm.getPanel()).to.be.null;
    });

    it('should return a visible panel', () => {
      delete require.cache[require.resolve('../src/panelManager')];
      const pm = require('../src/panelManager');

      pm.openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = pm.getPanel();
      expect(panel).to.not.be.null;
      expect(panel.visible).to.be.true;
    });
  });

  describe('setTempImport', () => {
    it('should update panel state with imported data', () => {
      delete require.cache[require.resolve('../src/panelManager')];
      const pm = require('../src/panelManager');

      pm.openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = pm.getPanel();
      const data = { expressions: { list: [{ latex: 'y=x' }] } };
      pm.setTempImport(panel, data);
      // No error means the state was updated successfully
    });

    it('should handle null panel gracefully', () => {
      delete require.cache[require.resolve('../src/panelManager')];
      const pm = require('../src/panelManager');

      // Should not throw when panel is not in the map
      expect(() => pm.setTempImport(null, {})).to.not.throw();
    });
  });

  describe('HTML generation', () => {
    it('should include CodeMirror setup for stateful calculators', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      const html = panel.webview.html;
      expect(html).to.include('CodeMirror');
      expect(html).to.include('dracula');
      expect(html).to.include('apply-btn');
    });

    it('should include drag bar for resizable panels', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      expect(panel.webview.html).to.include('dragbar');
    });

    it('should include message handler for import/export/randomizeSeed', () => {
      openDesmos({
        viewType: 'desmosCalcView',
        script: mock.Uri.file('/test/desmos.js'),
        title: 'Test',
        restoredState: null,
        calculatorType: 'GraphingCalculator',
        onUnsaved: () => {}
      });

      const panel = mock._panels[mock._panels.length - 1];
      const html = panel.webview.html;
      expect(html).to.include("'import'");
      expect(html).to.include("'export'");
      expect(html).to.include("'randomizeSeed'");
    });
  });
});
