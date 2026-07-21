const http = require('http');
const WebSocket = require('ws');
const net = require('net');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VLESS Cloudflare-Style Server is Running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Koneksi VLESS masuk (Wildcard UUID Aktif)...');
    let remoteSocket = null;
    let isFirstPacket = true;

    ws.on('message', (chunk) => {
        // Gabungkan buffer jika diperlukan
        const buffer = Buffer.from(chunk);

        // Jika paket pertama, ini adalah VLESS Header (isinya UUID, Command, Port, Address)
        if (isFirstPacket) {
            isFirstPacket = false;

            // STRATEGI BYPASS: Kita sengaja TIDAK mencocokkan UUID di buffer[0..16].
            // Apapun UUID yang dikirim dari Darktunnel langsung kita loloskan!
            
            // Ambil data target dari protokol VLESS secara manual
            const command = buffer[16]; // 1: TCP, 2: UDP
            const portIndex = 17;
            const targetPort = buffer.readUInt16BE(portIndex);
            
            const addressType = buffer[19];
            let addressIndex = 20;
            let targetAddress = '';

            if (addressType === 1) { // IPv4
                targetAddress = `${buffer[20]}.${buffer[21]}.${buffer[22]}.${buffer[23]}`;
            } else if (addressType === 2) { // Domain Name
                const domainLength = buffer[20];
                targetAddress = buffer.toString('utf8', 21, 21 + domainLength);
                addressIndex = 21 + domainLength;
            } else if (addressType === 3) { // IPv6
                targetAddress = buffer.toString('hex', 20, 36).match(/.{1,4}/g).join(':');
                addressIndex = 36;
            }

            // Potong header VLESS, ambil sisa payload/data internet aslinya
            // Biasanya vless header response version adalah 0
            const vlessResponseHeader = Buffer.from([0, 0]);
            ws.send(vlessResponseHeader);

            // Buka koneksi direct ke internet tujuan (misal ke google, sosmed, game, dll)
            remoteSocket = new net.Socket();
            remoteSocket.connect(targetPort, targetAddress, () => {
                // Jika ada sisa data di paket pertama setelah header, langsung kirim ke target
                const remainDataIndex = addressType === 1 ? 24 : (addressType === 2 ? addressIndex : 36);
                if (buffer.length > remainDataIndex) {
                    remoteSocket.write(buffer.slice(remainDataIndex));
                }
            });

            // Oper data dari internet kembali ke HP via WebSocket
            remoteSocket.on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            remoteSocket.on('error', () => ws.close());
            remoteSocket.on('close', () => ws.close());
        } else {
            // Paket selanjutnya tinggal diteruskan langsung
            if (remoteSocket && remoteSocket.writable) {
                remoteSocket.write(buffer);
            }
        }
    });

    ws.on('close', () => {
        if (remoteSocket) remoteSocket.destroy();
    });

    ws.on('error', () => {
        if (remoteSocket) remoteSocket.destroy();
    });
});

server.listen(port, () => {
    console.log(`VLESS Wildcard Worker running on port ${port}`);
});
