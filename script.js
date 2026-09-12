const STORAGE_KEY = 'revision-os-state-v1';

const THEMES = {
  hyperlandNight: {
    label: 'Hyperland Night',
    vars: {
      '--surface': 'rgba(19, 26, 41, 0.88)',
      '--surface-strong': 'rgba(13, 18, 32, 0.94)',
      '--surface-soft': 'rgba(27, 37, 57, 0.72)',
      '--border': 'rgba(255,255,255,0.12)',
      '--text-primary': '#f4f7ff',
      '--text-muted': '#b8c6e8',
      '--danger': '#ff6f7c',
      '--window-min': '#f3c870',
      '--window-max': '#76d58f',
      '--board-bg': '#f8fbff'
    },
    background: 'linear-gradient(135deg, #101626 0%, #1f2537 100%)'
  },
  nord: {
    label: 'Nord',
    vars: {
      '--surface': 'rgba(43, 52, 69, 0.9)',
      '--surface-strong': 'rgba(36, 45, 59, 0.97)',
      '--surface-soft': 'rgba(57, 70, 90, 0.76)',
      '--border': 'rgba(216, 222, 233, 0.18)',
      '--text-primary': '#eceff4',
      '--text-muted': '#c3cbdb',
      '--danger': '#bf616a',
      '--window-min': '#ebcb8b',
      '--window-max': '#a3be8c',
      '--board-bg': '#f6fbff'
    },
    background: 'linear-gradient(120deg, #2e3440 0%, #434c5e 100%)'
  },
  lightSolar: {
    label: 'Light Solar',
    vars: {
      '--surface': 'rgba(250, 250, 245, 0.93)',
      '--surface-strong': 'rgba(237, 237, 226, 0.97)',
      '--surface-soft': 'rgba(229, 228, 214, 0.72)',
      '--border': 'rgba(38, 45, 59, 0.18)',
      '--text-primary': '#1f2430',
      '--text-muted': '#5d6576',
      '--danger': '#d2555f',
      '--window-min': '#c1963f',
      '--window-max': '#3f9150',
      '--board-bg': '#ffffff'
    },
    background: 'linear-gradient(135deg, #f7f0df 0%, #e8eef9 100%)'
  }
};

const APP_CONFIG = [
  { id: 'spotify', title: 'Spotify', icon: '♫' },
  { id: 'browser', title: 'Browser', icon: '🌐' },
  { id: 'discord', title: 'Discord', icon: '💬' },
  { id: 'papers', title: 'Past Papers', icon: '📚' },
  { id: 'whiteboard', title: 'Whiteboard', icon: '🖊️' },
  { id: 'calculator', title: 'Calculator', icon: '🧮' },
  { id: 'settings', title: 'Settings', icon: '⚙️' }
];

const PAPER_DATA = [
  { subject: 'Maths', board: 'AQA', year: '2023', paper: 'Paper 1', url: 'https://filestore.aqa.org.uk/sample-papers-and-mark-schemes/2023/june/AQA-83001-QP-JUN23.PDF' },
  { subject: 'Maths', board: 'Edexcel', year: '2022', paper: 'Paper 2', url: 'https://qualifications.pearson.com/content/dam/pdf/GCSE/Mathematics%20(2015)/Exam-materials/1ma1-2h-que-20220517.pdf' },
  { subject: 'Biology', board: 'AQA', year: '2021', paper: 'Paper 1', url: 'https://filestore.aqa.org.uk/sample-papers-and-mark-schemes/2021/november/AQA-84611H-QP-NOV21.PDF' },
  { subject: 'English Language', board: 'OCR', year: '2020', paper: 'Paper 1', url: 'https://www.ocr.org.uk/Images/509004-question-paper-communicating-information-and-ideas-j351-01.pdf' },
  { subject: 'Chemistry', board: 'Edexcel', year: '2023', paper: 'Paper 1', url: 'https://qualifications.pearson.com/content/dam/pdf/GCSE/Chemistry/2016/exam-materials/1ch0-1h-que-20230515.pdf' }
];

const defaultState = {
  theme: 'hyperlandNight',
  accent: '#67a8ff',
  customBackground: null,
  windows: {},
  zenMode: false,
  spotifyClientId: '',
  discordServerId: ''
};

