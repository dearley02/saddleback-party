# Silicone Sleeve Casting Mold

This is a parametric three-part casting mold (two shell halves plus a core) for a hollow sleeve cast in platinum-cure silicone. The printed parts are mold tooling only. They never touch skin.

```
params.py   all dimensions (fit inputs in inches, everything else in mm)
mold.py     CadQuery generator: builds, checks, exports, prints a summary
out/        mold_half_A.stl, mold_half_B.stl, core.stl
```

```bash
pip install cadquery
python mold.py                     # default build -> out/
python mold.py --split-core        # also writes core_upper.stl + core_lower.stl
python mold.py --texture rings     # 0.5 mm interior rings
```

## Default dimensions (from `python mold.py`)

| Item | Value |
|---|---|
| Girth / fit ratio | 7.00 in / 0.93 |
| Interior circumference | 6.51 in |
| Interior diameter (nominal, held at mid-depth) | 2.072 in / 52.63 mm |
| Interior with 1° draft | 50.6 mm at the dome to 54.8 mm at the flare start |
| Opening diameter at rim (6 mm radial flare) | 67.5 mm |
| Outer diameter (nominal) / at base rim | 66.6 mm / 87.5 mm |
| Wall | 7.0 mm nominal, 7.00 mm minimum measured |
| Base rim | 7 mm flat face, 3 mm rounds on both edges |
| Hollow depth / solid tip / total length | 165.1 / 38.1 / 203.2 mm (6.5 / 1.5 / 8.0 in) |
| Anti-suction vent | 3 mm diameter, dome to outer tip, 2 mm rounds at both ends |
| Smallest interior radius | 2.0 mm (vent entry); dome, flare and lip radii are all larger |
| **Silicone volume** | **348 mL cast; mix about 400 mL** (15 % extra for sprue, cup and losses) |
| Shell height / assembled height with core stem | 218.2 mm / 238.2 mm |
| Shell halves (each) | 127.1 × 52.5 × 218.2 mm |
| Core | 69.8 × 70.1 × 234.4 mm |

**Safety geometry.** The script refuses to build if any of these fail:

* `interior_fit_ratio` must be between 0.88 and 1.00. Anything else raises `ValueError`. Wall thickness must be 5–10 mm.
* Toward the opening, the interior radius never decreases. The opening is the widest point. There is no closed ring, strap loop or constriction band.
* Every interior radius is at least 2 mm.
* A 3 mm vent is always cast from the inner tip to the outside, so no suction can form.

## Mold layout

* **Pour direction:** the mold is poured tip-down, so the open, flared base of the sleeve is at the top.
* **Shell:** split on the long axis. Minimum wall is 4 mm, with a flat base so it stands upright.
  * 12 mm bolt flanges hold six M4 holes: use M4 × 20 bolts with washers and nuts.
  * 4 registration cones (45°) are pins on half A and sockets on half B, with 0.2 mm clearance.
* **Core:** forms the sleeve interior, with 1° draft toward the base.
  * A 3 mm pin on the tip forms the vent and seats 3 mm deep in the shell floor.
  * At the top, a boss sits in a bore split across both halves (0.3 mm clearance), which keeps the wall even.
  * A rest bar hangs the core on the shell top, and the stem rises 20 mm above the mold with an 8 mm pull-rod hole.
* **Sprue:** 8 mm diameter with a 16 mm pour cup, on the parting line (+X).
* **Riser vents:** two, 3 mm diameter, at 120° and 240°. They sit on the rim, which is the highest point of the cavity.

## Printer fit

The mold is checked against `build_volume_mm` (default 256³). All parts fit, printed in the orientations below.

| Printer class | Halves (218 mm tall) | Core (234 mm tall) |
|---|---|---|
| 256 × 256 × 256 (Bambu X1/P1) | fits | fits |
| 220 × 220 × 250 (Ender-3 class) | fits | fits |
| 250 × 210 × 220 (Prusa MK4) | fits | **too tall: use `--split-core`** |
| ~218 × 122 × 220 resin | fits | **too tall: use `--split-core`** |

`--split-core` cuts the core at mid-depth: 113 mm upper and 126 mm lower pieces, joined by a 45° cone dowel with 0.2 mm clearance.

* Glue the joint with CA or epoxy.
* Fill and sand the seam flush. Otherwise it will show as a ring inside the sleeve.

## Print settings

* **Material:** PETG, or a standard/ABS-like resin.
* **Layers:** 0.12–0.16 mm.
* **Solid cavity surfaces:** set 5+ walls/perimeters and 5+ top/bottom layers so every cavity surface is solid plastic. Sanding must not break into infill. Infill 15–25 % is fine.
* **Shell halves:** print upright, standing on the flat base (tip end) with a brim.
  * The cavity then has circular layer lines.
  * Keys and bolt holes print sideways (45° cones need no support).
  * The ~6–8 mm ceiling over the rim overhangs. Paint on support for that zone only, or accept some droop and sand it.
