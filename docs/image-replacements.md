# Sostituzione immagini — 15 settembre 2026

Le fotografie provenienti da VenetaGreen sono sostituite con 13 immagini illustrative originali create con lo strumento integrato ImageGen (modalità generate). I file del sito originale Green Flux restano invariati.

Le scene generate sono state controllate visivamente. Non sono fotografie di personale, clienti o cantieri Green Flux. Il formato WebP conserva il contenuto delle immagini: sono stati applicati soltanto ridimensionamento proporzionale e codifica per il web. Il soggetto delle pompe di calore usa un punto focale al 72% per i ritagli delle schede. La figura condivisa dei due professionisti conserva il canale alfa trasparente.

## File finali

| Soggetto | File principale | Dimensioni | Varianti |
| --- | --- | --- | --- |
| pompa di calore esterna accanto a un’abitazione | [heat-pump-home](../public/assets/images/heat-pump-home-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| abitazione con pannelli fotovoltaici su un tetto in coppi | [solar-home](../public/assets/images/solar-home-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| pannelli fotovoltaici sulla copertura di un edificio industriale | [solar-commercial](../public/assets/images/solar-commercial-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| soggiorno con climatizzatore a parete | [air-conditioning](../public/assets/images/air-conditioning-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| posa di un impianto radiante durante una ristrutturazione | [renovation-systems](../public/assets/images/renovation-systems-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| locale tecnico con serbatoio e componenti dell’impianto termico | [technical-plant](../public/assets/images/technical-plant-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| dettaglio dei pannelli fotovoltaici su un tetto in coppi | [solar-detail](../public/assets/images/solar-detail-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| tecnico con tablet accanto a una pompa di calore | [technician-heat-pump](../public/assets/images/technician-heat-pump-1086.webp) | 1086 × 1448 | 480 px, 960 px, 1086 px |
| progettista che esamina una tavola tecnica | [engineer-project](../public/assets/images/engineer-project-1086.webp) | 1086 × 1448 | 480 px, 960 px, 1086 px |
| documenti e schemi di progetto su un tavolo di lavoro | [project-plans](../public/assets/images/project-plans-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| consulenza su un progetto con disegni e computer | [energy-consultation](../public/assets/images/energy-consultation-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| tecnico che ispeziona pannelli fotovoltaici | [solar-technician](../public/assets/images/solar-technician-1600.webp) | 1600 × 900 | 480 px, 960 px, 1600 px |
| due professionisti che consultano un tablet | [team-tablet-cutout](../public/assets/images/team-tablet-cutout-1254.webp) | 1254 × 1254 | 480 px, 960 px, 1254 px |

## Copertura della migrazione

Sono stati aggiornati 232 URL di risorse importate nei file HTML e CSS, inclusi srcset, preload e anteprime Open Graph/Twitter. Sono stati eliminati i file delle cartelle pubblicate `assets/venetagreen` e `assets/ui`. La mappa esatta dei vecchi URL verso i nuovi file è in [content/image-replacements.json](../content/image-replacements.json).

Le icone sono ora risorse SVG Lucide, con licenza ISC inclusa. Gli angoli decorativi e la freccia orizzontale sono semplici forme SVG del progetto.

## Prompt finali

### heat-pump-home

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Green Flux installer homepage hero photograph, original illustrative photo.
Primary request: A modern unbranded outdoor air-to-water heat pump beside a pale cream plaster Italian detached home, photographed at a three-quarter angle. The compact light-gray equipment has exactly one large round fan, credible ventilation grille, anti-vibration feet on a low concrete base, and neatly routed insulated rear connections. A quiet small green garden occupies the left half for homepage title overlay.
Composition: Wide landscape 16:9, 2048x1152 or larger at the same ratio. Equipment on the right half but fully within the central 60 percent so its subject survives a centered mobile crop. Eye-level architectural photograph, natural perspective, calm uncluttered negative space at left. A little house context, garden and paving, no people.
Style: Natural editorial photography in Italy, soft daylight, muted teal-gray equipment, pale plaster, warm wood accents and restrained greenery, realistic material texture and subtle imperfect real-world surfaces. High photographic detail, not glossy CGI.
Constraints: Technically plausible equipment and architecture. No readable text, no labels, no logos, no watermarks, no fake branding. Single scene, no collage.
```

### solar-home

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Italian heating and renewables installer service photograph, original illustrative photo.
Primary request: An Italian detached cream-stucco house with an orderly array of modern black photovoltaic modules installed flush to its terracotta pitched roof. Small well-kept garden in front. No people.
Composition: Wide landscape 16:9, 2048x1152. Three-quarter architectural view from a modestly elevated position across the garden, full roof visible with believable roof planes, parallel panel rows and realistic mounting clearances. Give the house and solar installation the central focus, with green garden framing.
Style: Natural editorial architecture photography, soft summer daylight in Italy, realistic texture in terracotta tiles, matte black solar panels, pale plaster, warm wood shutters and muted green foliage. Calm and lived-in, not glossy CGI.
Constraints: Technically plausible solar geometry: straight consistent rectangular panels, coherent cell grids, modules following the roof plane, no modules crossing ridge or eaves. No readable text, labels, logos, watermarks, fake branding. Single image, no collage.
```

### solar-commercial

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Italian renewables installer commercial solar service photograph, original illustrative photo.
Primary request: A modern low-rise Italian industrial building whose broad shallow pitched roof is covered with orderly rows of black photovoltaic panels, set in a modest light-industrial district with a few neighboring warehouses and distant green hills. No people or brands.
Composition: Wide landscape 16:9, 2048x1152. Elevated three-quarter aerial photograph, looking diagonally along the building so the parallel panel rows dominate the foreground and middle, believable building scale, roof edges and service gaps visible; a narrow strip of quiet industrial surroundings toward background.
Style: Natural editorial photography, soft Italian daylight with slight atmospheric haze, muted gray and teal roof tones, matte black panel surfaces, pale concrete and greenery. Real textures and restrained contrast, not glossy CGI.
Constraints: Technically plausible regular panel geometry and roof structure, consistent cell patterns, mounted arrays follow roof planes, no impossible repeated or floating structures. No text, logos, watermarks, labels or fake branding. Single scene, no collage.
```

### air-conditioning

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Italian heating and renewables installer air conditioning service photograph, original illustrative image.
Primary request: A bright, lived-in Italian living room with an unbranded slim white wall-mounted split air conditioner installed high on a pale plaster wall. A comfortable muted teal sofa, linen cushions, warm wood furnishings, a small houseplant, and daylight through a tall window give the room context without clutter.
Composition: Wide landscape 16:9, 2048x1152. Eye-level view diagonally across the room, the clearly visible AC unit occupies the upper central portion with sensible ceiling clearance. The sofa and low wood coffee table occupy foreground, window toward one side. Air conditioner casing and outlet grille are technically credible and proportional.
Style: Natural editorial interior photography, soft diffuse Italian daylight, realistic plaster, linen, wood and gentle shadows; muted teal, warm neutral, gray and green. Calm real home, not luxury CGI.
Constraints: No people, no readable text, labels, logos, watermarks, or fake branding. No duplicate air conditioners, no distorted architecture, no excessively staged showroom look. Single scene, no collage.
```

### renovation-systems

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Italian installer renovation systems service photograph, original illustrative image.
Primary request: Inside a renovated Italian home during orderly installation of heating systems, before the final floor finish. Clearly visible neat red underfloor heating pipe loops on light gray insulation panels fill the foreground and lead toward a recessed heating manifold cabinet on the wall. Pale freshly plastered walls, a large wood-framed window and daylight show the home context. A few tidy installation materials at the room edge, no people.
Composition: Wide landscape 16:9, 2048x1152. Low three-quarter interior photograph that emphasizes the installed systems: evenly spaced serpentine pipe loops with smooth realistic bends, no crossing pipes or floating connections, physically plausible manifold connections; window and plaster walls in the background. Enough room scale to understand this is an orderly home renovation.
Style: Natural editorial construction photography, soft Italian daylight, real plaster texture, warm wood, muted gray and restrained red piping, modest imperfections, not glossy CGI.
Constraints: Interior heating installation only, no exterior insulation work, no demolition mess. No text, logos, watermarks, labels or fake branding. Believable straight room geometry, correct scale. Single scene, no collage.
```

### technical-plant

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Italian heating installer technical systems service photograph, original illustrative image.
Primary request: A clean compact residential plant room in an Italian home with an unbranded white heat pump indoor hydraulic module, a separate tall insulated domestic hot-water cylinder, neatly arranged insulated pipes and a heating distribution manifold. Functional straightforward installation with service clearances, tidy valves and brackets, floor drain and pale tiled floor.
Composition: Wide landscape 16:9, 2048x1152. Three-quarter interior photograph from the doorway, equipment arranged across the central wall: cylinder on one side, indoor module and manifold on the other. Pipes follow rational straight runs with smooth right-angle transitions, believable wall supports and connections; insulated pipe jackets are continuous, not tangled or decorative. No people.
Style: Natural editorial technical photography, soft daylight from a small high window, white and pale gray equipment, dark charcoal pipe insulation, restrained brass fittings, realistic materials, clean but not glossy CGI.
Constraints: Technically plausible residential installation, no impossible connections, no giant industrial equipment. No text, labels, logos, watermarks or fake branding. Single scene, no collage.
```

### solar-detail

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: Italian renewables installer solar detail photograph, original illustrative image.
Primary request: Close three-quarter view of modern black photovoltaic modules aligned on a terracotta-tiled Italian pitched roof. Clearly visible believable thin dark aluminum frames, regular silicon cell grids, and modest mounting gap above the roof tiles. A softly blurred Italian landscape of olive trees and hills in the background.
Composition: Wide landscape 16:9, 2048x1152. Photograph at roof level looking diagonally across the panel surface; one crisp front panel corner and edge in foreground, the array recedes in coherent parallel lines, terracotta tile strip visible on one side and lower edge. Close-up equipment detail with a distinct composition from an aerial or full-house shot.
Style: Natural editorial photography, soft summer daylight, realistic subtle sky reflections on matte dark cells, textured warm terracotta, muted green and gray landscape, restrained contrast, not glossy CGI.
Constraints: Correct repeating rectangular cell geometry, straight consistent panel frames, realistic roof mounting, no floating modules or intersecting roof planes. No people, text, labels, logos, watermarks or fake branding. Single scene, no collage.
```

### technician-heat-pump

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: portrait website editorial photograph for an Italian heating, electrical and renewable-energy installer.
Primary request: an original photograph of an adult male HVAC technician in a muted deep teal work jacket studying a tablet beside a contemporary outdoor heat pump in an authentic Italian residential courtyard.
Composition/framing: portrait 3:4, requested resolution 1536x2048, show his full head, full upper body, natural arms and hands holding the tablet, and the outdoor heat pump clearly visible beside him. Candid professional attention, looking at the tablet, no camera grin.
Style/medium: natural editorial commercial photography, true camera optics, realistic skin pores, fabric, metal and masonry, natural daylight, believable adult proportions.
Constraints: generic fictional technician, not actual Green Flux staff; no logos, brands, readable text, watermarks or CGI; anatomically plausible hands and fingers; no exaggerated cinematic color grading.
```

### engineer-project

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: portrait website editorial photograph for an Italian heating, electrical and renewable-energy installer.
Primary request: an original photograph of an adult female engineer in a muted deep teal work shirt studying technical drawings on a workbench in a bright, authentic Italian workshop.
Composition/framing: portrait 3:4, requested resolution 1536x2048, full head and upper torso and natural hands visible as she studies the plans. Natural candid working posture, realistic not a corporate headshot.
Style/medium: natural editorial commercial photography with believable adult anatomy, natural daylight through workshop windows, realistic skin and paper textures, understated warm neutral workshop backdrop.
Constraints: generic fictional engineer, not actual Green Flux staff; plans contain only illegible schematic marks; no logos, brands, readable text, watermarks, CGI or camera grin; all hands and fingers anatomically plausible.
```

### project-plans

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: landscape website editorial photograph for an Italian heating, electrical and renewable-energy installer.
Primary request: a close-up original photograph of two adult professionals' hands discussing an architectural and building-plant schematic on a wooden desk in an Italian workshop office. A small set of rolled plans and a closed folding ruler lie naturally beside the drawing.
Composition/framing: landscape 16:9, requested resolution 2048x1152. The drawing and naturally posed hands are the focus, muted deep teal work-shirt cuffs visible, relaxed professional gestures. Realistic illegible diagram marks on the documents with no readable text.
Style/medium: natural editorial commercial photography, daylight, realistic paper and wood texture, believable hand proportions and fingers.
Constraints: generic fictional professionals; no logos, readable text, watermarks, CGI, distracting unnecessary props, invented performance claims, extra digits or impossible hand poses.
```

### energy-consultation

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: landscape website editorial photograph for an Italian heating, electrical and renewable-energy installer.
Primary request: an original photograph of two adult technical professionals, a woman and a man, discussing a house energy project at a wooden desk with an unbranded laptop and building drawings in a realistic Italian office/workshop.
Composition/framing: landscape 16:9, requested resolution 2048x1152. Both people shown from head to waist at a slight documentary angle, relaxed attentive dialogue, hands naturally interacting with plans, muted deep teal work shirts, no corporate headshot poses.
Style/medium: natural editorial commercial photography, natural daylight, realistic adult proportions, skin texture and materials, softly contextual workshop background.
Constraints: generic fictional people, not actual Green Flux staff; no logos, readable text, watermarks, CGI, exaggerated smiles, impossible anatomy, or charts claiming results. Laptop viewed from back/oblique side without readable screen; drawings only illegible diagram marks.
```

### solar-technician

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: landscape website editorial photograph for an Italian heating, electrical and renewable-energy installer.
Primary request: an original photograph of an adult renewable-energy technician in muted deep teal workwear inspecting the frame of a black photovoltaic panel on a safe low flat roof or broad terrace in Italy.
Composition/framing: landscape 16:9, requested resolution 2048x1152. Panels in foreground, technician crouching on a wide clear level service path beside the panel, clear sturdy parapet surrounding the safe rooftop, believable safe footing, small plausible unbranded inspection tool, sunny Italian residential context.
Style/medium: natural editorial commercial photography, daylight, realistic panel cells and aluminum frames, natural skin and fabric detail, believable adult anatomy.
Constraints: generic fictional technician, not actual Green Flux staff; no logos, readable text, watermarks or CGI; no unsafe ladder, dangling gear, standing on panels, exposed high-voltage wiring, impossible fingers or steep unprotected roof.
```

### team-tablet-cutout

Modalità: **strumento integrato ImageGen / generate**.

```text
Use case: photorealistic-natural
Asset type: TRANSPARENT PNG people cutout for the right side of a teal website contact call-to-action.
Primary request: two adult technical professionals, a woman and a man, wearing plain muted dark teal polos, standing closely side-by-side, both looking attentively at one tablet held naturally by one of them. Friendly focused expressions and realistic professional everyday appearance. Original fictional people, not actual staff or copied from references.
Composition/framing: square 1:1 requested resolution 2048x2048, framed from upper thighs to full heads, leave clear margin around hair and shoulders, full outer arms uncut. Natural human proportions, clean detailed realistic hands and fingers, tablet physically supported with a plausible grip.
Style/medium: photorealistic natural editorial commercial photography of people, soft daylight lighting, realistic skin pores, hair and fabric texture, no CGI.
CRITICAL BACKGROUND: genuinely transparent background with a real alpha channel. This is an isolated cutout, NOT a rectangle photograph. Everything outside the two people and tablet must be fully transparent, including spaces between arms. Clean hair and hand edges with natural antialiasing; no backdrop, no environment, no ground shadow, no cast background, no white rectangle, no teal rectangle, and absolutely no painted checkerboard pattern. Preserve the transparent alpha in PNG.
Constraints: no logos, brands, readable text, watermark, text overlay, clipped hair or outer arms, extra fingers, distorted faces, fused limbs or exaggerated smiles.
```