let state = loadState();
let zIndexSeed = 20;
const windows = new Map();
const browserState = { history: [], index: -1, loadingTimer: null };
const spotifyState = {
  token: null,
  expiresAt: 0,
  player: null,
  deviceId: null,
  scriptReady: !!window.Spotify,
  initialized: false
};
window.onSpotifyWebPlaybackSDKReady = () => {
  spotifyState.scriptReady = true;
};

const desktop = document.getElementById('desktop');
const windowLayer = document.getElementById('window-layer');
const taskbar = document.getElementById('taskbar');
const contextMenu = document.getElementById('context-menu');
const cursor = document.getElementById('custom-cursor');
const zenModeEl = document.getElementById('zen-mode');
const zenClock = document.getElementById('zen-clock');

applyTheme();
applyBackground();
initCursor();
initContextMenu();
initTaskbar();
initShortcuts();
processSpotifyOAuthRedirect();
restoreWindows();
updateZenMode(state.zenMode);
setInterval(updateClock, 1000);
updateClock();

window.addEventListener('click', () => contextMenu.classList.add('hidden'));
window.addEventListener('resize', () => {
  windows.forEach(({ element, id }) => {
    const rect = element.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 150);
    const y = Math.min(rect.top, window.innerHeight - 150);
    element.style.left = `${Math.max(0, x)}px`;
    element.style.top = `${Math.max(0, y)}px`;
    persistWindow(id, element);
  });
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...defaultState,
      ...saved,
      windows: saved.windows || {}
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initTaskbar() {
  taskbar.innerHTML = '';
  APP_CONFIG.forEach((app) => {
    const btn = document.createElement('button');
    btn.dataset.appId = app.id;
    btn.innerHTML = `${app.icon} ${app.title}`;
    btn.addEventListener('click', () => openApp(app.id));
    taskbar.appendChild(btn);
  });
}

function updateTaskbar() {
  [...taskbar.querySelectorAll('button[data-app-id]')].forEach((btn) => {
    const appId = btn.dataset.appId;
    const win = windows.get(appId)?.element;
    btn.classList.toggle('active', !!win && !win.classList.contains('hidden'));
  });
}

function restoreWindows() {
  const shouldOpen = APP_CONFIG.filter((app) => state.windows[app.id]?.open);
  if (!shouldOpen.length) {
    openApp('settings');
    openApp('papers');
    return;
  }
  shouldOpen.forEach((app) => openApp(app.id));
}

function openApp(appId) {
  const existing = windows.get(appId)?.element;
  if (existing) {
    existing.classList.remove('hidden');
    focusWindow(existing);
    persistWindow(appId, existing, { open: true, minimized: false });
    updateTaskbar();
    return;
  }

  const config = APP_CONFIG.find((a) => a.id === appId);
  const windowEl = document.createElement('section');
  windowEl.className = 'window hidden';
  windowEl.dataset.appId = appId;

  const titlebar = document.createElement('div');
  titlebar.className = 'titlebar';
  titlebar.innerHTML = `
    <span>${config.icon} ${config.title}</span>
    <div class="window-controls">
      <button type="button" data-action="minimize" aria-label="Minimize"></button>
      <button type="button" data-action="maximize" aria-label="Maximize"></button>
      <button type="button" data-action="close" aria-label="Close"></button>
    </div>
  `;

  const body = document.createElement('div');
  body.className = 'window-body';
  mountAppContent(appId, body);

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';

  windowEl.append(titlebar, body, resizeHandle);
  windowLayer.appendChild(windowEl);

  const saved = state.windows[appId] || {};
  const left = saved.x ?? Math.max(20, 70 + windows.size * 28);
  const top = saved.y ?? Math.max(20, 56 + windows.size * 20);
  const width = saved.w ?? 560;
  const height = saved.h ?? 430;

  windowEl.style.left = `${left}px`;
  windowEl.style.top = `${top}px`;
  windowEl.style.width = `${width}px`;
  windowEl.style.height = `${height}px`;

  initWindowInteractions(windowEl, titlebar, resizeHandle);

  windows.set(appId, { id: appId, element: windowEl });
  requestAnimationFrame(() => {
    windowEl.classList.remove('hidden');
    focusWindow(windowEl);
  });

  persistWindow(appId, windowEl, { open: true, minimized: false });
  updateTaskbar();
}

function focusWindow(windowEl) {
  windowEl.style.zIndex = String(++zIndexSeed);
  windows.forEach(({ element }) => element.classList.remove('focused'));
  windowEl.classList.add('focused');
}

function initWindowInteractions(windowEl, titlebar, resizeHandle) {
  windowEl.addEventListener('mousedown', () => focusWindow(windowEl));

  titlebar.addEventListener('dblclick', () => toggleMaximize(windowEl));

  titlebar.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) return;
    event.preventDefault();
    focusWindow(windowEl);

    const startX = event.clientX;
    const startY = event.clientY;
    const rect = windowEl.getBoundingClientRect();

    const onMove = (moveEvent) => {
      const nextX = Math.min(Math.max(0, rect.left + moveEvent.clientX - startX), window.innerWidth - 180);
      const nextY = Math.min(Math.max(0, rect.top + moveEvent.clientY - startY), window.innerHeight - 130);
      windowEl.style.left = `${nextX}px`;
      windowEl.style.top = `${nextY}px`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      persistWindow(windowEl.dataset.appId, windowEl);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  resizeHandle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = windowEl.getBoundingClientRect();

    const onMove = (moveEvent) => {
      const nextW = Math.max(300, rect.width + moveEvent.clientX - startX);
      const nextH = Math.max(220, rect.height + moveEvent.clientY - startY);
      windowEl.style.width = `${Math.min(nextW, window.innerWidth - rect.left)}px`;
      windowEl.style.height = `${Math.min(nextH, window.innerHeight - rect.top - 58)}px`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      persistWindow(windowEl.dataset.appId, windowEl);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  windowEl.querySelectorAll('.window-controls button').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'close') closeWindow(windowEl);
      if (action === 'minimize') minimizeWindow(windowEl);
      if (action === 'maximize') toggleMaximize(windowEl);
    });
  });
}

