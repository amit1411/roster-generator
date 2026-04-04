# OCI Deployment

This folder runs a Caddy reverse proxy, the backend service, and Postgres together on one Linux VM with Docker Compose.

## Files

- `backend.Dockerfile`: backend image
- `docker-compose.yml`: HTTP reverse proxy + backend + Postgres stack
- `.env.example`: environment template
- `Caddyfile`: reverse proxy config for IP-only HTTP access
- `manage.sh`: one script for start/stop/restart/logs/status

## Quick start

1. Copy the env template:

```bash
cd oci-deployment
cp .env.example .env
```

2. Update at least:

- `POSTGRES_PASSWORD`
- `ADMIN_RECOVERY_TOKEN`
- `GOOGLE_CLIENT_ID` if you use Google sign-in

3. Start the stack:

```bash
./manage.sh start
```

4. Check status:

```bash
./manage.sh status
```

5. Tail logs:

```bash
./manage.sh logs
```

6. Stop everything:

```bash
./manage.sh stop
```

## Notes

- Caddy is exposed on `PROXY_HTTP_PORT` from `.env` (default `80`)
- Postgres is exposed on `POSTGRES_HOST_PORT` from `.env` (default `5432`)
- Inside the stack:
  - Caddy proxies to `backend:8000`
  - backend connects to Postgres using the internal service hostname `db`
- Data is stored in the Docker volume `postgres-data`

## IP-only mode

This setup is intended for direct access via the VM's public IP, for example:

```text
http://203.0.113.10
```

Open port `80` inbound in OCI security rules and on the VM firewall.

## Typical VM setup

1. Attach the reserved public IP to the VM.
2. Open port `80` inbound to the instance.
3. Start the stack with `./manage.sh start`.
4. Access the backend at `http://<reserved-public-ip>`.
