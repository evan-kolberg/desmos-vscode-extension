const vscode = require('vscode');

let api = null;
let sharedService = null;
let onSessionChange_ = null;
let onRemoteState_ = null;
let broadcastTimer = null;

async function getApi() {
  const ext = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
  if (!ext) return null;
  if (!ext.isActive) await ext.activate();
  if (ext.exports && typeof ext.exports.getApi === 'function') {
    return await ext.exports.getApi('1.0.0');
  }
  return ext.exports || null;
}

function role(key) {
  if (api && api.Role && api.Role[key] !== undefined) return api.Role[key];
  return { None: 0, Host: 1, Guest: 2 }[key];
}

async function setupSharedService() {
  sharedService = null;
  if (!api || !api.session || api.session.role === role('None')) return;
  try {
    if (api.session.role === role('Host')) {
      sharedService = await api.shareService('desmos-calculator');
    } else if (api.session.role === role('Guest')) {
      sharedService = await api.getSharedService('desmos-calculator');
    }
    if (sharedService) {
      sharedService.onNotify('stateUpdate', ({ state, calculatorType }) => {
        if (onRemoteState_) onRemoteState_(state, calculatorType);
      });
    }
  } catch {}
}

async function initialize(context, onSessionChangeCallback, onRemoteState) {
  onSessionChange_ = onSessionChangeCallback;
  onRemoteState_ = onRemoteState;
  const liveShare = await getApi();
  if (!liveShare) return;
  api = liveShare;

  context.subscriptions.push(
    api.onDidChangeSession(async () => {
      await setupSharedService();
      if (onSessionChange_) onSessionChange_();
    })
  );

  if (api.session && api.session.role !== role('None')) {
    await setupSharedService();
    if (onSessionChange_) onSessionChange_();
  }
}

function isActive() {
  return !!(api && api.session && api.session.role !== role('None'));
}

function isGuest() {
  return !!(api && api.session && api.session.role === role('Guest'));
}

function getSessionRole() {
  if (!api || !api.session) return null;
  if (api.session.role === role('Host')) return 'Host';
  if (api.session.role === role('Guest')) return 'Guest';
  return null;
}

function broadcastState(state, calculatorType) {
  if (!sharedService) return;
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    try { sharedService.notify('stateUpdate', { state, calculatorType }); } catch {}
  }, 150);
}

module.exports = { initialize, isActive, isGuest, getSessionRole, broadcastState };