* **Core:** print upside down, with the stem top and rest bar on the bed. Every overhang is ≤ 45°, so it needs no supports.
  * The 3 mm vent pin ends up on top. Print it slowly with cooling.
  * If the pin breaks, cut it off, drill 3 mm and press in a 3 mm steel rod.
* **Finish:** sand the cavity and core, wet-sanding 220 → 400 → 800. Or seal with a thin brush-on epoxy coat, fully cured, then sand.
  * The silicone copies every layer line onto the sleeve.
* **Resin prints:** wash and fully post-cure them. Uncured resin inhibits platinum silicone. A coat of clear acrylic helps.

## Mold release and inhibition

* Use a release rated for platinum silicone on plastic. Examples: Mann Ease Release 200, or Smooth-On Universal Mold Release. Check the label.
* **Cure inhibition:** platinum silicone fails to cure when it touches the following:
  * sulfur-containing (oil-based) modeling clays
  * latex gloves
  * tin-cure silicone
  * some resins, especially under-cured SLA/DLP resin
  * some tapes

  Seal seams with sulfur-free clay or silicone-compatible tape. Wear nitrile gloves.
* **Do a test pour first.** Put a small cup of mixed silicone against a sanded, released scrap of the same print material. Confirm a full, non-tacky cure before casting the real part.

## Casting steps

1. Clean and release the cavity faces, core, bore and sprue.
2. Close the halves on the keys. Bolt them with six M4 × 20 bolts, snug and even. Seal the outside of the parting seam if it weeps.
3. Stand the mold tip-down on a level surface. Insert the core until the rest bar sits flat on the shell top and the vent pin is in its socket.
4. Choose a platinum-cure silicone, Shore 00-30 (soft) to Shore A-10 (firm), that its maker rates skin-safe.
   * Mix about **400 mL** (for example, 200 mL A + 200 mL B for a 1:1 system).
   * Vacuum degas if you can.
5. Pour in a thin, steady stream into the sprue cup. Keep pouring until silicone rises in both risers and the cup stays full. Tap the mold for a few minutes to release bubbles.
6. Cure for the maker's full demold time at the temperature they specify. Don't rush it.
7. **Demold:**
   * Remove the bolts and split the halves.
   * Put a rod through the stem hole and pull the core straight out with a slight twist. The draft and the silicone's stretch let it release.
8. Trim the sprue and riser stubs and the thin 0.3 mm flash ring at the base. Push a 3 mm rod through the vent to make sure it is clear.

## Post-cure and cleaning

* Wash the sleeve in warm water with mild, unscented soap. Rinse and air dry.
* Finish curing by the silicone maker's instructions: a heat post-cure in an oven, or a short boil where the maker allows it. This drives off residual volatiles and completes the cure.
* To clean between uses, use mild soap and water, or boil it if the maker allows. Store it dust-free, away from other silicone or rubber items.

## Fit-adjust table

These values are for 7.00 in girth. Diameter is the nominal interior at mid-depth; the 1° draft makes the dome end about 2 mm smaller and the base end about 2 mm larger.

| fit_ratio | Interior circumference | Interior diameter |
|---|---|---|
| 0.90 | 6.30 in | 2.005 in / 50.94 mm |
| **0.93 (default)** | 6.51 in | 2.072 in / 52.63 mm |
| 0.96 | 6.72 in | 2.139 in / 54.33 mm |
| 1.00 | 7.00 in | 2.228 in / 56.60 mm |

To change the fit, edit `params.py` and re-run `python mold.py`. Other useful settings:

* `wall_thickness_mm` (5–10)
* `base_flare_mm`
* `interior_length_in`
* `solid_tip_extension_in`
* `build_volume_mm`

`--texture rings` adds 0.5 mm raised rings. They reduce the interior diameter by 1 mm at each ring.

## Use notes

* **Use water-based lubricant only.** Silicone lubricants swell and degrade silicone.
* **Remove it right away** if you feel numbness, coldness, pain or any discomfort, or see color change.
  * Don't wear it for long sessions or while sleeping.
  * Never use it with a constriction ring.
* **Keep the vent clear.** It prevents suction.
* Inspect the sleeve before each use. Throw it away if it is torn, sticky or discolored.
* **If the sleeve slips:**
  1. First lower `interior_fit_ratio` to **0.90** and recast.
  2. If it still slips, shorten `solid_tip_extension_in` to **1.0**.

  Don't go below the 0.88 floor to chase grip.