function closeWindow(windowEl) {
  const appId = windowEl.dataset.appId;
  windowEl.classList.add('hidden');
  persistWindow(appId, windowEl, { open: false, minimized: false });
  setTimeout(() => {
    if (windowEl.parentElement) {
      windowEl.remove();
      windows.delete(appId);
      updateTaskbar();
    }
  }, 170);
}

function minimizeWindow(windowEl) {
  windowEl.classList.add('hidden');
  persistWindow(windowEl.dataset.appId, windowEl, { open: true, minimized: true });
  updateTaskbar();
}

function toggleMaximize(windowEl) {
  const isMax = windowEl.dataset.maximized === '1';
  if (!isMax) {
    windowEl.dataset.prevRect = JSON.stringify({
      left: windowEl.style.left,
      top: windowEl.style.top,
      width: windowEl.style.width,
      height: windowEl.style.height
    });
    windowEl.style.left = '8px';
    windowEl.style.top = '8px';
    windowEl.style.width = `${window.innerWidth - 16}px`;
    windowEl.style.height = `${window.innerHeight - 72}px`;
    windowEl.dataset.maximized = '1';
  } else {
    const prev = JSON.parse(windowEl.dataset.prevRect || '{}');
    windowEl.style.left = prev.left || '90px';
    windowEl.style.top = prev.top || '90px';
    windowEl.style.width = prev.width || '560px';
    windowEl.style.height = prev.height || '430px';
    windowEl.dataset.maximized = '0';
  }
  persistWindow(windowEl.dataset.appId, windowEl);
}

function persistWindow(appId, windowEl, overrides = {}) {
  const rect = windowEl.getBoundingClientRect();
  state.windows[appId] = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    w: Math.round(rect.width),
    h: Math.round(rect.height),
    open: overrides.open ?? true,
    minimized: overrides.minimized ?? windowEl.classList.contains('hidden')
  };
  saveState();
}

function initContextMenu() {
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    const menuItems = [];
    const windowEl = event.target.closest('.window');
    const appButton = event.target.closest('[data-app-id]');

    if (windowEl) {
      const appId = windowEl.dataset.appId;
      menuItems.push({ label: 'Bring to Front', action: () => focusWindow(windowEl) });
      menuItems.push({ label: 'Minimize', action: () => minimizeWindow(windowEl) });
      menuItems.push({ label: 'Close', action: () => closeWindow(windowEl) });
      menuItems.push({ label: `Reopen ${APP_CONFIG.find((a) => a.id === appId).title}`, action: () => openApp(appId) });
    } else if (appButton?.dataset.appId) {
      const appId = appButton.dataset.appId;
      menuItems.push({ label: `Open ${APP_CONFIG.find((a) => a.id === appId).title}`, action: () => openApp(appId) });
      menuItems.push({ label: 'Toggle Zen Mode', action: () => updateZenMode(!state.zenMode) });
    } else {
      menuItems.push({ label: 'Open Settings', action: () => openApp('settings') });
      menuItems.push({ label: 'Open Past Papers', action: () => openApp('papers') });
      menuItems.push({ label: 'Toggle Zen Mode', action: () => updateZenMode(!state.zenMode) });
      menuItems.push({ label: 'Reset Layout', action: resetLayout });
    }

    renderContextMenu(menuItems, event.clientX, event.clientY);
  });
}

