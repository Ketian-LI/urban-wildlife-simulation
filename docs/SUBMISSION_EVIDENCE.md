# Creative Computing Final Project: Submission and Evidence Plan

## Source of requirements

This plan follows the 2025-26 Creative Computing Final Project assessment brief
for unit IU000293. The brief, rather than earlier course briefs or past student
examples, is the authoritative source for submission requirements.

## Formal submission

- **Deadline:** 2:00pm (14:00) GMT, Monday 23 November 2026
- **Adjusted assessment deadline:** 2:00pm (14:00) GMT, Monday 30 November 2026
- **Moodle file 1:** `.txt` containing a link to the GitHub repository
- **Moodle file 2:** `.zip` containing the full repository
- **Maximum submission size:** 1GB
- **Written submission:** project report and associated thesis, 3,500 words
  (+/-10%), submitted as a PDF
- **Assessment:** 100% holistic; all components must be present to pass

The exact contents of the project report and thesis should also be confirmed
with the tutor, as stated in the brief.

Where possible, code developed to a sufficient level is also expected to be
shared with the Institute's code repository and documented for future students
and alumni. Any exemption should be agreed with tutors.

## Required project evidence

| Required component | Purpose | Correct project source | Current status |
| --- | --- | --- | --- |
| Developed project outcome | Demonstrate advanced creative and technical practice | Final Unity project and working build | Unity project not yet supplied for audit |
| Portfolio of work | Communicate the finished experience and its technical/creative contribution | Unity stills, interaction documentation, demo capture, diagrams, and selected web-process evidence | Web screenshot available; final portfolio missing |
| Research weblog and/or sketchbook | Document iterative development in the areas defined by the proposal | Dated Unity logs plus this web demo's commit history and timeline | Web timeline available; Unity log missing |
| Project report | Explain aims, process, realisation, evaluation, and contribution | Final-project repository and/or thesis PDF, following tutor guidance | Not yet assembled |
| Associated thesis | Critically frame and evaluate the project | 3,500-word PDF (+/-10%) | Planning material exists outside this repository; final PDF missing |
| User testing through a specified method | Evidence LO4 and justify revision | Method, participant information, observations/data, analysis, and resulting changes | Not supplied |
| GitHub repository | Share reproducible code and documentation | Unity-centred final repository linking to this preliminary web repository | Web repository available; final repository missing |
| Full repository archive | Preserve the submitted source at the deadline | Moodle `.zip`, under 1GB | Not prepared |
| Harvard references | Credit academic, technical, visual, and software sources | Thesis bibliography and repository provenance records | Research rationale is a starting point only |

## Learning-outcome evidence

| Learning outcome | Evidence the final submission should foreground |
| --- | --- |
| LO1 - advanced sustained creative and technical practice | Working Unity system, authored C# components, stable interaction, technical diagrams, build documentation, and evidence of sustained iteration |
| LO2 - planning and realisation of a complex self-directed project | Proposal-to-outcome timeline, milestones, scope decisions, web-to-Unity transition, final build, and honest account of incomplete features |
| LO3 - critical ethical analysis in social, cultural, and environmental context | Discussion of feeding as care/control, anthropogenic food, multispecies responsibility, model limitations, data/privacy/consent, and AI-assisted authorship |
| LO4 - evaluation through a specified research method | Defined research method, recruitment and consent, participant records, analysis, design changes, limitations, and reflection on whether players noticed or questioned hidden consequences |

## Recommended repository model

Keep two repositories with explicit roles:

1. **This repository: preliminary web demo**
   - browser source and deployment;
   - rapid visual and interaction experiments;
   - dated web-development history;
   - research-mechanism rationale;
   - evidence of discarded and retained ideas.

2. **New repository: final Unity project**
   - the assessment-facing README and portfolio index;
   - Unity `Assets`, `Packages`, and `ProjectSettings`;
   - authored C# scripts and scene documentation;
   - executable build or a GitHub Release link;
   - dated research journal;
   - user-testing method, findings, and revisions;
   - thesis PDF and bibliography;
   - a link back to this web prototype as an earlier iteration.

Do not copy the Unity project into the root of this Codex Sites repository. It
would blur the evidence chain, make the web deployment harder to maintain, and
produce a misleading commit history.

## Recommended final Unity repository structure

```text
urban-wildlife-unity/
|-- README.md
|-- Assets/
|   |-- Scenes/
|   |-- Scripts/
|   |-- Prefabs/
|   |-- Art/
|   `-- Audio/
|-- Packages/
|-- ProjectSettings/
|-- Documentation/
|   |-- Portfolio/
|   |-- Research-Journal/
|   |-- User-Testing/
|   |-- Technical/
|   |-- Ethics-and-Limitations.md
|   |-- AI-and-Asset-Provenance.md
|   `-- Thesis/
|       `-- Urban-Wildlife-Thesis.pdf
|-- Builds-or-Releases.md
|-- LICENSE
`-- .gitignore
```

Unity-generated folders such as `Library`, `Temp`, `Logs`, and `Obj` should not
be committed. Large builds should normally be distributed through a GitHub
Release, while the Moodle `.zip` should preserve the complete submitted source
repository within the 1GB limit.

## Final repository README order

1. Title, final image, one-sentence proposition, and project status
2. Video or animated demonstration and build/release link
3. Research question and creative aims
4. How the interaction works
5. Technical system and the student's authored contribution
6. Final outcome gallery with analytical captions
7. Iterative process, including the transition from this web demo to Unity
8. User-testing method, findings, and revisions
9. Ethical, ecological, and modelling limitations
10. Research journal, thesis PDF, references, AI disclosure, and asset credits
11. Installation, controls, dependencies, and build instructions

This order is a presentation recommendation, not an additional requirement in
the brief. It makes the required portfolio, process, evaluation, and technical
evidence easy for assessors to locate.

## Moodle hand-in checks

- GitHub link opens without requesting access, unless an exemption is agreed
- Repository default branch is the exact assessed version
- A release or tag identifies the submission state
- `.zip` was created from that same version and opens correctly
- Thesis PDF is 3,150-3,850 words unless the tutor confirms a different rule
- README links work from a logged-out browser
- No personal participant data, API keys, database secrets, or account emails
  are included
- All external and AI-generated assets have provenance records
- Unity project opens without committing machine-specific cache folders
- Institute code-sharing expectations have been met or an exemption is recorded
