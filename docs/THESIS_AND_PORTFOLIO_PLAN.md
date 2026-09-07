# Thesis and Portfolio Plan

## What the Miracle example usefully demonstrates

The *Miracle* dissertation is a 16-page past example, not a template or current
brief. It documents six testers and includes nine listed figures. Its strongest
transferable qualities are:

- a short abstract that states the artefact, method, evaluation focus, and
  result;
- a clear progression from context, to method, to iterative design, to testing,
  discussion, and conclusion;
- project figures placed beside the design claims they support;
- a named participant count and a combination of interviews and questionnaire
  data;
- concrete revisions linked to observed problems, such as movement speed,
  collision size, guidance, interaction difficulty, and motion sickness;
- a list of illustrations and a full bibliography.

The final Urban Wildlife Simulation thesis should retain that evidence-led
rhythm while improving the explicitness of the research question, contribution,
ethical analysis, technical account, and limitations.

## What not to copy from the example

- Do not let extended scene description replace analysis of design decisions.
- State the research question and original contribution explicitly near the
  beginning.
- Do not rely on percentages such as 83.3% without also writing `5 of 6` and
  discussing what a small sample can and cannot support.
- Give the technical system, authored code, and implementation decisions their
  own evidence rather than treating the artefact as a visual black box.
- Include a dedicated ethical and environmental analysis aligned with LO3.
- Separate observed behaviour, participant statements, and researcher
  interpretation so that conclusions remain proportionate to the method.

## Recommended 3,500-word thesis structure

| Section | Target words | Main job |
| --- | ---: | --- |
| Abstract | 150 | State the research question, Unity artefact, method, principal finding, and contribution |
| 1. Introduction | 350 | Define the problem of invisible human influence on urban wildlife and identify the project's scope |
| 2. Context and Related Work | 650 | Build the argument from urban ecology, feeding and dependency, multispecies care, reflective design, simulation, and productive ambiguity |
| 3. Methodology | 400 | Explain Research through Design, prototype comparison, user-testing method, recruitment, consent, data treatment, and analytical approach |
| 4. Design and Technical Development | 900 | Present the web prototype as an early probe, the move to Unity, interaction design, system architecture, authored code, major iterations, and discarded mechanics |
| 5. User Testing and Findings | 600 | Report participant behaviour and interpretations, not only satisfaction scores; connect findings to revisions |
| 6. Discussion, Ethics, and Limitations | 300 | Answer the research question cautiously; address care/control, ecological abstraction, representational limits, AI authorship, and generalisability |
| 7. Conclusion and Future Work | 150 | Summarise the contribution and name tightly scoped next steps |
| **Total** | **3,500** | Within the brief's required length |

The bibliography, captions, appendices, and front matter should be checked with
the tutor to confirm whether they count toward the word limit.

## Central argument

The thesis should not claim that the simulation predicts real urban wildlife.
A defensible argument is:

> By making feeding spatial, uncertain, multispecies, and temporally delayed,
> the interactive simulation turns an apparently simple act of care into a
> perceptible network of changing dependencies and shared living conditions.

User testing should examine whether participants notice, reinterpret, or
question those relationships. It should not define agreement with a moral
message as successful play.

## Recommended figure sequence

| Figure | Evidence | Why it is needed |
| --- | --- | --- |
| 1. Research-system map | Diagram linking human action, animal response, shared conditions, and delayed consequences | Makes the conceptual contribution legible |
| 2. Early web prototype | Runtime capture from an identified web commit | Establishes the starting hypothesis |
| 3. Web design iterations | Small comparison of feed button, typographic flock, and multispecies plaza | Demonstrates sustained iterative practice |
| 4. Final Unity overview | Unity build capture, clearly labelled | Establishes the assessed artefact |
| 5. Interaction setup | Photograph or diagram of player, controller/sensor, display, and data flow | Explains embodied interaction and technical scope |
| 6. Unity architecture | Diagram of authored C# systems and their relationships | Evidences advanced computational practice |
| 7. Feeding sequence | Four consistent frames from one Unity interaction | Shows input, response, uncertainty, and feedback |
| 8. Decision and condition feedback | Before/after capture from the same event | Supports the productive-ambiguity argument |
| 9. User-testing setup | Consented, anonymised testing documentation | Establishes method and context |
| 10. Findings and revisions | Compact table/chart plus a before/after interface pair | Connects evidence to design change |

Each caption should identify the version, explain what is shown, and state why
it matters. A decorative image should not occupy the place of implementation or
testing evidence.

## User-testing section

The example dissertation usefully links tester feedback to revisions, but the
new project should make its method more rigorous and transparent:

- define who is being recruited and why;
- record prior game/installation experience that may affect behaviour;
- use the same core task and observation sheet for each participant;
- collect behavioural observations before asking interpretive questions;
- ask when feeding stopped feeling uncomplicated, what cues were noticed, and
  how participants understood delayed consequences;
- report counts alongside anonymised qualitative themes;
- avoid presenting percentages without the participant number;
- distinguish observation, participant interpretation, and researcher
  inference;
- document which finding caused each revision and what remained unresolved.

## Portfolio evidence

The portfolio should be concise and visual, but every item should support one of
the learning outcomes. A strong minimum set is:

- one final Unity overview image;
- one real interaction/setup image;
- one short final-build demonstration;
- one system architecture diagram;
- one web-to-Unity iteration comparison;
- one user-testing and revision comparison;
- links to dated research-journal entries;
- the playable build or release;
- the thesis PDF;
- source, asset, AI, and participant-consent documentation.

The web demo belongs in the process narrative. The first image, build link, and
technical headline in the final repository should all refer to Unity so that an
assessor cannot mistake the preliminary browser prototype for the submitted
outcome.
