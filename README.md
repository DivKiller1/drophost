# DropHost

Self-hosted static site deployment platform for LAN-only hosting with a shared Nginx proxy.

## Running locally

1. Copy `.env.example` to `.env` and adjust secrets and LAN IP.
2. Create the external macvlan network (once):

```bash
docker network create ^
  -d macvlan ^
  --subnet=192.168.1.0/24 ^
  --gateway=192.168.1.1 ^
  -o parent=eth0 ^
  drophost_macvlan
```

3. From the `drophost` directory build and start the stack:

```bash
docker compose up --build
```

The dashboard should then be available on `http://192.168.1.12/` from devices on the same LAN.


## Report
![Drophost](./drophost.md)

## Report Link:


