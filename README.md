# Urban Wildlife Simulation: Preliminary Web Demo

This repository contains the **preliminary browser-based demo** of the Urban
Wildlife Simulation research project.

It is not the Unity version of the project. The Unity prototype is a separate
implementation with its own source files, development history, build process,
and research evidence. Features documented here should not be attributed to the
Unity version unless they are independently verified in that project.

## Prototype status

- Platform: web browser
- Role: early playable demo and interaction testbed
- Framework: React, Next.js, TypeScript, Vinext, and Vite
- Hosting: Codex Sites
- Public demo: https://urban-pigeon-simulation.lkt1009.chatgpt.site/
- Current model: speculative and time-compressed; not an ecological forecast

## Current web-demo features

- Seven urban animal species, beginning with three individuals of each species
- A shared population capacity of 30
- Spatial food throwing and nearest-first probabilistic acceptance
- Four connected conditions: quantity, satiety, comfort, and coexistence
- Species events and two-choice decisions with uncertain outcome direction
- Delayed food-reliance, gathering-pressure, growth, crowding, and loss effects
- A host-favourite animal, bilingual tutorial, field journal, and responsive UI
- Local persistence, optional ChatGPT account saves, and anonymous online presence

## Web demo and Unity version

| Area | This repository | Unity version |
| --- | --- | --- |
| Platform | Browser | Unity runtime |
| Source | React/TypeScript/CSS | Separate Unity project and C# source |
| Purpose | Preliminary demo and rapid design iteration | Separate implementation to be audited independently |
| Evidence | This repository's commits, tests, screenshots, and deployment | Unity project files, scenes, scripts, builds, and captures |
| Status in this repository | Included | Not included |

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Build and test:

```bash
npm test
```

## Research documentation

The current literature-to-mechanism mapping and claim boundaries are recorded
in [`docs/research-design-rationale.md`](docs/research-design-rationale.md).

When citing this repository, describe it as the **preliminary web demo**. Do not
use its commit history or screenshots as evidence of work completed in Unity.
