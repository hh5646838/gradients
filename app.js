/* ============================================================
 * 图片色彩提取与高级渐变色生成器
 * 纯前端实现，无外部依赖，无框架
 * 支持 4 种渐变：线性 / 径向 / Mesh网格 / 流动
 * ============================================================ */

(function () {
  'use strict';

  /* ========== 全局状态 ========== */
  const state = {
    config: null,
    uploadedImage: null,
    extractedColors: [],
    gradient: {
      type: 'mesh',
      angle: 135,
      stops: [
        { color: '#a8edea', position: 0 },
        { color: '#fed6e3', position: 100 }
      ],
      mesh: {
        paletteIndex: 0,
        animating: true,
        bg: 'dark',
        blobs: [
          { color: '#ff6b6b', x: -8, y: -12, size: 55 },
          { color: '#48dbfb', x: 58, y: -5, size: 50 },
          { color: '#ff9ff3', x: 18, y: 62, size: 48 },
          { color: '#feca57', x: 2, y: 28, size: 52 }
        ]
      },
      flow: {
        paletteIndex: 0,
        animating: true,
        palettes: [
          ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#ff6b6b'],
          ['#a8edea', '#c2e9fb', '#fbc2eb', '#a6c1ee', '#a8edea'],
          ['#43e97b', '#38f9d7', '#fa709a', '#fee140', '#43e97b']
        ]
      }
    },
    catModalShowing: false,
    meshTimer: null,
    flowTimer: null,
    flowLayerIndex: 0,
    stopHistory: []
  };

  /* ========== Mesh 配色组 ========== */
  const MESH_PALETTES = [
    ['#ff6b6b', '#48dbfb', '#ff9ff3', '#feca57'],
    ['#a8edea', '#c2e9fb', '#fbc2eb', '#a6c1ee'],
    ['#43e97b', '#38f9d7', '#fa709a', '#fee140'],
    ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
    ['#0f2027', '#203a43', '#2c5364', '#4facfe'],
    ['#ee0979', '#ff6a00', '#ffd200', '#00c6ff']
  ];

  /* ========== 预设渐变库 ========== */
  const PRESETS = [
    { type: 'mesh', palette: 0, label: '霓虹' },
    { type: 'mesh', palette: 1, label: '清新' },
    { type: 'mesh', palette: 2, label: '春野' },
    { type: 'mesh', palette: 3, label: '紫霞' },
    { type: 'mesh', palette: 4, label: '深海' },
    { type: 'mesh', palette: 5, label: '落日' },
    { type: 'flow', palette: 0, label: '霓流' },
    { type: 'flow', palette: 1, label: '清流' },
    { type: 'flow', palette: 2, label: '春流' },
    { type: 'linear', stops: [{color:'#a8edea',position:0},{color:'#fed6e3',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#f093fb',position:0},{color:'#f5576c',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#4facfe',position:0},{color:'#00f2fe',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#43e97b',position:0},{color:'#38f9d7',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#fa709a',position:0},{color:'#fee140',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#30cfd0',position:0},{color:'#330867',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#ff9a9e',position:0},{color:'#fecfef',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#ffecd2',position:0},{color:'#fcb69f',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#84fab0',position:0},{color:'#8fd3f4',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#a1c4fd',position:0},{color:'#c2e9fb',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#f6d365',position:0},{color:'#fda085',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#0f2027',position:0},{color:'#203a43',position:50},{color:'#2c5364',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#ee0979',position:0},{color:'#ff6a00',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#00c6ff',position:0},{color:'#0072ff',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#11998e',position:0},{color:'#38ef7d',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#fc466b',position:0},{color:'#3f5efb',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#c471f5',position:0},{color:'#fa71cd',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#f7971e',position:0},{color:'#ffd200',position:100}], angle: 135 },
    { type: 'linear', stops: [{color:'#e96443',position:0},{color:'#904e95',position:100}], angle: 135 },
    { type: 'radial', stops: [{color:'#a8edea',position:0},{color:'#fed6e3',position:100}] },
    { type: 'radial', stops: [{color:'#667eea',position:0},{color:'#764ba2',position:100}] },
    { type: 'radial', stops: [{color:'#f093fb',position:0},{color:'#f5576c',position:100}] },
    { type: 'radial', stops: [{color:'#4facfe',position:0},{color:'#00f2fe',position:100}] }
  ];

  /* ========== 工具函数 ========== */
  const $ = function (id) { return document.getElementById(id); };

  function showToast(msg, duration) {
    duration = duration || 2000;
    const toast = $('toast');
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.hidden = true; }, duration);
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      const h = Math.round(v).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  function isValidHex(str) {
    return /^#?[0-9a-fA-F]{6}$/.test(str);
  }

  function normalizeHex(str) {
    if (str.charAt(0) !== '#') str = '#' + str;
    return str.toLowerCase();
  }

  function clampPos(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = 0;
    return Math.max(0, Math.min(100, v));
  }

  // 两个 hex 颜色按比例 t (0~1) 插值
  function mixColor(c1, c2, t) {
    t = t == null ? 0.5 : t;
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  }

  // 计算相对亮度（0~1），用于自动排序消除暗谷/亮峰
  function luminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  // 在每两个用户色阶之间插入多个中间过渡色，消除色带
  // 自动按亮度排序，避免用户选色出现暗谷/亮峰导致明显等色线
  function getSmoothStops(stops) {
    if (stops.length <= 2) return stops.slice();
    // 按亮度从暗到亮排序
    const sorted = stops.slice().sort(function (a, b) { return luminance(a.color) - luminance(b.color); });
    // 重新均匀分布位置
    sorted.forEach(function (s, i) {
      s.position = sorted.length > 1 ? i / (sorted.length - 1) * 100 : 0;
    });
    const result = [];
    const segments = 4; // 每两个色之间分4段，插入3个中间色
    for (let i = 0; i < sorted.length - 1; i++) {
      result.push(sorted[i]);
      for (let j = 1; j < segments; j++) {
        const t = j / segments;
        result.push({
          color: mixColor(sorted[i].color, sorted[i + 1].color, t),
          position: sorted[i].position + (sorted[i + 1].position - sorted[i].position) * t
        });
      }
    }
    result.push(sorted[sorted.length - 1]);
    return result;
  }

  // 色阶位置自动均匀分布
  function redistributePositions() {
    const n = state.gradient.stops.length;
    state.gradient.stops.forEach(function (s, i) {
      s.position = n > 1 ? Math.round(i / (n - 1) * 100) : 0;
    });
  }

  // 记录当前色阶状态到历史栈（修改前调用）
  function pushStopHistory() {
    const snapshot = state.gradient.stops.map(function (s) { return { color: s.color, position: s.position }; });
    state.stopHistory.push(snapshot);
    if (state.stopHistory.length > 20) state.stopHistory.shift();
    updateUndoButton();
  }

  function updateUndoButton() {
    const btn = $('undoStopBtn');
    if (btn) btn.disabled = state.stopHistory.length === 0;
  }

  function undoStops() {
    if (state.stopHistory.length === 0) return;
    state.gradient.stops = state.stopHistory.pop();
    updateUndoButton();
    renderStops();
    updateGradientDisplay();
    showToast('已撤销');
  }

  function resetStops() {
    pushStopHistory();
    state.gradient.stops = [
      { color: '#a8edea', position: 0 },
      { color: '#fed6e3', position: 100 }
    ];
    renderStops();
    updateGradientDisplay();
    showToast('已重置为默认色');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  }

  /* ========== 配置加载 ========== */
  async function loadConfig() {
    try {
      const res = await fetch('config.json');
      state.config = await res.json();
    } catch (e) {
      console.error('配置加载失败，使用默认配置:', e);
      state.config = {
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=colorstudio',
        homeUrl: '#',
        moreToolsUrl: 'https://www.jojocharm.top/',
        authorName: '渐变色实验室',
        wechatName: '公众号',
        wechatQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https://example.com',
        helpText: '## 使用说明\n\n上传图片提取色彩，下方渐变编辑器支持线性/径向/Mesh网格/流动四种渐变。',
        modalText: '关注公众号，获取更多设计工具与配色灵感。',
        modalThreshold: 9,
        modalSeconds: 5
      };
    }
    renderNav();
    renderHelp();
    renderExampleCards();
  }

  function renderNav() {
    const cfg = state.config;
    $('brandLink').href = cfg.homeUrl || '#';
    $('authorAvatar').src = cfg.avatarUrl;
    $('authorAvatar').alt = cfg.authorName;
    $('wechatModalText').textContent = cfg.modalText;
    $('wechatQr').src = cfg.wechatQrUrl;
    $('wechatNameDisplay').textContent = cfg.wechatName;
    $('catQr').src = cfg.wechatQrUrl;
    $('footerAuthor').textContent = cfg.authorName;
    const moreLink = $('moreToolsLink');
    if (moreLink && cfg.moreToolsUrl) {
      moreLink.href = cfg.moreToolsUrl;
    } else if (moreLink) {
      moreLink.style.display = 'none';
    }
    const homeLink = $('homeLink');
    if (homeLink && cfg.homeUrl) {
      homeLink.href = cfg.homeUrl;
    } else if (homeLink) {
      homeLink.style.display = 'none';
    }
  }

  function renderHelp() {
    const cfg = state.config;
    const lines = (cfg.helpText || '').split('\n');
    let html = '';
    let inList = false;
    let listType = '';
    function closeList() {
      if (inList) { html += '</' + listType + '>'; inList = false; listType = ''; }
    }
    lines.forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed) { closeList(); return; }
      if (trimmed.startsWith('### ')) { closeList(); html += '<h3>' + trimmed.substring(4) + '</h3>'; }
      else if (trimmed.startsWith('## ')) { closeList(); html += '<h2>' + trimmed.substring(3) + '</h2>'; }
      else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || listType !== 'ol') { closeList(); html += '<ol>'; inList = true; listType = 'ol'; }
        html += '<li>' + trimmed.replace(/^\d+\.\s/, '') + '</li>';
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList || listType !== 'ul') { closeList(); html += '<ul>'; inList = true; listType = 'ul'; }
        html += '<li>' + trimmed.substring(2) + '</li>';
      } else { closeList(); html += '<p>' + trimmed + '</p>'; }
    });
    closeList();
    $('helpContent').innerHTML = html;
  }

  /* ========== 示例色卡 ========== */
  function renderExampleCards() {
    const grid = $('exampleGrid');
    const images = (state.config && state.config.exampleImages) || [];
    if (!images.length) {
      grid.parentElement.style.display = 'none';
      return;
    }
    grid.innerHTML = images.map(function (url, i) {
      return '<div class="example-card' + (i === 0 ? ' guide' : '') + '" data-url="' + url + '">' +
        '<img src="' + url + '" alt="色卡示例' + (i + 1) + '" loading="lazy">' +
        '<span class="example-author">@jojocharm</span>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.example-card').forEach(function (card) {
      card.addEventListener('click', function () {
        grid.querySelectorAll('.example-card').forEach(function (c) { c.classList.remove('guide'); });
        handleExampleCardClick(card.dataset.url);
      });
    });
  }

  function handleExampleCardClick(url) {
    showToast('正在提取色卡…');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const colors = extractColors(img, state.colorCount || 4, state.extractMode || 'vivid');
      if (!colors.length) {
        showToast('提取失败，请重试');
        return;
      }
      state.uploadedImage = img;
      state.extractCache = {}; // 新图片清空缓存
      state.extractedColors = colors;
      $('paletteImage').src = url;
      state.extractCache[state.extractMode + '_' + (state.colorCount || 4)] = colors;
      renderPaletteCard(colors);
      showToast('已生成色卡，可点击「全部导入渐变色」');
      // 滚动到色卡区域，方便手机端查看
      setTimeout(function () {
        const area = $('paletteArea');
        if (area) area.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    img.onerror = function () {
      showToast('图片加载失败');
    };
    img.src = url;
  }

  /* ========== 页面路由 ========== */
  function setupRouting() {
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { switchView(btn.dataset.view); });
    });
    $('helpBtn').addEventListener('click', function () { switchView('help'); });
    $('backFromHelp').addEventListener('click', function () { switchView('gradient'); });
    $('brandLink').addEventListener('click', function (e) {
      e.preventDefault();
      switchView('gradient');
    });
  }

  function switchView(view, skipScroll) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    $('view-gradient').hidden = view !== 'gradient';
    $('view-extractor').hidden = view !== 'extractor';
    $('view-help').hidden = view !== 'help';
    if (!skipScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ========== 公众号弹窗 ========== */
  function setupWechatModal() {
    const modal = $('wechatModal');
    $('authorBtn').addEventListener('click', function () { modal.hidden = false; });
    $('wechatClose').addEventListener('click', function () { modal.hidden = true; });
    modal.querySelector('.modal-mask').addEventListener('click', function (e) { e.stopPropagation(); });
    $('copyWechatBtn').addEventListener('click', function () {
      copyText(state.config.wechatName).then(function () { showToast('公众号名称已复制'); });
    });
  }

  /* ========== 图片上传 ========== */
  function setupUpload() {
    const fileInput = $('imageInput');
    const emptyHint = $('emptyHint');
    const paletteArea = $('paletteArea');

    emptyHint.addEventListener('click', function () { fileInput.click(); });
    $('replaceImageBtn').addEventListener('click', function () { fileInput.click(); });

    paletteArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      paletteArea.classList.add('dragover');
    });
    paletteArea.addEventListener('dragleave', function (e) {
      e.preventDefault();
      paletteArea.classList.remove('dragover');
    });
    paletteArea.addEventListener('drop', function (e) {
      e.preventDefault();
      paletteArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', function (e) {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    state.colorCount = 4;
    state.extractMode = 'vivid';
    state.extractCache = {}; // 缓存：key = mode_k, value = colors
    document.querySelectorAll('.count-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.count-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.colorCount = parseInt(btn.dataset.value, 10);
        if (state.uploadedImage) doExtract();
      });
    });

    // 提取风格切换（艳丽/灰调）
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.extractMode = btn.dataset.mode;
        if (state.uploadedImage) doExtract();
      });
    });
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) { showToast('请上传图片文件'); return; }
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        state.uploadedImage = img;
        state.extractCache = {}; // 新图片清空缓存
        $('paletteImage').src = e.target.result;
        doExtract();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function doExtract() {
    if (!state.uploadedImage) return;
    const k = state.colorCount || 4;
    const mode = state.extractMode || 'vivid';
    const cacheKey = mode + '_' + k;

    // 命中缓存直接渲染，不重复计算
    if (state.extractCache[cacheKey]) {
      state.extractedColors = state.extractCache[cacheKey];
      renderPaletteCard(state.extractedColors);
      return;
    }

    setTimeout(function () {
      const colors = extractColors(state.uploadedImage, k, mode);
      state.extractedColors = colors;
      state.extractCache[cacheKey] = colors; // 存入缓存
      renderPaletteCard(colors);
      showToast('已提取 ' + colors.length + ' 种主色调');
    }, 30);
  }

  /* ========== 色彩提取（Median Cut + Lab + 视觉加权 + 去重） ========== */

  // RGB → CIELAB（D65白点）
  function rgbToLab(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722);
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
  }

  // HSL 饱和度
  function getSaturation(r, g, b) {
    const mx = Math.max(r, g, b) / 255;
    const mn = Math.min(r, g, b) / 255;
    const l = (mx + mn) / 2;
    if (mx === mn) return 0;
    const d = mx - mn;
    return l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  }

  // RGB → HSL → 提高饱和度 → RGB（Saturation Boost）
  function boostSaturation(r, g, b, amount) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h, s, l = (mx + mn) / 2;
    if (mx === mn) { h = s = 0; }
    else {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      switch (mx) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    s = Math.min(1, s + amount);
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    if (s === 0) return [Math.round(l*255), Math.round(l*255), Math.round(l*255)];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1/3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1/3) * 255)
    ];
  }

  // Lab 欧氏距离
  function labDist(a, b) {
    return Math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) + (a[2]-b[2])*(a[2]-b[2]));
  }

  // Median Cut：在 Lab 空间递归切分，兼顾大面积主色和局部色块
  function medianCut(pixels, targetCount) {
    let boxes = [pixels];
    while (boxes.length < targetCount) {
      let maxRange = -1, maxIdx = -1, maxCh = -1;
      for (let bi = 0; bi < boxes.length; bi++) {
        const box = boxes[bi];
        if (box.length < 2) continue;
        let minL=Infinity,maxL=-Infinity,minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity;
        for (let i = 0; i < box.length; i++) {
          const p = box[i];
          if (p[3]<minL) minL=p[3]; if (p[3]>maxL) maxL=p[3];
          if (p[4]<minA) minA=p[4]; if (p[4]>maxA) maxA=p[4];
          if (p[5]<minB) minB=p[5]; if (p[5]>maxB) maxB=p[5];
        }
        const rL=maxL-minL, rA=maxA-minA, rB=maxB-minB;
        const range = Math.max(rL, rA, rB);
        if (range > maxRange) {
          maxRange = range; maxIdx = bi;
          maxCh = rL>=rA && rL>=rB ? 3 : (rA>=rB ? 4 : 5);
        }
      }
      if (maxIdx === -1) break;
      const box = boxes[maxIdx];
      box.sort(function (a, b) { return a[maxCh] - b[maxCh]; });
      const mid = Math.floor(box.length / 2);
      boxes[maxIdx] = box.slice(0, mid);
      boxes.push(box.slice(mid));
    }
    return boxes;
  }

  // 视觉权重：面积 × 艳丽度(色度离心距²) × 明度舒适度(正态钟形)
  function visualWeight(count, total, chroma, lightness) {
    const area = count / total;
    // 艳丽度：Lab 色度离心距 sqrt(a²+b²) 归一化后平方，鲜艳色权重暴涨
    const vividness = Math.pow(Math.min(chroma / 80, 1), 2);
    // 明度舒适度：正态钟形曲线，L=0.5 最高，过暗过亮大打折扣
    const lightComfort = Math.exp(-Math.pow((lightness - 0.5) / 0.28, 2));
    return area * vividness * lightComfort;
  }

  function extractColors(img, k, mode) {
    mode = mode || 'vivid';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const maxDim = 200;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.floor(img.width * scale));
    canvas.height = Math.max(1, Math.floor(img.height * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // 先收集所有有效像素，计算平均饱和度（判断是否黑白/低饱和图）
    const rawPixels = [];
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (imgData.data[i + 3] < 125) continue;
      const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
      if (r > 248 && g > 248 && b > 248) continue; // 剔除纯白
      if (r < 8 && g < 8 && b < 8) continue;       // 剔除纯黑
      rawPixels.push([r, g, b]);
    }
    if (rawPixels.length === 0) return [];
    const avgSat = rawPixels.reduce(function (sum, p) { return sum + getSaturation(p[0], p[1], p[2]); }, 0) / rawPixels.length;
    // 非低饱和图（平均S>0.12）抛弃饱和度<0.15的灰像素；黑白/极简风图不做过滤
    const satThreshold = avgSat > 0.12 ? 0.15 : 0;

    const pixels = [];
    for (let i = 0; i < rawPixels.length; i++) {
      const p = rawPixels[i];
      if (getSaturation(p[0], p[1], p[2]) < satThreshold) continue;
      const lab = rgbToLab(p[0], p[1], p[2]);
      pixels.push([p[0], p[1], p[2], lab[0], lab[1], lab[2]]);
    }
    if (pixels.length === 0) return [];
    const total = pixels.length;

    // 第2步：Median Cut 提取候选色（k×3 个候选）
    const candidateCount = Math.max(k * 3, 12);
    const boxes = medianCut(pixels, candidateCount);

    // 每个盒子取平均色
    let candidates = boxes.map(function (box) {
      let sr=0, sg=0, sb=0, sL=0, sa=0, sb2=0;
      for (let i = 0; i < box.length; i++) {
        sr += box[i][0]; sg += box[i][1]; sb += box[i][2];
        sL += box[i][3]; sa += box[i][4]; sb2 += box[i][5];
      }
      const n = box.length;
      return {
        rgb: [Math.round(sr/n), Math.round(sg/n), Math.round(sb/n)],
        lab: [sL/n, sa/n, sb2/n],
        count: n
      };
    }).filter(function (c) { return c.count > 0; });

    // 第3步：视觉加权排序（根据模式选择加权方式）
    candidates.forEach(function (c) {
      const chroma = Math.sqrt(c.lab[1] * c.lab[1] + c.lab[2] * c.lab[2]);
      const lightness = c.lab[0] / 100;
      if (mode === 'muted') {
        // 灰调模式：面积为主 + 低饱和偏好（S=0.2最高）+ 明度中间调
        const saturation = getSaturation(c.rgb[0], c.rgb[1], c.rgb[2]);
        const area = c.count / total;
        const satPref = Math.exp(-Math.pow((saturation - 0.2) / 0.25, 2));
        const lightPref = Math.exp(-Math.pow((lightness - 0.5) / 0.3, 2));
        c.weight = area * satPref * lightPref;
      } else {
        // 艳丽模式：色度离心距平方 × 明度钟形
        c.weight = visualWeight(c.count, total, chroma, lightness);
      }
    });
    candidates.sort(function (a, b) { return b.weight - a.weight; });

    // 第4步：色彩和谐化去重，确保颜色间拉开视觉距离
    const result = [];
    const minDist = 18; // Lab 距离阈值，小于此值视为重复
    for (let i = 0; i < candidates.length && result.length < k; i++) {
      const c = candidates[i];
      let tooClose = false;
      for (let j = 0; j < result.length; j++) {
        if (labDist(c.lab, result[j].lab) < minDist) { tooClose = true; break; }
      }
      if (!tooClose) result.push(c);
    }
    // 如果去重后不够 k 个，用剩余候选补齐
    if (result.length < k) {
      for (let i = 0; i < candidates.length && result.length < k; i++) {
        if (result.indexOf(candidates[i]) === -1) result.push(candidates[i]);
      }
    }

    // 后处理：艳丽模式饱和度+15%，灰调模式饱和度-10%
    const boostAmount = mode === 'muted' ? -0.1 : 0.15;
    return result.slice(0, k).map(function (c) {
      const boosted = boostSaturation(c.rgb[0], c.rgb[1], c.rgb[2], boostAmount);
      return { hex: rgbToHex(boosted[0], boosted[1], boosted[2]), rgb: boosted };
    });
  }

  function kMeans(pixels, k, maxIter, initCenters) {
    const centers = [];
    if (initCenters && initCenters.length >= k) {
      // 使用传入的初始中心（来自直方图，稳定不随机）
      for (let i = 0; i < k; i++) centers.push(initCenters[i].slice());
    } else {
      // k-means++ 初始化
      centers.push(pixels[Math.floor(Math.random() * pixels.length)].slice());
      for (let i = 1; i < k; i++) {
        const dists = pixels.map(function (p) {
          let minD = Infinity;
          for (let ci = 0; ci < centers.length; ci++) {
            const c = centers[ci];
            const d = (p[0]-c[0])*(p[0]-c[0]) + (p[1]-c[1])*(p[1]-c[1]) + (p[2]-c[2])*(p[2]-c[2]);
            if (d < minD) minD = d;
          }
          return minD;
        });
        const total = dists.reduce(function (a, b) { return a + b; }, 0);
        let r = Math.random() * total;
        let idx = 0;
        for (let j = 0; j < dists.length; j++) { r -= dists[j]; if (r <= 0) { idx = j; break; } }
        centers.push(pixels[idx].slice());
      }
    }

    const assignments = new Array(pixels.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (let i = 0; i < pixels.length; i++) {
        let minD = Infinity, minJ = 0;
        for (let j = 0; j < k; j++) {
          const c = centers[j], p = pixels[i];
          const d = (p[0]-c[0])*(p[0]-c[0]) + (p[1]-c[1])*(p[1]-c[1]) + (p[2]-c[2])*(p[2]-c[2]);
          if (d < minD) { minD = d; minJ = j; }
        }
        if (assignments[i] !== minJ) { assignments[i] = minJ; changed = true; }
      }
      const sums = [];
      for (let j = 0; j < k; j++) sums.push([0, 0, 0, 0]);
      for (let i = 0; i < pixels.length; i++) {
        const j = assignments[i];
        sums[j][0] += pixels[i][0]; sums[j][1] += pixels[i][1]; sums[j][2] += pixels[i][2]; sums[j][3]++;
      }
      for (let j = 0; j < k; j++) {
        if (sums[j][3] > 0) centers[j] = [sums[j][0]/sums[j][3], sums[j][1]/sums[j][3], sums[j][2]/sums[j][3]];
      }
      if (!changed) break;
    }
    const counts = new Array(k).fill(0);
    for (let i = 0; i < assignments.length; i++) counts[assignments[i]]++;
    return centers.map(function (c, i) { return { center: c, count: counts[i] }; });
  }

  /* ========== 色卡渲染 ========== */
  function renderPaletteCard(colors) {
    $('emptyHint').hidden = true;
    $('paletteCard').hidden = false;
    $('replaceImageBtn').textContent = '替换图片';
    $('downloadCardBtn').hidden = false;
    $('importAllBtn').hidden = false;
    $('paletteMeta').textContent = colors.length + ' Colors';

    const swatches = $('paletteSwatches');
    swatches.innerHTML = '';
    colors.forEach(function (c, idx) {
      const item = document.createElement('div');
      item.className = 'swatch';
      item.innerHTML =
        '<div class="swatch-circle" style="background:' + c.hex + '" title="' + c.hex + '"></div>' +
        '<span class="swatch-hex">' + c.hex.toUpperCase() + '</span>' +
        '<button class="swatch-import" data-idx="' + idx + '">导入</button>';
      swatches.appendChild(item);
    });

    swatches.querySelectorAll('.swatch-circle').forEach(function (el, idx) {
      el.addEventListener('click', function () {
        copyText(colors[idx].hex).then(function () { showToast('已复制 ' + colors[idx].hex.toUpperCase()); });
      });
    });
    swatches.querySelectorAll('.swatch-import').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        importColorToGradient(colors[parseInt(btn.dataset.idx, 10)].hex);
      });
    });
  }

  /* ---------- 导入颜色到渐变（同步所有类型数据源） ---------- */
  function importColorToGradient(hex) {
    switchView('gradient', true);
    const type = state.gradient.type;

    pushStopHistory();
    // 同步更新 linear/radial 色阶（切换类型后立即可见）
    if (state.gradient.stops.length >= 6) {
      state.gradient.stops[state.gradient.stops.length - 1].color = hex;
    } else {
      state.gradient.stops.push({ color: hex, position: 100 });
    }
    redistributePositions();

    if (type === 'mesh') {
      const blobs = state.gradient.mesh.blobs;
      const idx = (state.gradient.mesh.paletteIndex || 0) % blobs.length;
      blobs[idx].color = hex;
      state.gradient.mesh.paletteIndex = idx + 1;
      state.gradient.mesh.animating = false;
      stopMeshTimer();
      $('gradientPreview').classList.add('paused');
      updatePlayButton();
      updateGradientDisplay();
      showToast('已导入（所有渐变类型已同步）');
      $('gradientModule').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (type === 'flow') {
      const palettes = state.gradient.flow.palettes;
      const pi = state.gradient.flow.paletteIndex % palettes.length;
      palettes[pi][0] = hex;
      state.gradient.flow.animating = false;
      stopFlowTimer();
      $('gradientPreview').classList.add('paused');
      updatePlayButton();
      updateGradientDisplay();
      showToast('已导入（所有渐变类型已同步）');
      $('gradientModule').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // linear / radial
    renderStops();
    updateGradientDisplay();
    showToast('已导入（所有渐变类型已同步）');
    $('gradientModule').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function importAllColors() {
    const colors = state.extractedColors;
    if (!colors.length) return;
    switchView('gradient', true);
    const type = state.gradient.type;

    pushStopHistory();
    // 1. 同步更新 stops（linear/radial）
    state.gradient.stops = colors.map(function (c, i) {
      return {
        color: c.hex,
        position: colors.length > 1 ? Math.round(i / (colors.length - 1) * 100) : 0
      };
    });

    // 2. 同步更新 mesh 光斑
    state.gradient.mesh.blobs.forEach(function (blob, i) {
      blob.color = colors[i % colors.length].hex;
    });

    // 3. 同步更新 flow palette（插入开头，最多保留6组）
    const flowPalette = [];
    const targetLen = Math.max(5, colors.length);
    for (let i = 0; i < targetLen; i++) {
      flowPalette.push(colors[i % colors.length].hex);
    }
    flowPalette.push(flowPalette[0]);
    state.gradient.flow.palettes.unshift(flowPalette);
    if (state.gradient.flow.palettes.length > 6) {
      state.gradient.flow.palettes = state.gradient.flow.palettes.slice(0, 6);
    }
    state.gradient.flow.paletteIndex = 0;

    // 4. 根据当前类型渲染
    if (type === 'mesh') {
      state.gradient.mesh.animating = false;
      stopMeshTimer();
      $('gradientPreview').classList.add('paused');
      updatePlayButton();
      updateGradientDisplay();
      showToast('已全部导入（所有渐变类型已同步）');
      $('gradientModule').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (type === 'flow') {
      state.gradient.flow.animating = false;
      stopFlowTimer();
      $('gradientPreview').classList.add('paused');
      updatePlayButton();
      updateGradientDisplay();
      showToast('已全部导入（所有渐变类型已同步）');
      $('gradientModule').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // linear / radial
    renderStops();
    updateGradientDisplay();
    showToast('已全部导入（所有渐变类型已同步）');
    $('gradientModule').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ========== 色卡下载 ========== */
  function downloadColorCard() {
    const colors = state.extractedColors;
    const img = state.uploadedImage;
    if (!colors.length || !img) return;

    const W = 1080, pad = 60, headerH = 100, imgH = 560, swatchAreaH = 280;
    const H = pad * 2 + headerH + imgH + swatchAreaH;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.fillStyle = '#1a1a2e'; ctx.font = 'bold 32px -apple-system, sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillText('COLOR PALETTE', pad, pad + headerH / 2);
    ctx.fillStyle = '#9ca3af'; ctx.font = '20px -apple-system, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(colors.length + ' Colors', W - pad, pad + headerH / 2);
    ctx.textAlign = 'left';

    const imgY = pad + headerH;
    const imgRatio = img.width / img.height;
    const areaRatio = (W - pad * 2) / imgH;
    let dw, dh, dx, dy;
    if (imgRatio > areaRatio) { dw = W - pad * 2; dh = dw / imgRatio; dx = pad; dy = imgY + (imgH - dh) / 2; }
    else { dh = imgH; dw = dh * imgRatio; dy = imgY; dx = pad + (W - pad * 2 - dw) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);

    const swatchY = imgY + imgH + 40;
    const circleR = 42;
    const gap = colors.length > 1 ? (W - pad * 2 - circleR * 2 * colors.length) / (colors.length - 1) : 0;
    colors.forEach(function (c, i) {
      const cx = pad + circleR + i * (circleR * 2 + gap);
      const cy = swatchY + circleR;
      ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
      ctx.fillStyle = c.hex; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = 'bold 18px "SF Mono", Consolas, monospace'; ctx.textAlign = 'center';
      ctx.fillText(c.hex.toUpperCase(), cx, cy + circleR + 36);
    });
    ctx.textAlign = 'left';

    const link = document.createElement('a');
    link.download = 'color-card-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    incrementProcessCount();
  }

  /* ================================================================
   * 渐变编辑器核心
   * ================================================================ */

  function setupGradientEditor() {
    document.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.type) {
          switchGradientType(btn.dataset.type);
        } else if (btn.dataset.bg) {
          switchMeshBg(btn.dataset.bg);
        }
      });
    });

    $('angleSlider').addEventListener('input', function (e) {
      state.gradient.angle = parseInt(e.target.value, 10);
      $('angleVal').textContent = state.gradient.angle + '°';
      updateGradientDisplay();
    });

    // 添加颜色按钮已移到色阶列表末尾（renderStops 中动态创建）

    $('copyCssBtn').addEventListener('click', function () {
      copyText(buildGradientCss()).then(function () {
        showToast('CSS 代码已复制');
        incrementProcessCount();
      });
    });

    $('downloadWallBtn').addEventListener('click', downloadGradientWallpaper);
    $('playToggle').addEventListener('click', togglePlay);
    $('importAllBtn').addEventListener('click', importAllColors);
    $('downloadCardBtn').addEventListener('click', downloadColorCard);
    $('undoStopBtn').addEventListener('click', undoStops);
    $('resetStopBtn').addEventListener('click', resetStops);

    switchGradientType('mesh');
  }

  function switchGradientType(type) {
    stopAllAnimation();
    state.gradient.type = type;

    document.querySelectorAll('.seg-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.type === type);
    });

    const isLinear = type === 'linear';
    const isRadial = type === 'radial';
    const isAnimated = type === 'mesh' || type === 'flow';

    $('angleGroup').style.display = isLinear ? '' : 'none';
    $('stopsEditor').style.display = (isLinear || isRadial) ? '' : 'none';
    $('playToggle').hidden = !isAnimated;
    $('downloadHint').hidden = !isAnimated;
    $('stopsHint').hidden = isAnimated;
    $('meshBgGroup').hidden = type !== 'mesh';

    $('gradientPreview').classList.remove('paused');
    if (type === 'mesh') state.gradient.mesh.animating = true;
    if (type === 'flow') state.gradient.flow.animating = true;

    if (isLinear || isRadial) renderStops();
    updateGradientDisplay();
    updatePlayButton();
  }

  function switchMeshBg(bg) {
    state.gradient.mesh.bg = bg;
    document.querySelectorAll('#meshBgGroup .seg-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.bg === bg);
    });
    updateGradientDisplay();
  }

  /* ---------- 色阶渲染 ---------- */
  function renderStops() {
    const list = $('stopsList');
    list.innerHTML = '';
    state.gradient.stops.forEach(function (stop, idx) {
      const item = document.createElement('div');
      item.className = 'stop-item';
      item.dataset.idx = idx;
      const canRemove = state.gradient.stops.length > 2;
      item.innerHTML =
        '<div class="stop-color-wrap" title="点击选择颜色">' +
          '<input type="color" class="stop-color" value="' + stop.color + '" data-idx="' + idx + '" />' +
          '<span class="stop-color-icon">🎨</span>' +
        '</div>' +
        '<input type="text" class="stop-hex-input" value="' + stop.color.toUpperCase() + '" data-idx="' + idx + '" maxlength="7" />' +
        (canRemove ? '<button class="stop-remove" data-idx="' + idx + '" title="删除">×</button>' : '');
      list.appendChild(item);
    });

    // 末尾添加"+"按钮
    const addBtn = document.createElement('button');
    addBtn.className = 'add-stop-btn';
    addBtn.textContent = '+';
    addBtn.title = '添加颜色';
    if (state.gradient.stops.length >= 6) addBtn.disabled = true;
    addBtn.addEventListener('click', function () {
      if (state.gradient.stops.length >= 6) { showToast('最多支持 6 种颜色'); return; }
      pushStopHistory();
      const last = state.gradient.stops[state.gradient.stops.length - 1];
      state.gradient.stops.push({ color: last ? last.color : '#ffffff', position: 100 });
      redistributePositions();
      renderStops();
      updateGradientDisplay();
    });
    list.appendChild(addBtn);

    // 取色器：第一次 input 时记录历史，后续拖动不重复记录
    let hasRecordedThisEdit = false;
    list.querySelectorAll('.stop-color').forEach(function (inp) {
      inp.addEventListener('mousedown', function () { hasRecordedThisEdit = false; });
      inp.addEventListener('focus', function () { hasRecordedThisEdit = false; });
      inp.addEventListener('input', function (e) {
        if (!hasRecordedThisEdit) {
          pushStopHistory();
          hasRecordedThisEdit = true;
        }
        const idx = parseInt(e.target.dataset.idx, 10);
        const color = e.target.value;
        state.gradient.stops[idx].color = color;
        const hexInput = e.target.closest('.stop-item').querySelector('.stop-hex-input');
        if (hexInput) hexInput.value = color.toUpperCase();
        updateGradientDisplay();
      });
      inp.addEventListener('change', function () { hasRecordedThisEdit = false; });
      inp.addEventListener('blur', function () { hasRecordedThisEdit = false; });
    });

    // hex 输入框
    list.querySelectorAll('.stop-hex-input').forEach(function (inp) {
      inp.addEventListener('blur', function (e) {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = e.target.value.trim();
        if (isValidHex(val)) {
          pushStopHistory();
          const color = normalizeHex(val);
          state.gradient.stops[idx].color = color;
          e.target.value = color.toUpperCase();
          const colorInput = e.target.closest('.stop-item').querySelector('.stop-color');
          if (colorInput) colorInput.value = color;
          updateGradientDisplay();
        } else {
          e.target.value = state.gradient.stops[idx].color.toUpperCase();
          showToast('请输入有效的 Hex 色值（如 #FF6B6B）');
        }
      });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.target.blur(); });
    });

    // 删除
    list.querySelectorAll('.stop-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (state.gradient.stops.length <= 2) { showToast('至少保留 2 种颜色'); return; }
        pushStopHistory();
        state.gradient.stops.splice(idx, 1);
        redistributePositions();
        renderStops();
        updateGradientDisplay();
      });
    });

    setupStopDragSort();
    updateUndoButton();
  }

  // 色阶拖拽排序（支持桌面端鼠标 + 手机端触摸）
  function setupStopDragSort() {
    const list = $('stopsList');
    let dragIdx = -1;

    function swapStops(fromIdx, toIdx) {
      pushStopHistory();
      const stops = state.gradient.stops;
      const moved = stops.splice(fromIdx, 1)[0];
      stops.splice(toIdx, 0, moved);
      redistributePositions();
      renderStops();
      updateGradientDisplay();
    }

    list.querySelectorAll('.stop-item').forEach(function (item) {
      item.draggable = true;

      // 桌面端拖拽
      item.addEventListener('dragstart', function (e) {
        dragIdx = parseInt(item.dataset.idx, 10);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      item.addEventListener('drop', function (e) {
        e.preventDefault();
        const targetIdx = parseInt(item.dataset.idx, 10);
        if (dragIdx !== -1 && dragIdx !== targetIdx) swapStops(dragIdx, targetIdx);
      });
      item.addEventListener('dragend', function () {
        item.classList.remove('dragging');
        dragIdx = -1;
      });

      // 手机端触摸拖拽
      let startX = 0, startY = 0, moved = false;
      item.addEventListener('touchstart', function (e) {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY; moved = false;
        dragIdx = parseInt(item.dataset.idx, 10);
      }, { passive: true });
      item.addEventListener('touchmove', function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8) {
          moved = true;
          e.preventDefault();
          item.classList.add('dragging');
          list.querySelectorAll('.stop-item').forEach(function (i) { i.classList.remove('drag-over'); });
          const el = document.elementFromPoint(t.clientX, t.clientY);
          const target = el ? el.closest('.stop-item') : null;
          if (target && target !== item) target.classList.add('drag-over');
        }
      }, { passive: false });
      item.addEventListener('touchend', function (e) {
        item.classList.remove('dragging');
        if (moved) {
          const t = e.changedTouches[0];
          const el = document.elementFromPoint(t.clientX, t.clientY);
          const target = el ? el.closest('.stop-item') : null;
          if (target && target !== item) {
            const targetIdx = parseInt(target.dataset.idx, 10);
            if (dragIdx !== -1 && dragIdx !== targetIdx) swapStops(dragIdx, targetIdx);
          }
        }
        list.querySelectorAll('.stop-item').forEach(function (i) { i.classList.remove('drag-over'); });
        dragIdx = -1;
      });
    });
  }

  /* ---------- 渐变显示 ---------- */
  function updateGradientDisplay() {
    const type = state.gradient.type;
    if (type === 'linear' || type === 'radial') renderLinearRadial();
    else if (type === 'mesh') renderMesh();
    else if (type === 'flow') renderFlow();
  }

  function clearGradientContent() {
    const preview = $('gradientPreview');
    Array.from(preview.children).forEach(function (child) {
      preview.removeChild(child);
    });
    preview.style.background = '';
  }

  function renderLinearRadial() {
    clearGradientContent();
    $('gradientPreview').style.background = buildGradientValue();
  }

  function buildGradientValue() {
    // 自动插入中间过渡色，消除色带
    const smooth = getSmoothStops(state.gradient.stops);
    const colors = smooth.map(function (s) { return s.color + ' ' + s.position + '%'; });
    if (state.gradient.type === 'linear') {
      return 'linear-gradient(' + state.gradient.angle + 'deg, ' + colors.join(', ') + ')';
    } else {
      return 'radial-gradient(circle, ' + colors.join(', ') + ')';
    }
  }

  /* ---------- Mesh ---------- */
  function renderMesh() {
    clearGradientContent();
    const preview = $('gradientPreview');
    const isDark = state.gradient.mesh.bg !== 'light';
    preview.style.background = isDark ? '#0f0f1a' : '#f0f0f5';

    state.gradient.mesh.blobs.forEach(function (blob, i) {
      const el = document.createElement('div');
      el.className = 'mesh-blob b' + (i + 1);
      el.style.backgroundColor = blob.color;
      el.style.left = blob.x + '%';
      el.style.top = blob.y + '%';
      el.style.width = blob.size + '%';
      el.style.height = blob.size + '%';
      el.style.mixBlendMode = isDark ? 'screen' : 'multiply';
      el.style.opacity = isDark ? '0.7' : '0.35';
      preview.appendChild(el);
    });

    if (state.gradient.mesh.animating) startMeshTimer();
  }

  function startMeshTimer() {
    stopMeshTimer();
    state.meshTimer = setInterval(function () {
      state.gradient.mesh.paletteIndex = (state.gradient.mesh.paletteIndex + 1) % MESH_PALETTES.length;
      const palette = MESH_PALETTES[state.gradient.mesh.paletteIndex];
      state.gradient.mesh.blobs.forEach(function (blob, i) { blob.color = palette[i]; });
      document.querySelectorAll('#gradientPreview .mesh-blob').forEach(function (el, i) {
        el.style.backgroundColor = palette[i];
      });
    }, 6000);
  }

  function stopMeshTimer() {
    if (state.meshTimer) { clearInterval(state.meshTimer); state.meshTimer = null; }
  }

  /* ---------- Flow ---------- */
  function renderFlow() {
    clearGradientContent();
    const preview = $('gradientPreview');
    preview.style.background = '#1a1a2e';
    state.flowLayerIndex = 0;

    const palettes = state.gradient.flow.palettes;
    palettes.forEach(function (palette, i) {
      const layer = document.createElement('div');
      layer.className = 'flow-layer f' + (i + 1) + (i === 0 ? ' active' : '');
      layer.style.backgroundImage = 'linear-gradient(270deg, ' + palette.join(', ') + ')';
      preview.appendChild(layer);
    });

    if (state.gradient.flow.animating) startFlowTimer();
  }

  function startFlowTimer() {
    stopFlowTimer();
    state.flowTimer = setInterval(function () {
      const layers = document.querySelectorAll('#gradientPreview .flow-layer');
      if (!layers.length) return;
      layers[state.flowLayerIndex].classList.remove('active');
      state.flowLayerIndex = (state.flowLayerIndex + 1) % layers.length;
      layers[state.flowLayerIndex].classList.add('active');
    }, 6000);
  }

  function stopFlowTimer() {
    if (state.flowTimer) { clearInterval(state.flowTimer); state.flowTimer = null; }
  }

  /* ---------- 暂停/播放 ---------- */
  function isAnimating() {
    const type = state.gradient.type;
    if (type === 'mesh') return state.gradient.mesh.animating;
    if (type === 'flow') return state.gradient.flow.animating;
    return false;
  }

  function togglePlay() {
    const type = state.gradient.type;
    if (type === 'mesh') {
      state.gradient.mesh.animating = !state.gradient.mesh.animating;
      if (state.gradient.mesh.animating) {
        $('gradientPreview').classList.remove('paused');
        startMeshTimer();
      } else {
        $('gradientPreview').classList.add('paused');
        stopMeshTimer();
      }
    } else if (type === 'flow') {
      state.gradient.flow.animating = !state.gradient.flow.animating;
      if (state.gradient.flow.animating) {
        $('gradientPreview').classList.remove('paused');
        startFlowTimer();
      } else {
        $('gradientPreview').classList.add('paused');
        stopFlowTimer();
      }
    }
    updatePlayButton();
  }

  function pauseAnimation() {
    const type = state.gradient.type;
    if (type === 'mesh') {
      state.gradient.mesh.animating = false;
      $('gradientPreview').classList.add('paused');
      stopMeshTimer();
    } else if (type === 'flow') {
      state.gradient.flow.animating = false;
      $('gradientPreview').classList.add('paused');
      stopFlowTimer();
    }
  }

  function resumeAnimation() {
    const type = state.gradient.type;
    if (type === 'mesh') {
      state.gradient.mesh.animating = true;
      $('gradientPreview').classList.remove('paused');
      startMeshTimer();
    } else if (type === 'flow') {
      state.gradient.flow.animating = true;
      $('gradientPreview').classList.remove('paused');
      startFlowTimer();
    }
    updatePlayButton();
  }

  function stopAllAnimation() {
    stopMeshTimer();
    stopFlowTimer();
    $('gradientPreview').classList.remove('paused');
  }

  function updatePlayButton() {
    const btn = $('playToggle');
    if (isAnimating()) {
      btn.textContent = '⏸ 暂停动画';
    } else {
      btn.textContent = '▶ 播放动画';
    }
  }

  /* ---------- CSS 输出 ---------- */
  function buildGradientCss() {
    const type = state.gradient.type;
    if (type === 'linear' || type === 'radial') {
      return 'background: ' + buildGradientValue() + ';';
    }
    if (type === 'mesh') {
      const blobs = state.gradient.mesh.blobs;
      const isDark = state.gradient.mesh.bg !== 'light';
      const bgColor = isDark ? '#0f0f1a' : '#f0f0f5';
      const blendMode = isDark ? 'screen' : 'multiply';
      const opacity = isDark ? '0.7' : '0.35';
      const layers = blobs.map(function (b) {
        return 'radial-gradient(circle at ' + b.x + '% ' + b.y + '%, ' + b.color + ' 0%, transparent 50%)';
      });
      return 'background-color: ' + bgColor + ';\nbackground-image: ' + layers.join(',\n  ') + ';\nbackground-blend-mode: ' + blendMode + ';\nopacity: ' + opacity + ';';
    }
    if (type === 'flow') {
      const palettes = state.gradient.flow.palettes;
      const palette = palettes[state.flowLayerIndex % palettes.length];
      return 'background: linear-gradient(270deg, ' + palette.join(', ') + ');\nbackground-size: 400% 400%;';
    }
    return '';
  }

  /* ---------- 下载壁纸 ---------- */
  function downloadGradientWallpaper() {
    const wasAnimating = isAnimating();
    if (wasAnimating) pauseAnimation();

    setTimeout(function () {
      const type = state.gradient.type;
      if (type === 'mesh') downloadMeshWallpaper();
      else if (type === 'flow') downloadFlowWallpaper();
      else downloadLinearRadialWallpaper();

      if (wasAnimating) resumeAnimation();
      incrementProcessCount();
    }, 150);
  }

  function downloadLinearRadialWallpaper() {
    const W = 1920, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const stops = state.gradient.stops;
    if (stops.length < 2) { showToast('至少需要 2 种颜色'); return; }

    // 自动插入中间过渡色
    const smooth = getSmoothStops(stops);

    if (state.gradient.type === 'linear') {
      const angle = state.gradient.angle * Math.PI / 180;
      const cx = W / 2, cy = H / 2;
      const len = Math.abs(W * Math.sin(angle)) + Math.abs(H * Math.cos(angle));
      const dx = Math.sin(angle) * len / 2;
      const dy = -Math.cos(angle) * len / 2;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      smooth.forEach(function (s) { grad.addColorStop(s.position / 100, s.color); });
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 2);
      smooth.forEach(function (s) { grad.addColorStop(s.position / 100, s.color); });
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, W, H);
    triggerDownload(canvas, 'gradient-wallpaper');
  }

  function downloadMeshWallpaper() {
    const W = 1920, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const preview = $('gradientPreview');
    const isDark = state.gradient.mesh.bg !== 'light';
    const bgColor = isDark ? '#0f0f1a' : '#f0f0f5';
    const blendMode = isDark ? 'screen' : 'multiply';
    const alpha = isDark ? 0.7 : 0.35;

    // 离屏 Canvas：缩小绘制 + blur，再高质量放大
    const scale = 0.2;
    const offW = Math.floor(W * scale);
    const offH = Math.floor(H * scale);
    const off = document.createElement('canvas');
    off.width = offW; off.height = offH;
    const offCtx = off.getContext('2d');

    offCtx.fillStyle = bgColor;
    offCtx.fillRect(0, 0, offW, offH);

    offCtx.globalCompositeOperation = blendMode;
    offCtx.globalAlpha = alpha;
    offCtx.filter = 'blur(28px)';

    const previewRect = preview.getBoundingClientRect();
    const blobEls = preview.querySelectorAll('.mesh-blob');
    blobEls.forEach(function (blobEl) {
      const rect = blobEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const cx = (rect.left - previewRect.left + rect.width / 2) / previewRect.width * offW;
      const cy = (rect.top - previewRect.top + rect.height / 2) / previewRect.height * offH;
      // 椭圆：CSS 中 16:9 框内百分比宽高不等，实际渲染为横向椭圆
      // rx 基于宽度、ry 基于高度，分别计算才能和预览形状对齐
      const rx = rect.width / previewRect.width * offW / 2;
      const ry = rect.height / previewRect.height * offH / 2;
      const color = blobEl.style.backgroundColor || '#ff6b6b';
      offCtx.fillStyle = color;
      offCtx.beginPath();
      offCtx.ellipse(cx, cy, Math.max(rx, 5), Math.max(ry, 5), 0, 0, Math.PI * 2);
      offCtx.fill();
    });

    // 高质量放大到主 Canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, offW, offH, 0, 0, W, H);

    triggerDownload(canvas, 'mesh-wallpaper');
  }

  function downloadFlowWallpaper() {
    const W = 1920, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const palettes = state.gradient.flow.palettes;
    const palette = palettes[state.flowLayerIndex % palettes.length];
    const grad = ctx.createLinearGradient(0, 0, W, H);
    palette.forEach(function (color, i) {
      grad.addColorStop(i / (palette.length - 1), color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    triggerDownload(canvas, 'flow-wallpaper');
  }

  function triggerDownload(canvas, prefix) {
    const link = document.createElement('a');
    link.download = prefix + '-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /* ========== 预设渐变库 ========== */

  // 辅助：用颜色数组同步 stops（linear/radial）
  function syncStopsFromColors(colors) {
    const list = colors.slice(0, 6);
    state.gradient.stops = list.map(function (c, i) {
      return {
        color: c,
        position: list.length > 1 ? Math.round(i / (list.length - 1) * 100) : 0
      };
    });
  }

  // 辅助：用颜色数组同步 mesh 光斑
  function syncMeshFromColors(colors) {
    state.gradient.mesh.blobs.forEach(function (blob, i) {
      blob.color = colors[i % colors.length];
    });
  }

  // 辅助：用颜色数组同步 flow palette（插入开头，限6组）
  function syncFlowFromColors(colors) {
    const palette = [];
    const targetLen = Math.max(5, colors.length);
    for (let i = 0; i < targetLen; i++) {
      palette.push(colors[i % colors.length]);
    }
    palette.push(palette[0]);
    state.gradient.flow.palettes.unshift(palette);
    if (state.gradient.flow.palettes.length > 6) {
      state.gradient.flow.palettes = state.gradient.flow.palettes.slice(0, 6);
    }
  }

  function renderPresets() {
    const grid = $('presetGrid');
    grid.innerHTML = '';
    PRESETS.forEach(function (p) {
      const item = document.createElement('div');
      item.className = 'preset-item';

      if (p.type === 'mesh') {
        const palette = MESH_PALETTES[p.palette];
        item.style.background = 'linear-gradient(135deg, ' + palette[0] + ', ' + palette[2] + ')';
        item.innerHTML = '<span class="preset-label">' + (p.label || 'Mesh') + '</span>';
      } else if (p.type === 'flow') {
        const palettes = state.gradient.flow.palettes;
        const palette = palettes[p.palette % palettes.length];
        item.style.background = 'linear-gradient(135deg, ' + palette[0] + ', ' + palette[2] + ', ' + palette[4] + ')';
        item.innerHTML = '<span class="preset-label">' + (p.label || 'Flow') + '</span>';
      } else {
        const colors = p.stops.map(function (s) { return s.color; });
        const bg = p.type === 'linear'
          ? 'linear-gradient(' + p.angle + 'deg, ' + colors.join(', ') + ')'
          : 'radial-gradient(circle, ' + colors.join(', ') + ')';
        item.style.background = bg;
      }

      item.title = p.label || '预设';
      item.addEventListener('click', function () { applyPreset(p); });
      grid.appendChild(item);
    });
  }

  function applyPreset(p) {
    stopAllAnimation();

    if (p.type === 'mesh') {
      state.gradient.type = 'mesh';
      state.gradient.mesh.paletteIndex = p.palette;
      state.gradient.mesh.animating = true;
      const palette = MESH_PALETTES[p.palette];
      state.gradient.mesh.blobs.forEach(function (blob, i) { blob.color = palette[i]; });
      // 同步其他类型
      syncStopsFromColors(palette);
      syncFlowFromColors(palette);
    } else if (p.type === 'flow') {
      state.gradient.type = 'flow';
      // 把选中的 palette 移到开头，确保优先显示
      const palettes = state.gradient.flow.palettes;
      const selected = palettes[p.palette % palettes.length];
      const idx = palettes.indexOf(selected);
      if (idx > 0) { palettes.splice(idx, 1); palettes.unshift(selected); }
      state.gradient.flow.paletteIndex = 0;
      state.gradient.flow.animating = true;
      state.flowLayerIndex = 0;
      // 同步其他类型
      const flowColors = selected.slice(0, 4);
      syncStopsFromColors(flowColors);
      syncMeshFromColors(flowColors);
    } else {
      state.gradient.type = p.type;
      state.gradient.angle = p.angle || 135;
      state.gradient.stops = p.stops.map(function (s) {
        return { color: s.color, position: s.position != null ? s.position : 0 };
      });
      // 同步其他类型
      const presetColors = p.stops.map(function (s) { return s.color; });
      syncMeshFromColors(presetColors);
      syncFlowFromColors(presetColors);
    }

    document.querySelectorAll('.seg-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.type === state.gradient.type);
    });
    const isLinear = state.gradient.type === 'linear';
    const isRadial = state.gradient.type === 'radial';
    const isAnimated = state.gradient.type === 'mesh' || state.gradient.type === 'flow';
    $('angleGroup').style.display = isLinear ? '' : 'none';
    $('stopsEditor').style.display = (isLinear || isRadial) ? '' : 'none';
    $('playToggle').hidden = !isAnimated;
    $('downloadHint').hidden = !isAnimated;
    $('stopsHint').hidden = isAnimated;
    $('meshBgGroup').hidden = state.gradient.type !== 'mesh';
    $('angleSlider').value = state.gradient.angle;
    $('angleVal').textContent = state.gradient.angle + '°';
    $('gradientPreview').classList.remove('paused');

    if (isLinear || isRadial) renderStops();
    updateGradientDisplay();
    updatePlayButton();
    $('gradientPreview').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ========== 统计与猫咪弹窗 ========== */
  const LS_TOTAL_COUNT = 'totalCompressedCount';
  const LS_LAST_CAT_COUNT = 'lastCatModalCount';

  function getTotalCount() { return parseInt(localStorage.getItem(LS_TOTAL_COUNT) || '0', 10); }
  function setTotalCount(n) { localStorage.setItem(LS_TOTAL_COUNT, String(n)); }
  function getLastCatCount() { return parseInt(localStorage.getItem(LS_LAST_CAT_COUNT) || '0', 10); }
  function setLastCatCount(n) { localStorage.setItem(LS_LAST_CAT_COUNT, String(n)); }

  function incrementProcessCount() {
    const n = getTotalCount() + 1;
    setTotalCount(n);
    maybeShowCatModal(n);
  }

  function maybeShowCatModal(currentCount) {
    if (state.catModalShowing) return;
    const threshold = (state.config && state.config.modalThreshold) || 9;
    const lastCatCount = getLastCatCount();
    if (currentCount > threshold && currentCount - lastCatCount >= threshold) {
      setLastCatCount(currentCount);
      showCatModal();
    }
  }

  function showCatModal() {
    state.catModalShowing = true;
    const modal = $('catModal');
    const btn = $('catCloseBtn');
    const seconds = (state.config && state.config.modalSeconds) || 5;

    modal.hidden = false;
    btn.disabled = true;
    btn.textContent = '残忍关掉 (' + seconds + 's)';

    let remaining = seconds;
    clearInterval(showCatModal._timer);
    showCatModal._timer = setInterval(function () {
      remaining--;
      if (remaining > 0) {
        btn.textContent = '残忍关掉 (' + remaining + 's)';
      } else {
        clearInterval(showCatModal._timer);
        btn.disabled = false;
        btn.textContent = '残忍关掉，继续免费使用';
      }
    }, 1000);

    btn.onclick = function () {
      if (btn.disabled) return;
      modal.hidden = true;
      state.catModalShowing = false;
    };
    modal.querySelector('.modal-mask').addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ========== 初始化 ========== */
  function init() {
    loadConfig().then(function () {
      setupRouting();
      setupWechatModal();
      setupUpload();
      setupGradientEditor();
      renderPresets();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
