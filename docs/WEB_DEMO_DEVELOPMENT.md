# Preliminary Web Demo: Development Timeline

## Scope

This timeline covers only the browser-based prototype. It is reconstructed from
the repository's implementation commits between 22 July and 10 August 2026. The
separate Unity project needs its own timeline based on Unity scenes, C# scripts,
builds, captures, and version history.

## Iterations

| Phase | Development | Design learning |
| --- | --- | --- |
| 1. Systems prototype | Abstract agents, timed change, metrics, and a finite Feed button | Feeding could operate as a system intervention rather than a decorative action |
| 2. Spatial feeding | Clicked food positions, thrown food, and nearest-agent response | Location and proximity made the player's intervention more legible |
| 3. Typographic flock | The word "pigeon" became the agent, with varied case and colour | Cheap visual variation supported rapid testing before illustration |
| 4. Park and plaza | A green park, marble public square, monument, fountain, and skyline replaced the dashboard | Public space became part of the ecological argument |
| 5. Animated pigeons | Illustrated sprites and consolidated motion atlases replaced words | Recognisable animals improved attachment; atlases reduced motion flicker |
| 6. Onboarding and collection tests | Tutorial, language selection, persistence, favourite animal, and temporary accessory systems | Attachment supported the research question; collection rewards distracted from it and were removed |
| 7. Multispecies redesign | Pigeons, squirrels, swans, cats, dogs, foxes, and hedgehogs entered one shared system | The focus shifted from accumulation to multispecies coexistence |
| 8. Performance and sprite correction | Atlas alignment, crop correction, fixed agent dimensions, and lighter animation work | Asset preprocessing improved stability with 21-30 animated agents |
| 9. Four-condition decisions | Quantity, satiety, comfort, and coexistence; two-choice events; locks and extreme outcomes | Uncertainty became a reflective mechanic rather than missing feedback |
| 10. Research grounding | Reliance, gathering pressure, delayed consequences, responsive layouts, and model disclaimers | The prototype's claims and limits became more explicit |

## Retained and removed mechanics

| Retained in the current web demo | Removed or replaced |
| --- | --- |
| Spatial food placement and projectile motion | Fixed Feed button and five-use inventory |
| Nearest-first probabilistic acceptance | Guaranteed recipient selection |
| Seven species sharing one carrying capacity | Wild/city pigeon separation |
| Four shared conditions and delayed effects | Pigeon-colour diversity as the main failure rule |
| Favourite-animal relationship | Clothing, accessories, and collection rewards |
| Magnitude-only decision preview with exact results afterward | Fully revealed choice direction |
| Local and optional account persistence | Mandatory account participation |

Removed mechanics remain useful evidence of iteration. They should be described
as experiments that changed the design, not as features of the current build.

## Evidence boundary

The public deployment, this source tree, automated checks, and commit history
can verify the web prototype. They cannot verify Unity interaction, C#
authorship, a Unity build, sensor integration, or Unity user testing.
