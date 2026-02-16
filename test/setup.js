// Register vscode mock before any test files load
const Module = require('module');
const mock = require('./vscode-mock');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent) {
  if (request === 'vscode') {
    return 'vscode';
  }
  return originalResolveFilename.call(this, request, parent);
};

require.cache['vscode'] = {
  id: 'vscode',
  filename: 'vscode',
  loaded: true,
  exports: mock
};
