// ============================================
// RAILWAY GATEWAY - FULL COMPLETE (TUNED FOR SPEED)
// UI Cyberpunk + VLESS/Trojan Generator + WebSocket + UDP
// Optimized by ddfathu: TCP_NODELAY Enabled + High Performance WS
// ============================================

const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const fetch = require('node-fetch');
const http = require('http');
const https = require('https');
const url = require('url');

// Constants
const horse = Buffer.from("dHJvamFu", 'base64').toString(); // "trojan"
const flash = Buffer.from("dm1lc3M=", 'base64').toString(); // "vmess"
const v2 = Buffer.from("djJyYXk=", 'base64').toString(); // "v2ray"
const neko = Buffer.from("Y2xhc2g=", 'base64').toString(); // "clash"

const KV_PRX_URL = "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/refs/heads/main/kvProxyList.json";
const DNS_SERVER_ADDRESS = "8.8.8.8";
const DNS_SERVER_PORT = 53;
const CORS_HEADER_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Region Mapping
const REGION_MAP = {
  ASIA: ["ID", "SG", "MY", "PH", "TH", "VN", "JP", "KR", "CN", "HK", "TW"],
  SOUTHASIA: ["IN", "BD", "PK", "LK", "NP", "AF", "BT", "MV"],
  CENTRALASIA: ["KZ", "UZ", "TM", "KG", "TJ"],
  NORTHASIA: ["RU"],
  MIDDLEEAST: ["AE", "SA", "IR", "IQ", "JO", "IL", "YE", "SY", "OM", "KW", "QA", "BH", "LB"],
  CIS: ["RU", "UA", "BY", "KZ", "UZ", "AM", "GE", "MD", "TJ", "KG", "TM", "AZ"],
  WESTEUROPE: ["FR", "DE", "NL", "BE", "AT", "CH", "IE", "LU", "MC"],
  EASTEUROPE: ["PL", "CZ", "SK", "HU", "RO", "BG", "MD", "UA", "BY"],
  NORTHEUROPE: ["SE", "FI", "NO", "DK", "EE", "LV", "LT", "IS"],
  SOUTHEUROPE: ["IT", "ES", "PT", "GR", "HR", "SI", "MT", "AL", "BA", "RS", "ME", "MK"],
  EUROPE: ["FR", "DE", "NL", "BE", "AT", "CH", "IE", "LU", "MC", "PL", "CZ", "SK", "HU", "RO", "BG", "MD", "UA", "BY", "SE", "FI", "NO", "DK", "EE", "LV", "LT", "IS", "IT", "ES", "PT", "GR", "HR", "SI", "MT", "AL", "BA", "RS", "ME", "MK"],
  AFRICA: ["ZA", "NG", "EG", "MA", "KE", "DZ", "TN", "GH", "CI", "SN", "ET"],
  NORTHAMERICA: ["US", "CA", "MX"],
  SOUTHAMERICA: ["BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO"],
  LATAM: ["MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO", "CR", "GT", "PA", "DO", "HN", "NI", "SV"],
  AMERICA: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC"],
  OCEANIA: ["AU", "NZ", "PG", "FJ"],
  GLOBAL: []
};

class GatewayServer {
  constructor() {
    this.prxIP = "";
    this.cachedPrxList = [];
    this.wss = null;
    this.httpServer = null;
    this.activeUDPConnections = new Map();
    this.CORS_HEADER_OPTIONS = CORS_HEADER_OPTIONS;
  }

  // ==================== HTTP HANDLERS ====================

