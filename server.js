const http = require('http');
const WebSocket = require('ws');
const net = require('net');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VLESS Wildcard Engine is Running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Koneksi Darktunnel Masuk (Bypass UUID)...');
    let remoteSocket = null;
    let isFirstPacket = true;

    ws.on('message', (chunk) => {
        const buffer = Buffer.from(chunk);

        if (isFirstPacket) {
            isFirstPacket = false;

            // --- PROSES PARSING VLESS HEADER ---
            // buffer[0] = VLESS Version (biasanya 0)
            // buffer[1..16] = UUID (16 bytes) -> SENGAJA DIABAIKAN / WILDCARD!
            
            const addonsLength = buffer[17];
            const command = buffer[18 + addonsLength]; // 1 = TCP, 2 = UDP
            
            const portIndex = 19 + addonsLength;
            const targetPort = buffer.readUInt16BE(portIndex);
            
            const addressType = buffer[21 + addonsLength];
            let addressIndex = 22 + addonsLength;
            let targetAddress = '';

            if (addressType === 1) { // IPv4 (4 bytes)
                targetAddress = ${buffer[addressIndex]}.${buffer[addressIndex+1]}.${buffer[addressIndex+2]}.${buffer[addressIndex+3]};
                addressIndex += 4;
            } else if (addressType === 2) { // Domain Name
                const domainLength = buffer[addressIndex];
                targetAddress = buffer.toString('utf8', addressIndex + 1, addressIndex + 1 + domainLength);
                addressIndex += 1 + domainLength;
            } else if (addressType === 3) { // IPv6 (16 bytes)
                targetAddress = buffer.toString('hex', addressIndex, addressIndex + 16).match(/.{1,4}/g).join(':');
                addressIndex += 16;
            }

            console.log(Membuka jalur ke target -> ${targetAddress}:${targetPort});

            // Kirim balik VLESS Response Header ke Darktunnel (Version 0, Addons 0)
            const vlessResponseHeader = Buffer.from([0, 0]);
            ws.send(vlessResponseHeader);

            // Konekin langsung ke internet (Direct)
            remoteSocket = new net.Socket();
            remoteSocket.connect(targetPort, targetAddress, () => {
                // Jika ada sisa data payload setelah header di paket pertama, langsung kirim
                if (buffer.length > addressIndex) {
                    remoteSocket.write(buffer.slice(addressIndex));
                }
            });

            // Oper balik data dari internet ke HP lewat WebSocket
            remoteSocket.on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });

            remoteSocket.on('error', (err) => {
                console.log('Remote socket error:', err.message);
                ws.close();
            });
            
            remoteSocket.on('close', () => ws.close());

        } else {
            // Paket data selanjutnya tinggal diteruskan mentah-mentah
            if (remoteSocket && remoteSocket.writable) {
                remoteSocket.write(buffer);
            }
        }
    });

    ws.on('close', () => {
        if (remoteSocket) remoteSocket.destroy();
        console.log('Koneksi terputus.');
    });

    ws.on('error', () => {
        if (remoteSocket) remoteSocket.destroy();
    });
});

server.listen(port, () => {
    console.log(Server Wildcard VLESS jalan di port ${port});
});