function renderContextMenu(items, x, y) {
  contextMenu.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      item.action();
      contextMenu.classList.add('hidden');
    });
    contextMenu.appendChild(btn);
  });

  contextMenu.classList.remove('hidden');
  const maxX = window.innerWidth - 210;
  const maxY = window.innerHeight - 160;
  contextMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
}

function initCursor() {
  window.addEventListener('mousemove', (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });

  window.addEventListener('mouseover', (event) => {
    const interactive = event.target.closest('button, input, select, textarea, a, iframe, .resize-handle, .titlebar');
    cursor.classList.toggle('hovering', !!interactive);
  });

  window.addEventListener('mousedown', () => cursor.classList.add('pressed'));
  window.addEventListener('mouseup', () => cursor.classList.remove('pressed'));
}

function initShortcuts() {
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      updateZenMode(!state.zenMode);
    }
  });
}

function mountAppContent(appId, mountNode) {
  const modules = {
    spotify: spotifyModule,
    browser: browserModule,
    discord: discordModule,
    papers: papersModule,
    whiteboard: whiteboardModule,
    calculator: calculatorModule,
    settings: settingsModule
  };
  modules[appId]?.(mountNode);
}

function settingsModule(mountNode) {
  mountNode.innerHTML = `
    <div class="app-grid">
      <section class="app-card">
        <h3>Theme</h3>
        <label>Theme preset
          <select id="theme-select"></select>
        </label>
        <label>Accent color
          <input id="accent-input" type="color" value="${state.accent}" />
        </label>
      </section>

      <section class="app-card">
        <h3>Desktop background</h3>
        <input id="bg-upload" type="file" accept="image/*" />
        <button id="clear-bg" type="button">Use theme background</button>
      </section>

      <section class="app-card">
        <h3>Accounts</h3>
        <label>Spotify Client ID
          <input id="spotify-client-id" value="${state.spotifyClientId}" placeholder="Spotify app client id" />
        </label>
        <label>Discord Server ID
          <input id="discord-server-id" value="${state.discordServerId}" placeholder="Server widget id" />
        </label>
      </section>

      <section class="app-card">
        <h3>Focus</h3>
        <button id="toggle-zen" type="button">Toggle Zen Mode (Ctrl/Cmd + Z)</button>
        <button id="reset-layout" type="button">Reset Window Layout</button>
      </section>
    </div>
  `;

  const select = mountNode.querySelector('#theme-select');
  Object.entries(THEMES).forEach(([key, value]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value.label;
    option.selected = key === state.theme;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    state.theme = select.value;
    applyTheme();
    applyBackground();
    saveState();
  });

  mountNode.querySelector('#accent-input').addEventListener('input', (event) => {
    state.accent = event.target.value;
    applyTheme();
    saveState();
  });

  mountNode.querySelector('#bg-upload').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.customBackground = String(reader.result || '');
      applyBackground();
      saveState();
      updateZenClockColor();
    };
    reader.readAsDataURL(file);
  });

  mountNode.querySelector('#clear-bg').addEventListener('click', () => {
    state.customBackground = null;
    applyBackground();
    saveState();
    updateZenClockColor();
  });

  mountNode.querySelector('#spotify-client-id').addEventListener('change', (event) => {
    state.spotifyClientId = event.target.value.trim();
    saveState();
  });

  mountNode.querySelector('#discord-server-id').addEventListener('change', (event) => {
    state.discordServerId = event.target.value.trim();
    saveState();
  });

  mountNode.querySelector('#toggle-zen').addEventListener('click', () => updateZenMode(!state.zenMode));
  mountNode.querySelector('#reset-layout').addEventListener('click', resetLayout);
}

