# SYMBIOSIS: 49 — Unity implementation status

Last verified: 2026-09-22  
Unity: 6000.3.4f1  
Playable project: `urban-wildlife-rooms-unity`

This file records what is actually implemented. It deliberately distinguishes a working system from an approved visual reference or a future hardware adapter.

## Current baseline

- The board is a square 7 × 7 grid containing 49 occupied cells.
- The authored starting arrangement contains 35 physical/logical room modules. A 1 × 2 or 2 × 2 room is one module occupying two or four grid cells; it is not counted as multiple recognition blocks.
- The central park, pigeon habitats and fox den are fixed. Other permitted rooms use the confirmed free rearrangement flow and one-room holding tray.
- Room movement costs 2 resource points for a one-cell module and 3 for a multi-cell module. Returning the onboarding practice room to its original placement costs zero.
- The no-camera build offers Sandbox and Research. The camera build offers Sandbox only.

## Implemented game loop

- Six-minute day cycle with dawn, day, dusk and night; Sandbox supports pause, 1×, 2× and 4×. Research is locked to 1×.
- Resource economy starts at 8 and is capped at 20. Work, food-service operating cost, feeding, emergency collection, room movement and replanting are connected to the live balance.
- A negative end-of-day balance ends the run. Five animal-death events end the default Sandbox run. Results restart at day one or return to the main menu; there is no proactive Sandbox victory.
- Residents work, eat, commute, arrive, relocate and leave according to the confirmed route/capacity rules. Resident count rises gradually up to the current cap.
- Waste accumulates, blocks human function, receives scheduled municipal collection, exposes an advance garbage-truck notice and supports paid emergency collection.
- Mature oak, felled plot, planted sapling and young/mature regrowth stages are implemented. Moving an oak room fells its tree; new planting costs 6.
- Player food costs 1, lasts 30 seconds and supports up to five player-created sources with five portions each.

## Implemented animal simulation

- Starting population: 12 pigeons, 4 squirrels, 2 hedgehogs and 2 foxes.
- Every living animal requires one meal per day and dies after three complete missed days. Death feedback, death accounting and 20-second respawn are connected.
- Pigeons respond to placed food in staggered groups of up to five, walk locally, fly across longer room routes and take flight to escape a fox.
- Squirrels respond one-room-speed slower than pigeons, travel through matching room connections, collect player food and mature-oak nuts, and return food to fixed world-space caches capped at three portions.
- Felling a squirrel's oak exposes its cached food and triggers a five-second panic response before relocation to surviving cover.
- Hedgehogs are dusk/night active, seek generated insects through room connections and apply the shared garage crossing logic. Curling becomes their fox-safe state.
- Hungry foxes hunt only at dusk/night. They prefer a grounded pigeon, then a squirrel, then a hedgehog; the result is a visible route-based chase rather than an immediate random death. Successful predation counts as the fox's meal.
- Ground animals encountering a garage first have a 50% detour/avoid decision. If they cross, they wait for the vehicle event and then receive the confirmed 50% fatal/safe judgement, giving an overall approximate 25% route-death probability when a detour exists.
- Natural seeds, nuts, insects and discarded food are generated on the confirmed daily schedule. The four live ecological indicators are calculated from actual simulation state.

## Implemented UI and flow

- Main menu uses the approved `SYMBIOSIS: 49` hierarchy without a gameplay title bar.
- Gameplay uses a day/night clock, icon-led status, population portraits, resource counter and four live ecological rings. The removed spatial-disturbance and green-connectivity values are not shown.
- Esc opens Continue, Settings, Replay Tutorial and Return to Desktop. Settings include Chinese/English, master volume, mute and camera recalibration where applicable.
- First-run onboarding holds day one at dawn and connects four real interactions: resident route, waste room, holding-tray practice and paid feeding. It can be skipped or replayed.
- End-of-run results use live run data, final-layout context, restart and main-menu actions.

## Implemented Research mode

- In-place setup card with sequential anonymous participant code, duration and maximum-death controls. Defaults are 18 minutes and five deaths.
- Active research time excludes Esc pause, layout editing, camera recognition and onboarding; operation time records the full session separately.
- The research duration ring surrounds the normal day/night dial and changes to amber for the final two minutes.
- A session ends on time expiry, configured death limit or negative resource settlement. The record carries exact reason, elapsed/unused time, layouts, indicators and death totals without an overall score.
- Export creates a participant-code/timestamp folder containing `events.csv`, `research-record.json` and a result-screen PNG capture request.

## Camera build: implemented boundary

- Live `WebCamTexture` acquisition, preview surface, 7 × 7 calibration grid, 35-module readiness count, affected-cell overlays and the Scanning / InvalidPlacement / Stabilising / Confirmed state transaction are implemented.
- Complete legal observations must remain unchanged for 1.5 seconds before the layout is applied atomically and the same run resumes.
- `PhysicalBoardCameraController.SubmitObservation(...)` is the tested adapter boundary. It accepts all 35 module IDs with grid column, row and quarter-turn rotation, validates the complete 49-cell arrangement and never treats image stability alone as successful recognition.
- **Not yet production-complete:** raw camera pixels are not currently decoded into module IDs. The physical marker system and detector (recommended: printed fiducial/ArUco-style IDs with OpenCV) must be selected, calibrated against the final 40 × 40 cm board and connected to `SubmitObservation`. Until that adapter exists, the camera build can show the camera/calibration flow but cannot honestly identify the physical modules by itself.

## Remaining production work

1. Implement and hardware-test the fiducial detector after final marker size, camera model, mounting height, lighting and board print are fixed.
2. Replace procedural prototype people/animals/room props with the final edited low-poly FBX files while keeping the established scale, colliders, rigs and animation-state hooks.
3. Complete production sound assets and final art polish; current UI sound cues are restrained procedural placeholders.
4. Run Play Mode and physical-device QA for long sessions, camera disconnect/reconnect, all two-sided module rotations and research export screenshot timing.
5. Package signed exhibition builds and prepare the final 40 × 40 cm recognition board/marker print files.

## Verification

- Edit Mode automated suite: **196 passed, 0 failed**.
- Windows no-camera build completed successfully: `Builds/Windows-NoCamera/SYMBIOSIS49-NoCamera.exe`.
- Windows camera build completed successfully: `Builds/Windows-Camera/SYMBIOSIS49-Camera.exe`.
- The camera-only compiler symbol is removed again after packaging, so the Unity working project returns to the no-camera development baseline.
- Main menu/layout preview renders successfully at 1920 × 1080.
- Research setup preview renders successfully at 1920 × 1080.
- Latest post-build XML report: `urban-wildlife-rooms-unity/TestResults/delivery-final.xml`.
