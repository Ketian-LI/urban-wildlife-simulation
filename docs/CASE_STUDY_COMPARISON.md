# Comparative Review of Creative Computing Case Studies

## Purpose and boundary

This review uses four past Creative Computing projects as presentation and
research examples. They are not current instructions, marking rubrics, or
content templates. The 2025-26 IU000293 assessment brief remains authoritative.

The cases were reviewed for five questions:

1. How is the research question introduced?
2. How is technical originality evidenced?
3. How is iterative development documented?
4. How are evaluation and limitations handled?
5. How are the thesis, code, journal, and media connected at submission?

## Case comparison

| Case | Strongest evidence pattern | Useful lesson for Urban Wildlife Simulation | Limitation to avoid |
| --- | --- | --- | --- |
| *Miracle* | Six-person playtesting is connected to concrete changes in movement speed, collision size, guidance, and interaction difficulty; nine figures sit near the relevant argument | Show exactly how observed player behaviour changes a rule, interface, or interaction | Extended scene description sometimes occupies space that could be used for technical or analytical evidence; percentages from a small sample need counts and caution |
| *Wie?* / Micromoth for Arduino | A practice-based artwork is paired with an original C++ library, 24 figures, memory measurements, comparison with IBM Quantum Composer, ethics pre-screening, and open-source contribution | Treat the code and the experience as two connected research outcomes; validate technical claims with measurements and comparison | Technical validation and critical reflection do not replace the external user testing required by the current LO4 |
| *Diffusertrack* | Explicit research question, high-level architecture, 34 figures, parameter experiments, a separate 14-week development journal, recorded output, technical and artistic contribution sections, and an LLM statement | Keep dated logs honest, include failed approaches, define evaluation terms, and separate technical from artistic contribution | Autoethnographic self-evaluation is valuable but not sufficient on its own for the current user-testing outcome |
| *Beyond Prompts* | Four named research outputs, clear pipeline and TouchDesigner diagrams, controlled experiments, 16 figures, performance limitations, and separate links for code, log, and presentation | State the contribution as a small number of verifiable outputs and use repeatable experiments to justify design constraints | The case defers a full user study; the current project cannot do this because user testing is an explicit learning outcome |

## Shared patterns worth adopting

### 1. State the contribution early

The strongest cases identify the artefact and contribution before describing
the whole process. For this project, the opening should name:

- the Unity interaction as the final artefact;
- spatial feeding as the primary player action;
- probabilistic animal agency and delayed system effects as the key mechanism;
- perceptibility of human influence as the research focus; and
- the web demo as an earlier design probe, not the submitted outcome.

### 2. Pair creative claims with technical evidence

A screenshot alone cannot show advanced computational practice. The final
portfolio should pair experience images with:

- a Unity/C# architecture diagram;
- a data-flow diagram from input to food placement, agent response, shared
  conditions, events, and logging;
- named scripts or systems authored by the student;
- measured frame rate and agent-count performance on the submission machine;
- repeatable tests of distance ordering, acceptance probabilities, value
  bounds, end states, and save/restart behaviour; and
- a clear list of third-party packages, generated assets, and original work.

### 3. Keep a separate dated development journal

The Diffusertrack journal is useful because it preserves uncertainty, failed
approaches, tutor input, technical breakthroughs, and compromises. The Unity
journal should use one entry per week or milestone with this compact structure:

```text
Date and objective
What was built or tested
Evidence: image, video, commit, measurement, or participant note
What failed or changed
Decision and reason
Next experiment
```

The existing 59-commit web timeline can support the early phase. It cannot stand
in for a Unity development journal.

### 4. Evaluate the research proposition, not only usability

The current research question asks whether invisible human influence becomes
perceptible. Testing therefore needs two layers:

- **Interaction layer:** could participants understand how to feed, read animal
  responses, follow state changes, and recognise why a run ended?
- **Interpretive layer:** did participants notice delayed effects, competing
  needs, dependence, crowding, or tension between care and control?

Recommended method: an observed play session followed by a semi-structured
interview, supported by game-event logs and a short questionnaire. Six to eight
participants is a practical target, not a number required by the brief. Report
raw counts alongside themes and avoid generalising beyond this small study.

### 5. Make limitations specific

Strong limitations name a measurable boundary rather than apologising in
general. This project should address:

- speculative rather than predictive ecological values;
- compressed timescales and simplified species behaviour;
- small and non-representative participant sample;
- the difference between noticing a consequence and accepting a moral claim;
- performance limits with multiple animated Unity agents;
- accessibility of the chosen interaction method;
- participant privacy and consent;
- AI-assisted code and asset production; and
- what was implemented in the web demo versus Unity.

## Recommended evidence chain for each major design claim

Use the same five-part pattern throughout the thesis and portfolio:

1. **Question:** What design or research problem was being addressed?
2. **Prototype:** What was implemented in the web demo or Unity?
3. **Evidence:** What commit, capture, test, measurement, or participant record
   documents it?
4. **Finding:** What was learned, including unexpected or negative results?
5. **Revision:** What changed, or why was the mechanism retained despite a
   limitation?

Example:

> Players initially treated feeding as an unlimited positive action. A delayed
> reliance system and magnitude-only event previews were added. During testing,
> participants noticed population change but overlooked gathering pressure. The
> interface was revised to expose a spatial warning without revealing the final
> outcome direction.

This pattern turns development history into research evidence instead of a list
of features.

## Implications for the GitHub submission

The final Unity repository should work as a portfolio index, not as a duplicate
of the thesis. Its first screen should establish the final artefact, while the
linked documents carry detail.

| README section | Primary evidence |
| --- | --- |
| Final outcome | Unity still, build/release, short demonstration |
| Research proposition | One question and a concise contribution statement |
| Interaction | Player/setup image and a four-frame feeding sequence |
| Technical system | Architecture diagram, authored scripts, dependencies, build instructions, and measured performance |
| Iterative process | Selected web-to-Unity milestones linked to dated journal entries |
| Evaluation | Method, participant count, main themes, evidence-to-revision table, and limitations |
| Ethics and provenance | Consent/privacy, ecological claim boundary, AI statement, asset credits, and licences |
| Academic submission | Final thesis PDF, bibliography, archived source tag, and Moodle hand-in record |

## Packaging lessons from the ZIP submissions

The Diffusertrack package separates the thesis, a seven-page technical journal,
and a one-page submission index linking to code, video, and audio. The Beyond
Prompts package separates the thesis from a short document linking to code, the
project log, and presentation. This is a useful pattern: assessors should not
have to search a thesis for operational links.

For the current brief, create a plain `submission-links.txt` for Moodle with the
final GitHub URL and place a matching `SUBMISSION-INDEX.md` at the repository
root. The index should name the thesis PDF, build/release, research journal,
user-testing folder, and preliminary web-demo URL. Check that every link works
outside the student's signed-in account before creating the final ZIP.

## Priority for this project

The clearest route to a strong submission is:

1. locate and audit the actual Unity project;
2. define which Unity mechanics are genuinely complete;
3. create the Unity repository and a submission tag;
4. produce architecture and interaction evidence from that build;
5. run and document the specified user-testing method;
6. revise the build from findings;
7. write the 3,500-word thesis around the resulting evidence; and
8. package the GitHub link and matching repository archive for Moodle.

Visual polish still matters, but the comparison cases show that a smaller,
well-evidenced system is stronger than a broad feature list whose implementation,
testing, or authorship cannot be demonstrated.
