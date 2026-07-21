#!/bin/sh
PORT=${PORT:-8080}

echo "Memulai VLESS Wildcard Dynamic Port..."
sed -i "s/8080/$PORT/g" /etc/xray/config.json

exec xray -config /etc/xray/config.json