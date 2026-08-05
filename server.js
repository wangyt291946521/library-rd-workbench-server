// 图书馆研发工作台 - 后端服务
// 零依赖，纯 Node.js 内置模块
// Railway 部署：数据持久化到 /data 卷；本地运行：存当前目录
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = fs.existsSync('/data') ? '/data' : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// 加载服务端数据
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { projects: data.projects || [], tasks: data.tasks || [] };
  } catch (e) {
    return { projects: [], tasks: [] };
  }
}

// 保存服务端数据（原子写入：先写临时文件，再重命名）
function saveData(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

// MIME 类型映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 读取请求体
function readBody(req) {
  return new Promise(function (resolve) {
    var body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () { resolve(body); });
  });
}

// 发送 JSON 响应
function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async function (req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  var urlPath = req.url.split('?')[0];

  // ── API 路由 ──

  // GET /api/data — 拉取全部数据
  if (urlPath === '/api/data' && req.method === 'GET') {
    json(res, 200, loadData());
    return;
  }

  // POST /api/data — 上传同步全部数据
  if (urlPath === '/api/data' && req.method === 'POST') {
    try {
      var body = await readBody(req);
      var data = JSON.parse(body);
      if (!data.projects || !Array.isArray(data.projects)) throw new Error('格式错误');
      saveData(data);
      console.log('[sync] 数据已保存: ' + data.projects.length + ' 个项目, ' + data.tasks.length + ' 个任务');
      json(res, 200, { ok: true, savedAt: new Date().toISOString() });
    } catch (e) {
      json(res, 400, { error: '无效的数据格式' });
    }
    return;
  }

  // GET /api/health — 健康检查
  if (urlPath === '/api/health' && req.method === 'GET') {
    json(res, 200, { status: 'ok', uptime: process.uptime() });
    return;
  }

  // ── 静态文件 ──

  var filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.join(PUBLIC_DIR, filePath);

  // 防目录穿越
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    var content = fs.readFileSync(filePath);
    var ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    // 禁止缓存 HTML（确保前端总是最新版本）
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    res.writeHead(200);
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('='.repeat(50));
  console.log('图书馆研发工作台 - 后端服务已启动');
  console.log('端口: ' + PORT);
  console.log('数据文件: ' + DATA_FILE);
  console.log('='.repeat(50));
});
