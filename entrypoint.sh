#!/bin/sh
PORT=${PORT:-8080}

echo "Memulai Server Wildcard Direct Railway..."
sed -i "s/8080/$PORT/g" /etc/xray/config.json

exec xray -config /etc/xray/config.json