<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/E3CNC/E3CNC_UI/main/docs/assets/logo-dark.png">
    <img alt="E3CNC UI" src="https://raw.githubusercontent.com/E3CNC/E3CNC_UI/main/docs/assets/logo-light.png" height="120">
  </picture>
  <h1 align="center">E3CNC UI</h1>
  <p align="center">
    <a href="https://github.com/E3CNC/E3CNC_UI/releases"><img src="https://img.shields.io/github/v/release/E3CNC/E3CNC_UI?style=flat&label=Release&color=00FF00" alt="Release"></a>
    <a href="https://github.com/E3CNC/E3CNC_UI/actions/workflows/build-frontend.yml"><img src="https://github.com/E3CNC/E3CNC_UI/actions/workflows/build-frontend.yml/badge.svg?branch=main" alt="Build Frontend"></a>
    <a href="https://github.com/E3CNC/E3CNC_UI/blob/main/LICENSE"><img src="https://img.shields.io/github/license/E3CNC/E3CNC_UI?style=flat&label=License&color=00FF00" alt="License"></a>
  </p>
</div>

A modern, responsive CNC controller interface for Klipper-based machines — forked from [Mainsail](https://github.com/mainsail-crew/mainsail) and retargeted from 3D printing to CNC machine control. Built with **Vue 3.5** and **Vuetify 3**.

## Quick start (on a Klipper / Moonraker host)

```bash
git clone https://github.com/E3CNC/E3CNC_UI.git ~/E3CNC_UI && cd ~/E3CNC_UI
```

### Ansible (recommended)

```bash
ansible-playbook ansible/playbooks/install.yml
```

### Bash install script (legacy)

```bash
./scripts/install_to_moonraker.sh
```

Both methods are idempotent — re-run them to upgrade.

### Updating

If you installed via Ansible or the install script, your `moonraker.conf` already has an `[update_manager E3CNC_UI]` section. Moonraker will pull updates automatically (you can also trigger a manual update from the UI's update panel).

## Migration from mainsail-cnc

If you previously installed from the experimental `mainsail-cnc` repo:

```bash
cd ~/mainsail-cnc
git remote set-url origin https://github.com/E3CNC/E3CNC_UI.git
git pull
./scripts/install_to_moonraker.sh
```

Then update your `moonraker.conf` to replace `[update_manager mainsail-cnc]` with `[update_manager E3CNC_UI]` (or just re-run the install script which handles this).

## Features

- **CNC-specific UI** — job queue, tool tables, work coordinate systems (WCS), MDI console, probe dialogs
- **G-code viewer** — 3D toolpath visualization with layer and colouring controls
- **Webcam integration** — MJPEG, UV4L, HLS, WebRTC, JMuxer, and iframe stream types
- **Customizable dashboard** — draggable panels, layout profiles for mobile/tablet/desktop/widescreen
- **Multi-instance Farm mode** — manage multiple Klipper hosts from one dashboard
- **History & statistics** — print job history, time-lapse management, maintenance scheduling
- **Power device control** — TPLink Smart Plug, Shelly, Tasmota, and generic HTTP switches
- **i18n** — multi-language support

## CNC extras

This monorepo also ships:

- [`moonraker-cnc-agent`](./E3CNC/moonraker-cnc-agent/) — Moonraker component that provides CNC-specific APIs (jog, probe, tool-change, WCS) and a gcode metadata extractor
- [`klipper-extras`](./E3CNC/extras/) — Work Coordinate System (WCS) Klipper module
- [`klipper-macros`](./E3CNC/macros/) — G-code macros for CNC workflows (tool change, probing, WCS, job management)

## Documentation

Full docs on the [wiki](https://github.com/E3CNC/E3CNC_UI/wiki):

- [Installation](https://github.com/E3CNC/E3CNC_UI/wiki/Installation)
- [Architecture](https://github.com/E3CNC/E3CNC_UI/wiki/Architecture)
- [API Reference](https://github.com/E3CNC/E3CNC_UI/wiki/API)
- [Features](https://github.com/E3CNC/E3CNC_UI/wiki/Features)
- [Changelog](https://github.com/E3CNC/E3CNC_UI/wiki/Changelog)
- [Contributing](https://github.com/E3CNC/E3CNC_UI/wiki/Contributing)

## License

[GPL-3.0](LICENSE)

## Acknowledgements

- [Mainsail](https://github.com/mainsail-crew/mainsail) — the upstream project this UI is forked from
- [Klipper](https://www.klipper3d.org/) — the 3D printer firmware that powers our CNC machines
- [Moonraker](https://github.com/Arksine/moonraker) — the API server that connects the UI to Klipper
- [Vue](https://vuejs.org/) / [Vuetify](https://vuetifyjs.com/) — the frontend framework
- [Shadowphyre](https://github.com/Shadowphyre) — documentation, WCS integration review, project guidance