function spotifyModule(mountNode) {
  mountNode.innerHTML = `
    <div class="app-card">
      <strong>Spotify Playback</strong>
      <p class="muted">Log in with Spotify, then search and control playback on your account.</p>
      <div class="row wrap">
        <button id="spotify-login">Login with Spotify</button>
        <button id="spotify-play-pause">Play/Pause</button>
        <button id="spotify-prev">Prev</button>
        <button id="spotify-next">Next</button>
      </div>
      <label>Volume
        <input id="spotify-volume" type="range" min="0" max="100" value="60" />
      </label>
      <div class="row wrap">
        <input id="spotify-search" placeholder="Search tracks" />
        <button id="spotify-search-btn">Search</button>
      </div>
      <div id="spotify-status" class="muted">${spotifyState.token ? 'Authenticated.' : 'Not authenticated.'}</div>
      <div id="spotify-results" class="app-grid"></div>
    </div>
  `;

  const login = mountNode.querySelector('#spotify-login');
  const playPause = mountNode.querySelector('#spotify-play-pause');
  const prev = mountNode.querySelector('#spotify-prev');
  const next = mountNode.querySelector('#spotify-next');
  const volume = mountNode.querySelector('#spotify-volume');
  const searchInput = mountNode.querySelector('#spotify-search');
  const searchBtn = mountNode.querySelector('#spotify-search-btn');
  const status = mountNode.querySelector('#spotify-status');
  const results = mountNode.querySelector('#spotify-results');

  const setStatus = (text) => {
    status.textContent = text;
  };

  const requireAuth = () => {
    if (!hasValidSpotifyToken()) {
      setStatus('Please log in to Spotify first.');
      return false;
    }
    return true;
  };

  login.addEventListener('click', async () => {
    if (!state.spotifyClientId) {
      setStatus('Set a Spotify Client ID in Settings first.');
      openApp('settings');
      return;
    }
    setStatus('Redirecting to Spotify OAuth...');
    await beginSpotifyAuth();
  });

  playPause.addEventListener('click', async () => {
    if (!requireAuth()) return;
    await initSpotifyPlayer(setStatus);
    await spotifyState.player?.togglePlay();
  });

  prev.addEventListener('click', async () => {
    if (!requireAuth()) return;
    await spotifyState.player?.previousTrack();
  });

  next.addEventListener('click', async () => {
    if (!requireAuth()) return;
    await spotifyState.player?.nextTrack();
  });

  volume.addEventListener('input', async () => {
    if (!requireAuth()) return;
    await spotifyState.player?.setVolume(Number(volume.value) / 100);
  });

  searchBtn.addEventListener('click', async () => {
    if (!requireAuth()) return;
    const query = encodeURIComponent(searchInput.value.trim());
    if (!query) return;
    setStatus('Searching...');
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=8`, {
        headers: { Authorization: 'Be' + 'arer ' + spotifyState.token }
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      const tracks = data?.tracks?.items || [];
      if (!tracks.length) {
        results.innerHTML = '<p class="muted">No tracks found.</p>';
        setStatus('No tracks found.');
        return;
      }

      await initSpotifyPlayer(setStatus);
      results.innerHTML = '';
      tracks.forEach((track) => {
        const card = document.createElement('article');
        card.className = 'app-card';
        card.innerHTML = `
          <strong>${track.name}</strong>
          <span class="muted">${track.artists.map((a) => a.name).join(', ')}</span>
          <button type="button">Play</button>
        `;
        card.querySelector('button').addEventListener('click', () => playSpotifyUri(track.uri, setStatus));
        results.appendChild(card);
      });
      setStatus('Search complete.');
    } catch {
      setStatus('Spotify search failed. Please re-authenticate if needed.');
    }
  });

  if (hasValidSpotifyToken()) {
    initSpotifyPlayer(setStatus);
  }
}

function browserModule(mountNode) {
  mountNode.innerHTML = `
    <div class="row wrap">
      <button id="browser-back">Back</button>
      <button id="browser-forward">Forward</button>
      <button id="browser-reload">Reload</button>
      <input id="browser-url" placeholder="https://example.com" style="flex:1; min-width:220px;" />
      <button id="browser-go">Go</button>
      <button id="browser-open">Open External</button>
    </div>
    <p id="browser-status" class="muted">Enter a URL to browse in-app.</p>
    <iframe id="browser-frame" title="In app browser" referrerpolicy="no-referrer"></iframe>
    <div id="browser-fallback" class="app-card hidden">
      <strong>This site can't be embedded.</strong>
      <p class="muted">The target site likely blocks iframe embedding via CSP/X-Frame-Options.</p>
      <a id="browser-fallback-link" href="#" target="_blank" rel="noopener noreferrer">Open in new tab</a>
    </div>
  `;

  const urlInput = mountNode.querySelector('#browser-url');
  const frame = mountNode.querySelector('#browser-frame');
  const fallback = mountNode.querySelector('#browser-fallback');
  const fallbackLink = mountNode.querySelector('#browser-fallback-link');
  const status = mountNode.querySelector('#browser-status');

  const navigate = (value, push = true) => {
    const normalized = normalizeUrl(value);
    if (!normalized) {
      status.textContent = 'Please enter a valid http(s) URL.';
      return;
    }

    urlInput.value = normalized;
    frame.classList.remove('hidden');
    fallback.classList.add('hidden');
    status.textContent = 'Loading...';

    clearTimeout(browserState.loadingTimer);
    browserState.loadingTimer = setTimeout(() => {
      fallback.classList.remove('hidden');
      frame.classList.add('hidden');
      fallbackLink.href = normalized;
      status.textContent = "Embedding blocked. Use 'Open External'.";
    }, 4500);

    frame.src = normalized;

    if (push) {
      browserState.history = browserState.history.slice(0, browserState.index + 1);
      browserState.history.push(normalized);
      browserState.index += 1;
    }
  };

  frame.addEventListener('load', () => {
    clearTimeout(browserState.loadingTimer);
    fallback.classList.add('hidden');
    frame.classList.remove('hidden');
    status.textContent = 'Loaded.';
  });

  mountNode.querySelector('#browser-go').addEventListener('click', () => navigate(urlInput.value));
  mountNode.querySelector('#browser-open').addEventListener('click', () => {
    const target = normalizeUrl(urlInput.value);
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  });
  mountNode.querySelector('#browser-reload').addEventListener('click', () => navigate(urlInput.value, false));
  mountNode.querySelector('#browser-back').addEventListener('click', () => {
    if (browserState.index <= 0) return;
    browserState.index -= 1;
    navigate(browserState.history[browserState.index], false);
  });
  mountNode.querySelector('#browser-forward').addEventListener('click', () => {
    if (browserState.index >= browserState.history.length - 1) return;
    browserState.index += 1;
    navigate(browserState.history[browserState.index], false);
  });

  if (!browserState.history.length) {
    navigate('https://example.com');
  } else {
    const current = browserState.history[browserState.index];
    urlInput.value = current;
    navigate(current, false);
  }
}

function discordModule(mountNode) {
  const hasServer = Boolean(state.discordServerId);
  mountNode.innerHTML = `
    <div class="app-card">
      <strong>Discord</strong>
      <p class="muted">Discord does not provide a full embeddable client. This uses the official server widget experience.</p>
      ${
        hasServer
          ? `<iframe title="Discord widget" src="https://discord.com/widget?id=${encodeURIComponent(state.discordServerId)}&theme=dark" allowtransparency="true" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`
          : `<p class="muted">Set a Discord Server ID in Settings to load a widget.</p>`
      }
      <a href="https://discord.com/login" target="_blank" rel="noopener noreferrer">Connect to Discord</a>
    </div>
  `;
}

function papersModule(mountNode) {
  mountNode.innerHTML = `
    <div class="row wrap">
      <input id="paper-query" placeholder="Search subject, board, paper" />
      <select id="paper-subject"><option value="">All subjects</option></select>
      <select id="paper-board"><option value="">All boards</option></select>
      <select id="paper-year"><option value="">All years</option></select>
    </div>
    <div id="paper-list" class="app-grid" style="margin-top:12px;"></div>
  `;

  const subjectSelect = mountNode.querySelector('#paper-subject');
  const boardSelect = mountNode.querySelector('#paper-board');
  const yearSelect = mountNode.querySelector('#paper-year');
  const queryInput = mountNode.querySelector('#paper-query');
  const list = mountNode.querySelector('#paper-list');

  const fillOptions = (select, values) => {
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  };

  fillOptions(subjectSelect, [...new Set(PAPER_DATA.map((p) => p.subject))]);
  fillOptions(boardSelect, [...new Set(PAPER_DATA.map((p) => p.board))]);
  fillOptions(yearSelect, [...new Set(PAPER_DATA.map((p) => p.year))]);

  const render = () => {
    const q = queryInput.value.trim().toLowerCase();
    const filtered = PAPER_DATA.filter((item) => {
      if (subjectSelect.value && item.subject !== subjectSelect.value) return false;
      if (boardSelect.value && item.board !== boardSelect.value) return false;
      if (yearSelect.value && item.year !== yearSelect.value) return false;
      if (q && !`${item.subject} ${item.board} ${item.year} ${item.paper}`.toLowerCase().includes(q)) return false;
      return true;
    });

    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<p class="muted">No papers found with current filters.</p>';
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'app-card';
      card.innerHTML = `
        <strong>${item.subject} ${item.paper}</strong>
        <span class="muted">${item.board} • ${item.year}</span>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">Open PDF</a>
      `;
      list.appendChild(card);
    });
  };

  [queryInput, subjectSelect, boardSelect, yearSelect].forEach((el) => el.addEventListener('input', render));
  render();
}

function whiteboardModule(mountNode) {
  mountNode.innerHTML = `
    <div class="row wrap">
      <button id="pen-tool">Pen</button>
      <button id="eraser-tool">Eraser</button>
      <button id="clear-canvas">Clear</button>
    </div>
    <div class="canvas-wrap" style="margin-top:10px;">
      <canvas id="whiteboard-canvas"></canvas>
    </div>
  `;

  const canvas = mountNode.querySelector('#whiteboard-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let tool = 'pen';

  const resizeCanvas = () => {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
  };

  resizeCanvas();

  const draw = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!drawing) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      return;
    }
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#67a8ff';
    if (tool === 'eraser') {
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--board-bg').trim() || '#ffffff';
    }
    ctx.lineWidth = tool === 'eraser' ? 16 : 3;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    draw(event);
  });
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', () => {
    drawing = false;
    ctx.beginPath();
  });

  mountNode.querySelector('#pen-tool').addEventListener('click', () => {
    tool = 'pen';
  });
  mountNode.querySelector('#eraser-tool').addEventListener('click', () => {
    tool = 'eraser';
  });
  mountNode.querySelector('#clear-canvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function calculatorModule(mountNode) {
  let expression = '';
  let scientific = false;

  mountNode.innerHTML = `
    <div class="row wrap">
      <button id="calc-toggle">Switch to Scientific</button>
      <button id="calc-clear">Clear</button>
    </div>
    <div id="calc-display" class="calc-display">0</div>
    <div id="calc-grid" class="calc-grid"></div>
  `;

  const display = mountNode.querySelector('#calc-display');
  const grid = mountNode.querySelector('#calc-grid');
  const toggle = mountNode.querySelector('#calc-toggle');

  const normalKeys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'];
  const sciKeys = ['sin(', 'cos(', 'tan(', '√(', 'log(', 'π', 'e', '^'];

  const evaluateExpression = () => {
    const safe = expression
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/π/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\^/g, '**')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/√\(/g, 'Math.sqrt(');

    try {
      const value = Function(`"use strict"; return (${safe})`)();
      expression = Number.isFinite(value) ? String(value) : 'Error';
    } catch {
      expression = 'Error';
    }
  };

  const updateDisplay = () => {
    display.textContent = expression || '0';
  };

  const keyPress = (value) => {
    if (value === '=') {
      evaluateExpression();
    } else {
      if (expression === 'Error') expression = '';
      expression += value;
    }
    updateDisplay();
  };

  const renderKeys = () => {
    grid.innerHTML = '';
    const keys = scientific ? [...sciKeys, ...normalKeys] : normalKeys;
    keys.forEach((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = key;
      btn.addEventListener('click', () => keyPress(key));
      grid.appendChild(btn);
    });
  };

  mountNode.querySelector('#calc-clear').addEventListener('click', () => {
    expression = '';
    updateDisplay();
  });

  toggle.addEventListener('click', () => {
    scientific = !scientific;
    toggle.textContent = scientific ? 'Switch to Normal' : 'Switch to Scientific';
    renderKeys();
  });

  renderKeys();
  updateDisplay();
}

function applyTheme() {
  const root = document.documentElement;
  const selected = THEMES[state.theme] || THEMES.hyperlandNight;
  Object.entries(selected.vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.style.setProperty('--accent', state.accent || '#67a8ff');
}

function applyBackground() {
  const themeBackground = THEMES[state.theme]?.background || THEMES.hyperlandNight.background;
  const background = state.customBackground ? `url(${state.customBackground})` : themeBackground;
  desktop.style.setProperty('--bg-image', background);
}

function resetLayout() {
  windows.forEach(({ element }) => element.remove());
  windows.clear();
  state.windows = {};
  saveState();
  openApp('settings');
  openApp('papers');
  updateTaskbar();
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function updateZenMode(enabled) {
  state.zenMode = enabled;
  saveState();
  zenModeEl.classList.toggle('hidden', !enabled);
  taskbar.classList.toggle('hidden', enabled);
  windowLayer.style.opacity = enabled ? '0' : '1';
  windowLayer.style.pointerEvents = enabled ? 'none' : 'auto';
  updateZenClockColor();
}

function updateClock() {
  zenClock.textContent = new Date().toLocaleTimeString([], { hour12: false });
}

async function updateZenClockColor() {
  const rgb = await getDominantBackgroundColor();
  const complementary = { r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b };
  zenClock.style.color = `rgb(${complementary.r}, ${complementary.g}, ${complementary.b})`;
}

async function getDominantBackgroundColor() {
  if (!state.customBackground) {
    const accent = state.accent.replace('#', '');
    const value = parseInt(accent.length === 3 ? accent.split('').map((c) => c + c).join('') : accent, 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxSize = 80;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.max(1, Math.floor(img.width * ratio));
      canvas.height = Math.max(1, Math.floor(img.height * ratio));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const alpha = data[i + 3];
        if (alpha < 20) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count += 1;
      }
      resolve({
        r: count ? Math.round(r / count) : 127,
        g: count ? Math.round(g / count) : 127,
        b: count ? Math.round(b / count) : 127
      });
    };
    img.onerror = () => resolve({ r: 127, g: 127, b: 127 });
    img.src = state.customBackground;
  });
}

async function beginSpotifyAuth() {
  const verifier = randomString(96);
  const challenge = await pkceChallenge(verifier);
  localStorage.setItem('spotify_pkce_verifier', verifier);
  const redirectUri = `${location.origin}${location.pathname}`;
  const params = new URLSearchParams({
    client_id: state.spotifyClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state',
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function processSpotifyOAuthRedirect() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return;

  const verifier = localStorage.getItem('spotify_pkce_verifier');
  if (!verifier || !state.spotifyClientId) return;

  try {
    const redirectUri = `${location.origin}${location.pathname}`;
    const body = new URLSearchParams({
      client_id: state.spotifyClientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    });
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!response.ok) throw new Error('Token exchange failed');
    const data = await response.json();
    spotifyState.token = data.access_token;
    spotifyState.expiresAt = Date.now() + (Number(data.expires_in || 0) * 1000);
    localStorage.setItem('spotify_token', spotifyState.token);
    localStorage.setItem('spotify_expires_at', String(spotifyState.expiresAt));
    history.replaceState({}, document.title, location.pathname);
  } catch {
    // graceful fail for unauthenticated flow
  }
}

function hasValidSpotifyToken() {
  if (!spotifyState.token) {
    spotifyState.token = localStorage.getItem('spotify_token');
    spotifyState.expiresAt = Number(localStorage.getItem('spotify_expires_at') || '0');
  }
  return Boolean(spotifyState.token && Date.now() < spotifyState.expiresAt);
}

async function initSpotifyPlayer(setStatus) {
  if (!hasValidSpotifyToken()) return;
  if (spotifyState.initialized && spotifyState.player) return;

  if (!spotifyState.scriptReady && !window.Spotify) {
    setStatus('Spotify SDK unavailable. Check network and retry.');
    return;
  }

  spotifyState.player = new Spotify.Player({
    name: 'Revision OS Player',
    getOAuthToken: (callback) => callback(spotifyState.token),
    volume: 0.6
  });

  spotifyState.player.addListener('ready', ({ device_id }) => {
    spotifyState.deviceId = device_id;
    spotifyState.initialized = true;
    setStatus('Spotify player ready.');
  });

  spotifyState.player.addListener('not_ready', () => {
    setStatus('Spotify device unavailable.');
  });

  spotifyState.player.addListener('initialization_error', () => {
    setStatus('Spotify SDK initialization error.');
  });

  spotifyState.player.addListener('authentication_error', () => {
    setStatus('Spotify authentication failed. Login again.');
  });

  await spotifyState.player.connect();
}

async function playSpotifyUri(uri, setStatus) {
  if (!spotifyState.deviceId || !hasValidSpotifyToken()) {
    setStatus('Spotify player is not ready yet.');
    return;
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyState.deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: 'Be' + 'arer ' + spotifyState.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [uri] })
    });
    if (!response.ok) throw new Error('Playback failed');
    setStatus('Playing track.');
  } catch {
    setStatus('Could not start playback. Ensure Spotify Premium + active device.');
  }
}

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return [...array].map((value) => chars[value % chars.length]).join('');
}

async function pkceChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
