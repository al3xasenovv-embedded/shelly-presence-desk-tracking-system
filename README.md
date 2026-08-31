# shelly-presence-desk-tracking-system

## Overview

A tracking system for monitoring desk occupancy — when a user sits down and stands up — using a Shelly BLU Button as the input trigger, Node-RED for processing, and PostgreSQL for persistence. Built as a practical application of the Node-RED, MQTT, and PostgreSQL fundamentals covered in earlier sessions.

## Requirements

### Functional

- **FR1**: A single button press toggles the current state (sat ↔ stood) for a given desk/user
- **FR2**: Every state change is recorded with an exact timestamp
- **FR3**: The schema supports multiple users/desks from day one, even though Phase 1 uses a single physical button
- **FR4**: A live dashboard shows the current status (sitting / not sitting) for each tracked user in real time
- **FR5**: Data can be exported on a daily basis (CSV or similar)
- **FR6** *(stretch)*: Total sitting duration per day/week, per user
- **FR7** *(stretch)*: Historical view beyond "current status" (e.g. last 7 days)
- **FR8** *(stretch)*: Alerting if a user hasn't stood up within a configurable time window

### Non-Functional

- **NFR1**: Local-first — presence tracking favors low latency over remote access, so local MQTT is preferred over Cloud API polling
- **NFR2**: Data is persisted durably in PostgreSQL, not in-memory only
- **NFR3**: Data retention — at least 30 days of history by default
- **NFR4**: Privacy — access to a given user's data should be scoped to that user and authorized viewers only (relevant if this grows beyond a single desk)

## Phase 1 Scope

- 1 physical button (Shelly BLU Button Tough 1 ZB), 1 desk, 1 user
- Local MQTT path (button → Gateway → MQTT → Node-RED)
- PostgreSQL schema designed to support multiple users/desks even though only one is active
- Live dashboard + daily CSV export

## Future Direction

- **Shelly Presence Gen4** (mmWave radar, released 2026) as a Phase 2 upgrade path — detects actual stationary presence rather than relying on a manual button press, and supports up to 6 people / 10 zones per sensor, which could cover multiple desks from a single device.

## Tech Stack

- Shelly BLU Button Tough 1 ZB + BLU Gateway Gen3 (input)
- Local MQTT (Mosquitto)
- Node-RED (processing / rule logic)
- PostgreSQL (persistence)
- Node-RED Dashboard 2.0 (live view + export)