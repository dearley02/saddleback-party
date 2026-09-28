"""
Parametric inputs for the silicone sleeve casting mold.

Fit inputs are in inches (as measured); everything the CAD uses is in mm.
Edit the values in the FIT / SLEEVE / MOLD / PRINTER sections, then run
`python mold.py`.  validate() runs on import of mold.py and raises
ValueError on anything outside the safety limits.
"""

import math

IN = 25.4  # mm per inch

# ---------------------------------------------------------------- FIT
user_girth_in = 7.0            # measured circumference, erect
interior_fit_ratio = 0.93      # resting interior circumference / girth
interior_length_in = 6.5       # hollow depth (7.0 in erect length - 0.5 in)
solid_tip_extension_in = 1.5   # solid length beyond the hollow depth

# ---------------------------------------------------------------- SLEEVE
wall_thickness_mm = 7.0        # 5..10
tip_profile = "rounded"        # ellipsoid cap (only option)
tip_cap_ratio = 0.75           # ellipsoid axial semi-axis / outer radius
base_flare_mm = 6.0            # radial flare of the opening, open base
flare_length_mm = 20.0         # axial length over which the flare develops
lip_round_mm = 3.0             # full round on interior + exterior rim edges
interior_texture = "none"      # "none" | "rings"
ring_depth_mm = 0.5            # ridge height when interior_texture="rings"
ring_width_mm = 6.0
ring_pitch_mm = 12.0

vent_diameter_mm = 3.0         # anti-suction vent, interior tip -> outside
vent_fillet_mm = 2.0           # round on both ends of the vent
min_interior_fillet_mm = 2.0   # hard floor for every interior radius

# ---------------------------------------------------------------- MOLD
draft_deg = 1.0                # core draft, narrowing toward the tip
shell_wall_mm = 4.0            # min shell thickness around the cavity
shell_top_mm = 8.0             # top wall (carries the core boss bore)
core_clearance_mm = 0.3        # core <-> shell print clearance
key_clearance_mm = 0.2         # registration cone clearance
key_base_r_mm = 4.0            # 45 deg cone key: base radius
key_height_mm = 3.0            #   height (top radius = base - height)
flange_width_mm = 14.0         # bolt flange beyond the shell body
flange_half_thick_mm = 6.0     # per half (12 mm total when clamped)
bolt_hole_mm = 4.5             # M4 clearance
bolts_per_side = 3
sprue_diameter_mm = 8.0
sprue_cup_diameter_mm = 16.0   # pour funnel at the sprue mouth
riser_diameter_mm = 3.0
vent_socket_depth_mm = 3.0     # vent pin seats this deep into the shell floor
core_stem_above_mm = 20.0      # handle height above the mold top
core_rest_bar_half_w_mm = 5.0  # rest bar that hangs the core on the shell top
core_rest_bar_overhang_mm = 6.0
core_pull_hole_mm = 8.0        # cross hole in the stem for a pull rod

split_core = False             # True -> core_upper.stl + core_lower.stl
split_dowel_r_mm = 6.0         # 45 deg cone dowel joining the split core
split_dowel_h_mm = 5.0

# ---------------------------------------------------------------- PRINTER
build_volume_mm = (256.0, 256.0, 256.0)   # X, Y, Z of the target printer


# ---------------------------------------------------------------- DERIVED
def derived():
    circ_in = user_girth_in * interior_fit_ratio
    id_in = circ_in / math.pi
    od_in = id_in + 2 * wall_thickness_mm / IN
    total_in = interior_length_in + solid_tip_extension_in
    return {
        "interior_circ_in": circ_in,
        "interior_diam_in": id_in,
        "interior_diam_mm": id_in * IN,
        "outer_diam_in": od_in,
        "outer_diam_mm": od_in * IN,
        "interior_length_mm": interior_length_in * IN,
        "solid_tip_mm": solid_tip_extension_in * IN,
        "total_length_in": total_in,
        "total_length_mm": total_in * IN,
    }


def fit_table(ratios=(0.90, 0.93, 0.96, 1.00)):
    rows = []
    for r in ratios:
        d_in = user_girth_in * r / math.pi
        rows.append((r, user_girth_in * r, d_in, d_in * IN))
    return rows


def validate():
    if not (0.88 <= interior_fit_ratio <= 1.00):
        raise ValueError(
            f"interior_fit_ratio={interior_fit_ratio} outside the safe range "
            "0.88..1.00")
    if not (5.0 <= wall_thickness_mm <= 10.0):
        raise ValueError(
            f"wall_thickness_mm={wall_thickness_mm} outside 5..10 mm")
    if base_flare_mm <= 0:
        raise ValueError("base_flare_mm must be > 0: the opening must flare "
                         "outward (no closed or constricting rim)")
    if tip_profile != "rounded":
        raise ValueError("tip_profile: only 'rounded' is implemented")
    if interior_texture not in ("none", "rings"):
        raise ValueError("interior_texture must be 'none' or 'rings'")
    if interior_texture == "rings" and not (0 < ring_depth_mm <= 0.5):
        raise ValueError("ring_depth_mm must be in (0, 0.5]")
    if vent_diameter_mm < 3.0:
        raise ValueError("vent_diameter_mm must be >= 3.0")
    for name in ("lip_round_mm", "vent_fillet_mm"):
        if globals()[name] < min_interior_fillet_mm:
            raise ValueError(f"{name} must be >= {min_interior_fillet_mm} mm")
    if not (0.5 <= draft_deg <= 3.0):
        raise ValueError("draft_deg should be 0.5..3.0")
