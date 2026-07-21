#!/bin/sh
PORT=${PORT:-8080}

echo "Memulai Server Wildcard (Accept All UUID/Password)..."
echo "Railway Port: $PORT"

# Sesuaikan port inbound utama dengan port dinamis Railway
sed -i "s/8080/$PORT/g" /etc/xray/config.json

# Jalankan Xray
exec xray -config /etc/xray/config.json
