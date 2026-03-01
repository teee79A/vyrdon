# ASUS Codex Container Activation

## Prerequisites
- Docker Engine + Docker Compose installed
- `/home/t79/.asus_secrets/openai.key` contains real API key

## Run
```bash
cd /home/t79/ASUS/codex
docker compose -f docker/docker-compose.yml up -d --build
```

## Check
```bash
docker compose -f docker/docker-compose.yml ps
curl http://127.0.0.1:4000/health
```

## Stop
```bash
docker compose -f docker/docker-compose.yml down
```

## Install systemd service
```bash
sudo cp /home/t79/ASUS/ops/systemd/asus-codex-container.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now asus-codex-container
systemctl status asus-codex-container --no-pager -n 50
```
