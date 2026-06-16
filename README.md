# mainsail-cnc

[![Build Frontend](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/build-frontend.yml/badge.svg?branch=develop)](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/build-frontend.yml)
[![CI](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/ci.yml)

CNC-focused control stack built around Klipper, Moonraker, and a maintained [Mainsail](https://github.com/mainsail-prusa/mainsail) fork.

## Documentation

Full documentation on the [wiki](https://github.com/isaaceliape/mainsail-cnc/wiki):

- [Installation](https://github.com/isaaceliape/mainsail-cnc/wiki/Installation)
- [Architecture](https://github.com/isaaceliape/mainsail-cnc/wiki/Architecture)
- [API Reference](https://github.com/isaaceliape/mainsail-cnc/wiki/API)
- [Contributing](https://github.com/isaaceliape/mainsail-cnc/wiki/Contributing)
- [Changelog](https://github.com/isaaceliape/mainsail-cnc/wiki/Changelog)

## Quick start

```bash
git clone https://github.com/isaaceliape/mainsail-cnc.git ~/mainsail-cnc
cd ~/mainsail-cnc

# Ansible (recommended)
ansible-playbook ansible/playbooks/install.yml

# Or manual
bun install --frozen-lockfile && bun run build && ./deploy.sh --live
./scripts/install_to_moonraker.sh
```

## Repository layout

- `src/` — Vue 3.5 frontend with CNC panels
- `moonraker-cnc-agent/` — Moonraker CNC agent (Python)
- `klipper-extras/` — Klipper extra plugins (WCS support)
- `klipper-macros/` — CNC macros
- `scripts/` — metadata extractor, deploy, post-update
- `ansible/` — Ansible playbooks for install/deploy/uninstall
- `config/examples/` — example machine profile and update-manager config
- `moonraker-cnc-update.conf` — drop-in update_manager config
- `deploy.sh` — portable build-and-deploy script (`--live` to deploy)

## Contributors

- **Shadowphyre** — documentation, WCS integration review, and project guidance