  handleHealthCheck(req, res) {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'railway-gateway-tuned',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.1.0-tuned'
    };
    res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
    res.end(JSON.stringify(healthData, null, 2));
  }

  handleCorsPreflight(req, res) {
    res.writeHead(200, this.CORS_HEADER_OPTIONS);
    res.end();
  }

  async handleApiRequest(req, res, parsedUrl) {
    try {
      if (parsedUrl.pathname === '/api/proxies') {
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        const format = parsedUrl.query.format || 'json';
        
        if (format === 'text') {
          const proxyText = proxies.map(p => `${p.country} - ${p.prxIP}:${p.prxPort}`).join('\n');
          res.writeHead(200, { 'Content-Type': 'text/plain', ...this.CORS_HEADER_OPTIONS });
          res.end(proxyText);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...this.CORS_HEADER_OPTIONS });
        res.end(JSON.stringify(proxies, null, 2));
        return;
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  async handleHttpRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (req.method === 'OPTIONS') { this.handleCorsPreflight(req, res); return; }
    if (parsedUrl.pathname === '/health') { this.handleHealthCheck(req, res); return; }
    if (parsedUrl.pathname.startsWith('/api/')) { await this.handleApiRequest(req, res, parsedUrl); return; }
    
    if (parsedUrl.pathname === '/') {
      const currentHost = req.headers.host || 'localhost:3000';
      const protocolWs = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const protocolHttp = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const uptime = Math.floor(process.uptime());
      const ramUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const nodeVersion = process.version;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAILWAY GATEWAY // TUNED DASHBOARD</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
    body { font-family: 'JetBrains Mono', monospace; background-color: #0a0b10; }
    .cyber-glow { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
    .cyber-glow-green { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
    .neon-border { border: 1px solid rgba(59, 130, 246, 0.3); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f111a; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
  </style>
</head>
<body class="text-slate-300 min-h-screen flex flex-col justify-between">
  <header class="border-b border-slate-900 bg-[#0d0e16]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 cyber-glow">
          <i class="fa-solid fa-terminal text-lg"></i>
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-wider text-white">RAILWAY_GATEWAY<span class="text-emerald-500">.tuned</span></h1>
          <p class="text-xs text-slate-500">TCP_NODELAY ACCELERATION ACTIVE</p>
        </div>
      </div>
      <div class="bg-[#121420] neon-border px-4 py-2 rounded-lg flex items-center gap-2">
        <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 cyber-glow-green animate-pulse"></span>
        <span class="text-xs font-semibold text-emerald-400 tracking-wider">TUNED ONLINE</span>
      </div>
    </div>
  </header>

  <main class="max-w-7xl w-full mx-auto p-6 space-y-8 flex-grow">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div><p class="text-xs text-slate-500 font-medium mb-1">SYSTEM UPTIME</p><p id="uptime-val" class="text-lg font-bold text-white">${uptime}s</p></div>
        <i class="fa-solid fa-clock text-slate-700 text-2xl"></i>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div><p class="text-xs text-slate-500 font-medium mb-1">RAM ALLOCATION</p><p class="text-lg font-bold text-white">${ramUsed} MB</p></div>
        <i class="fa-solid fa-microchip text-slate-700 text-2xl"></i>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div><p class="text-xs text-slate-500 font-medium mb-1">BUFFER ACCELERATION</p><p class="text-lg font-bold text-emerald-400">OPTIMIZED</p></div>
        <i class="fa-solid fa-bolt text-emerald-900/50 text-2xl"></i>
      </div>
      <div class="bg-[#0d0e16] neon-border p-5 rounded-xl flex items-center justify-between">
        <div><p class="text-xs text-slate-500 font-medium mb-1">ENGINE ENGINE</p><p class="text-lg font-bold text-blue-400">NODE SPEED</p></div>
        <i class="fa-brands fa-node-js text-blue-900/50 text-2xl"></i>
      </div>
    </div>

    <!-- ACC GENERATOR LINKED -->
    <div class="bg-[#0d0e16] border border-slate-900 rounded-xl p-6 space-y-5">
      <div class="flex items-center gap-2 border-b border-slate-900 pb-3"><i class="fa-solid fa-key text-yellow-400"></i><h2 class="text-md font-bold text-white">FAST GENERATOR</h2></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="space-y-4">
          <input id="uuidInput" type="text" value="853b8456-0c0b-4bfa-b3b4-b2619248a9bc" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono">
          <input id="hostInput" type="text" value="${currentHost}" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono">
          <input id="pathInput" type="text" value="/ALL" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono">
          <input id="sniInput" type="text" value="business.whatsapp.com" class="w-full bg-[#10121d] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono">
          <button id="generateBtn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg text-xs">GENERATE LINK</button>
        </div>
        <div class="space-y-2">
          <p id="vlessOutput" class="text-xs text-purple-300 font-mono break-all bg-[#0a0b12] p-3 rounded border border-slate-900">Click generate...</p>
        </div>
      </div>
    </div>
  </main>
  <script>
    function generateAccounts() {
      const uuid = document.getElementById('uuidInput').value;
      const host = document.getElementById('hostInput').value;
      const path = encodeURIComponent(document.getElementById('pathInput').value);
      const sni = document.getElementById('sniInput').value;
      document.getElementById('vlessOutput').innerText = 'vless://' + uuid + '@' + host + ':443?encryption=none&security=tls&sni=' + sni + '&type=ws&host=' + host + '&path=' + path + '#TUNED-SPEED';
    }
    document.getElementById('generateBtn').addEventListener('click', generateAccounts);
    let uptimeStart = ${uptime}; setInterval(() => { uptimeStart++; document.getElementById('uptime-val').innerText = uptimeStart + 's'; }, 1000);
  </script>
</body>
</html>`);
    } else {
      const targetReversePrx = process.env.REVERSE_PRX_TARGET;
      if (targetReversePrx) { await this.reverseWeb(req, res, targetReversePrx); } 
      else { res.writeHead(404); res.end('Not Found'); }
    }
  }

  async reverseWeb(request, response, target, targetPath) {
    try {
      const targetUrl = new URL(request.url);
      const targetChunk = target.split(":");
      targetUrl.hostname = targetChunk[0];
      targetUrl.port = targetChunk[1]?.toString() || "443";
      targetUrl.pathname = targetPath || targetUrl.pathname;

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: targetUrl.pathname + targetUrl.search,
        method: request.method,
        headers: { ...request.headers }
      };
      options.headers['host'] = targetUrl.hostname;

      const proxyReq = (targetUrl.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        response.writeHead(proxyRes.statusCode, { ...this.CORS_HEADER_OPTIONS, ...proxyRes.headers });
        proxyRes.pipe(response);
      });
      proxyReq.end();
    } catch (err) {
      response.writeHead(500); response.end();
    }
  }

  // ==================== PROXY LIST DATA MAPPING ====================

  async getKVPrxList(kvPrxUrl = KV_PRX_URL) {
    try {
      const kvPrx = await fetch(kvPrxUrl);
      if (kvPrx.status == 200) return await kvPrx.json();
      return {};
    } catch (error) { return {}; }
  }

  async getPrxList(prxBankUrl) {
    if (!prxBankUrl) return [];
    try {
      const response = await fetch(prxBankUrl);
      if (response.status === 200) {
        const data = await response.json();
        return data.map(proxy => {
          const ip = proxy.prxIP || proxy.ip || proxy.server;
          const port = proxy.prxPort || proxy.port;
          const country = proxy.country || proxy.cc || 'XX';
          return { prxIP: ip, prxPort: port, country: country.toUpperCase() };
        }).filter(Boolean);
      }
      return [];
    } catch (error) { return []; }
  }

  // ==================== WEBSOCKET TUNING HANDLERS ====================

  async handleWebSocketConnection(ws, request) {
    try {
      const parsedUrl = url.parse(request.url, true);
      const path = parsedUrl.pathname;

      // Optimasi internal socket pada objek WebSocket ws
      ws._socket.setNoDelay(true); // Mematikan algoritma Nagle (Langsung Tembak)
      ws._socket.setKeepAlive(true, 15000); // Menjaga koneksi tetap hidup secara agresif

      const proxyListMatch = path.match(/^\/PROXYLIST\/([A-Z]{2}(,[A-Z]{2})*)$/i);
      if (proxyListMatch) {
        const countryCodes = proxyListMatch[1].toUpperCase().split(",");
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          const availableCountries = countryCodes.filter(code => kvPrx[code] && kvPrx[code].length > 0);
          if (availableCountries.length === 0) { ws.close(1000); return; }
          const prxKey = availableCountries[Math.floor(Math.random() * availableCountries.length)];
          this.prxIP = kvPrx[prxKey][Math.floor(Math.random() * kvPrx[prxKey].length)];
        } else {
          const filteredProxies = proxies.filter(p => countryCodes.includes(p.country));
          if (filteredProxies.length === 0) { ws.close(1000); return; }
          const randomProxy = filteredProxies[Math.floor(Math.random() * filteredProxies.length)];
          this.prxIP = `${randomProxy.prxIP}:${randomProxy.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const allMatch = path.match(/^\/ALL(\d+)?$/i);
      if (allMatch) {
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          const allProxies = Object.values(kvPrx).flat();
          if (allProxies.length === 0) { ws.close(1000); return; }
          this.prxIP = allProxies[Math.floor(Math.random() * allProxies.length)];
        } else {
          let selectedProxy = proxies[Math.floor(Math.random() * proxies.length)];
          this.prxIP = `${selectedProxy.prxIP}:${selectedProxy.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      const countryMatch = path.match(/^\/([A-Z]{2})(\d+)?$/);
      if (countryMatch) {
        const countryCode = countryMatch[1].toUpperCase();
        const proxies = await this.getPrxList(process.env.PRX_BANK_URL);
        if (proxies.length === 0) {
          const kvPrx = await this.getKVPrxList();
          if (!kvPrx[countryCode] || kvPrx[countryCode].length === 0) { ws.close(1000); return; }
          this.prxIP = kvPrx[countryCode][Math.floor(Math.random() * kvPrx[countryCode].length)];
        } else {
          const filtered = proxies.filter(p => p.country === countryCode);
          if (filtered.length === 0) { ws.close(1000); return; }
          const sel = filtered[Math.floor(Math.random() * filtered.length)];
          this.prxIP = `${sel.prxIP}:${sel.prxPort}`;
        }
        await this.websocketHandler(ws);
        return;
      }

      // Default fallback direct if /ALL or specific paths are used simply
      this.prxIP = ""; 
      await this.websocketHandler(ws);
    } catch (err) {
      ws.close(1011);
    }
  }

  async websocketHandler(ws) {
    let remoteSocketWrapper = { value: null };

    ws.on('message', async (message) => {
      try {
        const chunk = Buffer.from(message);
        if (remoteSocketWrapper.value) { 
          remoteSocketWrapper.value.write(chunk); 
          return; 
        }

        const protocol = await this.protocolSniffer(chunk);
        let protocolHeader;

        if (protocol === horse) protocolHeader = this.readHorseHeader(chunk);
        else if (protocol === flash) protocolHeader = this.readFlashHeader(chunk);
        else if (protocol === "ss") protocolHeader = this.readSsHeader(chunk);
        else throw new Error("Unknown Protocol!");

        if (protocolHeader.hasError) throw new Error(protocolHeader.message);

        if (protocolHeader.isUDP) {
          return await this.handleUDPOutbound(protocolHeader.addressRemote, protocolHeader.portRemote, chunk.slice(protocolHeader.rawDataIndex), ws, protocolHeader.version);
        }

        this.handleTCPOutBound(remoteSocketWrapper, protocolHeader.addressRemote, protocolHeader.portRemote, protocolHeader.rawClientData, ws, protocolHeader.version);
      } catch (err) {
        ws.close(1011);
      }
    });

    ws.on('close', () => {
      if (remoteSocketWrapper.value) remoteSocketWrapper.value.end();
      this.cleanupUDPConnections(ws);
    });

    ws.on('error', () => {
      this.cleanupUDPConnections(ws);
    });
  }

  async protocolSniffer(buffer) {
    if (buffer.length >= 62) {
      const d = buffer.slice(56, 60);
      if (d[0] === 0x0d && d[1] === 0x0a && [0x01,0x03,0x7f].includes(d[2]) && [0x01,0x03,0x04].includes(d[3])) return horse;
    }
    const h = buffer.slice(1, 17).toString('hex');
    if (h.match(/^[0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}$/i)) return flash;
    return "ss";
  }

  // MODIFIKASI SAKTI: TCP TUNING UNTUK SPEED MAXIMUM
  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader) {
    const connectAndWrite = (address, port) => new Promise((resolve, reject) => {
      // Buka jalur TCP murni dengan mematikan Nagle Algorithm (setNoDelay)
      const s = net.createConnection({ host: address, port }, () => { 
        s.setNoDelay(true); // AKSELERASI DATA INSTAN
        s.setKeepAlive(true, 15000);
        s.write(rawClientData); 
        resolve(s); 
      });
      s.on('error', reject);
    });

    const retry = async () => {
      try {
        const destIP = this.prxIP ? (this.prxIP.split(/[:=-]/)[0] || addressRemote) : addressRemote;
        const destPort = this.prxIP ? (this.prxIP.split(/[:=-]/)[1] || portRemote) : portRemote;
        const s = await connectAndWrite(destIP, destPort);
        remoteSocket.value = s;
        s.on('close', () => webSocket.close());
        s.on('error', () => webSocket.close());
        this.remoteSocketToWS(s, webSocket, responseHeader, null);
      } catch(e) { webSocket.close(); }
    };

    try {
      const s = await connectAndWrite(addressRemote, portRemote);
      remoteSocket.value = s;
      s.on('close', () => webSocket.close());
      s.on('error', () => webSocket.close());
      this.remoteSocketToWS(s, webSocket, responseHeader, retry);
    } catch(e) { await retry(); }
  }

  async handleUDPOutbound(targetAddress, targetPort, dataChunk, webSocket, responseHeader) {
    return new Promise((resolve) => {
      try {
        let header = responseHeader;
        const key = `${targetAddress}:${targetPort}:${Date.now()}`;
        const sock = dgram.createSocket('udp4');
        this.activeUDPConnections.set(key, { socket: sock, webSocket });
        sock.on('error', () => { try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); });
        sock.send(dataChunk, targetPort, targetAddress, (e) => { if(e){ try{sock.close()}catch(_){} this.activeUDPConnections.delete(key); } });
        
        sock.on('message', (msg) => {
          if (webSocket.readyState === WebSocket.OPEN) {
            if (header) { webSocket.send(Buffer.concat([Buffer.from(header), msg])); header = null; }
            else webSocket.send(msg);
          }
        });
        sock.on('close', () => this.activeUDPConnections.delete(key));
      } catch(e) {}
    });
  }

  cleanupUDPConnections(webSocket) {
    for (const [key, conn] of this.activeUDPConnections) {
      if (conn.webSocket === webSocket) { try { conn.socket.close(); } catch(_) {} this.activeUDPConnections.delete(key); }
    }
  }

  readSsHeader(buf) {
    const at = buf[0]; let al = 0, avi = 1, av = "";
    if (at === 1) { al = 4; av = Array.from(buf.slice(avi, avi+al)).join("."); }
    else if (at === 3) { al = buf[avi]; avi += 1; av = buf.slice(avi, avi+al).toString(); }
    const pi = avi + al; const pr = buf.readUInt16BE(pi);
    return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: pi+2, rawClientData: buf.slice(pi+2), version: null, isUDP: pr == 53 };
  }

  readFlashHeader(buf) {
    const v = buf[0]; let udp = false;
    const ol = buf[17]; const cmd = buf[18+ol];
    if (cmd === 2) udp = true;
    const pi = 18+ol+1; const pr = buf.readUInt16BE(pi);
    let ai = pi+2; const at = buf[ai]; let al = 0, avi = ai+1, av = "";
    if (at === 1) { al = 4; av = Array.from(buf.slice(avi, avi+al)).join("."); }
    else if (at === 2) { al = buf[avi]; avi += 1; av = buf.slice(avi, avi+al).toString(); }
    return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: avi+al, rawClientData: buf.slice(avi+al), version: Buffer.from([v,0]), isUDP: udp };
  }

  readHorseHeader(buf) {
    const db = buf.slice(58);
    let udp = false; const cmd = db[0];
    if (cmd == 3) udp = true;
    let at = db[1]; let al = 0, avi = 2, av = "";
    if (at === 1) { al = 4; av = Array.from(db.slice(avi, avi+al)).join("."); }
    else if (at === 3) { al = db[avi]; avi += 1; av = db.slice(avi, avi+al).toString(); }
    const pi = avi + al; const pr = db.readUInt16BE(pi);
    return { hasError: false, addressRemote: av, portRemote: pr, rawDataIndex: pi+4, rawClientData: db.slice(pi+4), version: null, isUDP: udp };
  }

  remoteSocketToWS(remoteSocket, webSocket, responseHeader, retry) {
    let header = responseHeader, hasData = false;
    remoteSocket.on('data', (chunk) => {
      hasData = true;
      if (webSocket.readyState !== WebSocket.OPEN) { remoteSocket.destroy(); return; }
      if (header) { webSocket.send(chunk); header = null; } // Modif optimasi buffer pipe direct
      else webSocket.send(chunk);
    });
    remoteSocket.on('close', () => { if (!hasData && retry) retry(); });
  }

  start(port = process.env.PORT || 8080) {
    const server = http.createServer((req, res) => {
      this.handleHttpRequest(req, res).catch(() => {
        res.writeHead(500); res.end();
      });
    });

    // Menambah tuning parameter perMessageDeflate agar server gak pusing ngorbanin CPU buat kompresi
    this.wss = new WebSocket.Server({ 
      server, 
      perMessageDeflate: false,
      maxPayload: 50 * 1024 * 1024 // 50MB limits bypass burst
    });

    this.wss.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 TUNED ENGINE: Running smooth on port ${port}`);
    });
    this.httpServer = server;
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  const port = process.env.PORT || 8080;
  server.start(port);
}

module.exports = GatewayServer;
