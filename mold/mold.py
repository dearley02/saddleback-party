"""
CadQuery generator for the silicone sleeve casting mold.

Mold coordinates (mm): Z is the sleeve axis, the mold is poured TIP-DOWN.
  z = 0          outer tip of the sleeve (bottom of the cavity)
  z = L          open, flared base of the sleeve (top of the cavity)
  z = L + top    top face of the shell; the core hangs from here
Profiles are drawn in the XZ half-plane (x = radius) and revolved about Z.
The shell is split on the XZ plane: half A is y >= 0, half B is y <= 0.

Run:  python mold.py [--split-core] [--texture rings] [--out DIR]
"""

import argparse
import math
import os
import sys

import cadquery as cq

import params as P

V = cq.Vector
IN = P.IN
EPS = 0.05


# ------------------------------------------------------------------ helpers
def pt(r, z):
    return V(r, 0, z)


def line(a, b):
    return cq.Edge.makeLine(pt(*a), pt(*b))


def arc_c(center, radius, a0, a1):
    """Arc about `center` from angle a0 to a1 (radians), via the mid angle."""
    cx, cz = center
    am = (a0 + a1) / 2
    p = lambda a: (cx + radius * math.cos(a), cz + radius * math.sin(a))
    return cq.Edge.makeThreePointArc(pt(*p(a0)), pt(*p(am)), pt(*p(a1)))


def revolve(edges):
    wire = cq.Wire.assembleEdges(edges)
    return cq.Solid.revolve(wire, [], 360, V(0, 0, 0), V(0, 0, 1))


def box(x0, x1, y0, y1, z0, z1):
    return cq.Solid.makeBox(x1 - x0, y1 - y0, z1 - z0, V(x0, y0, z0))


def cyl_z(r, z0, z1, x=0.0, y=0.0):
    return cq.Solid.makeCylinder(r, z1 - z0, V(x, y, z0))


def sample_edges(edges, n=60):
    pts = []
    for e in edges:
        for i in range(n + 1):
            p = e.positionAt(i / n)
            pts.append((p.x, p.z))
    return pts


# ------------------------------------------------------------------ profile
def solve_geometry():
    P.validate()
    g = {}
    d = math.radians(P.draft_deg)
    sd, cd, td = math.sin(d), math.cos(d), math.tan(d)
    L_int = P.interior_length_in * IN
    L = L_int + P.solid_tip_extension_in * IN
    z0 = L - L_int                                   # deepest interior point
    ri = P.user_girth_in * IN * P.interior_fit_ratio / (2 * math.pi)
    z_mid = (z0 + L) / 2                             # nominal radius held here
    wall = P.wall_thickness_mm
    r_line = lambda z: ri + (z - z_mid) * td          # drafted interior line
    wo = wall / cd
    r_oline = lambda z: r_line(z) + wo                # parallel exterior line

    # interior dome: sphere tangent to the drafted line, bottom at z0
    R = (ri + (z0 - z_mid) * td) / (cd - (1 - sd) * td)
    zc = z0 + R
    Tw = (R * cd, zc - R * sd)

    # vent entrance fillet (core pin root), radius f, tangent to pin + dome
    rp = P.vent_diameter_mm / 2
    f = P.vent_fillet_mm
    Cf = (rp + f, zc - math.sqrt((R + f) ** 2 - (rp + f) ** 2))
    dx, dz = 0 - Cf[0], zc - Cf[1]
    dn = math.hypot(dx, dz)
    Ts = (Cf[0] + f * dx / dn, Cf[1] + f * dz / dn)

    # flare arc (radius Rf, centre on the +r side) + interior lip round
    lr = P.lip_round_mm
    z_fs = L - P.flare_length_mm
    F0 = (r_line(z_fs), z_fs)

    def flare(Rf):
        C = (F0[0] + Rf * cd, F0[1] - Rf * sd)
        s = (L - lr - C[1]) / (Rf - lr)
        if not (-1 < s < 1):
            return None
        a1 = math.pi - math.asin(s)
        Clip = (C[0] + (Rf - lr) * math.cos(a1), C[1] + (Rf - lr) * math.sin(a1))
        return C, a1, Clip

    lo, hi = lr + 0.5, 5000.0
    for _ in range(200):                              # bisection on Rf
        mid = (lo + hi) / 2
        res = flare(mid)
        off = float("inf") if res is None else res[2][0] - r_line(L)
        lo, hi = (mid, hi) if off > P.base_flare_mm else (lo, mid)
    Rf = (lo + hi) / 2
    C, a1, Clip = flare(Rf)
    a0 = math.pi - d
    if not a1 < a0:
        raise ValueError("flare_length_mm too short for lip_round_mm")

    # exterior flare: S-curve from the drafted skin to a vertical rim, so the
    # rim keeps a flat face as wide as the wall between its two lip rounds
    e = P.lip_round_mm
    F0o = (F0[0] + wall * cd, F0[1] - wall * sd)
    R_rim = Clip[0] + wall + e            # outermost radius of the base rim
    Ce = (R_rim - e, L - e)               # exterior lip round centre
    if R_rim - e <= Clip[0] + 1.0:
        raise ValueError("rim too narrow; reduce lip_round_mm or flare")

    # ellipsoid tip cap, bottom at z = 0
    c = P.tip_cap_ratio * r_oline(0)
    for _ in range(5):
        c = P.tip_cap_ratio * r_oline(c)
    a = r_oline(c)

    g.update(dict(d=d, L=L, z0=z0, ri=ri, z_mid=z_mid, wall=wall, R=R, zc=zc,
                  Tw=Tw, rp=rp, f=f, Cf=Cf, Ts=Ts, lr=lr, z_fs=z_fs, F0=F0,
                  Rf=Rf, C=C, a0=a0, a1=a1, Clip=Clip, e=e, R_rim=R_rim,
                  Ce=Ce, F0o=F0o, c=c, a=a, r_line=r_line, r_oline=r_oline))

    # mold-side values
    clr = P.core_clearance_mm
    g["r_boss"] = Clip[0] + 1.0                   # core boss / cavity ceiling
    g["boss_cyl"] = 2.0                           # straight part of the boss
    g["T"] = P.shell_top_mm
    g["Tb"] = P.shell_wall_mm + P.vent_socket_depth_mm
    g["sock"] = P.vent_socket_depth_mm
    g["z_top"] = L + g["T"]
    g["z_stem"] = g["z_top"] + P.core_stem_above_mm
    g["bore_L"] = g["r_boss"] + clr
    g["bore_top"] = g["bore_L"] - (g["T"] - g["boss_cyl"])
    # sprue / risers on the rim ceiling, clear of the core boss bore
    g["r_g"] = max((g["bore_L"] + Ce[0]) / 2,
                   g["bore_L"] + P.sprue_diameter_mm / 2 + 0.5)
    return g


def ellipse_edge(g):
    a, c, d = g["a"], g["c"], g["d"]
    n = 24
    pts = [pt(a * math.sin(t), c - c * math.cos(t))
           for t in (i * math.pi / 2 / n for i in range(n + 1))]
    return cq.Edge.makeSpline(pts, tangents=[V(1, 0, 0),
                                              V(math.sin(d), 0, math.cos(d))])


def exterior_edges(g):
    """Outer skin of the sleeve, tip (0,0) -> rim (Ce.r, L)."""
    Ce, e, L, d = g["Ce"], g["e"], g["L"], g["d"]
    F0o = g["F0o"]
    flare = cq.Edge.makeSpline(
        [pt(*F0o), pt(g["R_rim"], L - e)],
        tangents=[V(math.sin(d), 0, math.cos(d)), V(0, 0, 1)])
    return [
        ellipse_edge(g),
        line((g["a"], g["c"]), F0o),
        flare,
        arc_c(Ce, e, 0.0, math.pi / 2),
    ]


def ring_centres(g):
    if P.interior_texture != "rings":
        return []
    z_lo = g["Tw"][1] + P.ring_width_mm
    z_hi = g["z_fs"] - P.ring_width_mm
    n = int((z_hi - z_lo) // P.ring_pitch_mm) + 1
    return [z_lo + i * P.ring_pitch_mm for i in range(n)]


def drafted_interior_edges(g):
    """Drafted interior wall Tw -> F0, with optional cosine ring grooves."""
    r_line, d = g["r_line"], g["d"]
    t = V(math.sin(d), 0, math.cos(d))
    edges, cur = [], g["Tw"]
    w, dep = P.ring_width_mm, P.ring_depth_mm
    for zr in ring_centres(g):
        za, zb = zr - w / 2, zr + w / 2
        edges.append(line(cur, (r_line(za), za)))
        n = 16
        pts = []
        for i in range(n + 1):
            z = za + w * i / n
            bump = dep * (1 - math.cos(2 * math.pi * (z - za) / w)) / 2
            pts.append(pt(r_line(z) - bump, z))
        edges.append(cq.Edge.makeSpline(pts, tangents=[t, t]))
        cur = (r_line(zb), zb)
    edges.append(line(cur, g["F0"]))
    return edges


def interior_edges(g):
    """Sleeve interior = core surface, vent pin root -> rim (Clip.r, L)."""
    zc, R, Cf, Ts, Tw = g["zc"], g["R"], g["Cf"], g["Ts"], g["Tw"]
    a_ts = math.atan2(Ts[1] - zc, Ts[0])
    a_tw = math.atan2(Tw[1] - zc, Tw[0])
    a_f_ts = math.atan2(Ts[1] - Cf[1], Ts[0] - Cf[0])
    return ([arc_c(Cf, g["f"], math.pi, a_f_ts),
             arc_c((0, zc), R, a_ts, a_tw)]
            + drafted_interior_edges(g)
            + [arc_c(g["C"], g["Rf"], g["a0"], g["a1"]),
               arc_c(g["Clip"], g["lr"], g["a1"], math.pi / 2)])


# ------------------------------------------------------------------ solids
def build_cavity(g):
    """Solid envelope of the sleeve's outside (what the shell encloses)."""
    Ce, L = g["Ce"], g["L"]
    edges = exterior_edges(g) + [line((Ce[0], L), (0, L)), line((0, L), (0, 0))]
    return revolve(edges)


def vent_exit_round(g, cavity):
    """Shell material that rounds the vent exit at the outer tip."""
    rv = g["rp"] + P.core_clearance_mm
    f = P.vent_fillet_mm
    a, c = g["a"], g["c"]
    zb = c - c * math.sqrt(max(0.0, 1 - ((rv + f) / a) ** 2))
    ctr = (rv + f, zb + f)
    edges = [line((rv, -1), (rv + f, -1)),
             line((rv + f, -1), (rv + f, zb)),
             arc_c(ctr, f, -math.pi / 2, -math.pi),
             line((rv, zb + f), (rv, -1))]
    return revolve(edges).intersect(cavity)


def build_core(g):
    L, rp = g["L"], g["rp"]
    Clip, r_boss, bc = g["Clip"], g["r_boss"], g["boss_cyl"]
    z_pin = -g["sock"]
    z_stem = g["z_stem"]
    # 45 deg cone from the top of the boss up to the stem top
    r_top = r_boss - (z_stem - (L + bc))
    r_min = 6.0
    edges = [line((0, z_pin), (rp, z_pin)),
             line((rp, z_pin), (rp, g["Cf"][1]))]
    edges += interior_edges(g)
    edges += [line((Clip[0], L), (r_boss, L)),
              line((r_boss, L), (r_boss, L + bc))]
    if r_top >= r_min:
        edges += [line((r_boss, L + bc), (r_top, z_stem)),
                  line((r_top, z_stem), (0, z_stem))]
    else:
        z_k = L + bc + (r_boss - r_min)
        edges += [line((r_boss, L + bc), (r_min, z_k)),
                  line((r_min, z_k), (r_min, z_stem)),
                  line((r_min, z_stem), (0, z_stem))]
    edges.append(line((0, z_stem), (0, z_pin)))
    core = revolve(edges)

    # rest bar: hangs the core on the shell top, 45 deg underside when the
    # core is printed stem-down; runs along Y so it bears on both halves
    zt, hw = g["z_top"], P.core_rest_bar_half_w_mm
    r_ear = g["bore_top"] + P.core_rest_bar_overhang_mm
    h = z_stem - zt
    bar_pts = [(0, zt), (r_ear, zt), (r_ear, zt + 2),
               (max(0.0, r_ear - (h - 2)), z_stem), (0, z_stem)]
    half = (cq.Workplane("YZ").polyline(bar_pts).close()
            .extrude(hw, both=True).val())
    bar = half.fuse(half.mirror("XZ"))
    core = core.fuse(bar)

    # pull-rod cross hole through the stem
    zh = zt + P.core_stem_above_mm * 0.6
    hole = cq.Solid.makeCylinder(P.core_pull_hole_mm / 2, 200,
                                 V(-100, 0, zh), V(1, 0, 0))
    core = core.cut(hole)
    g["r_ear"] = r_ear
    return core.clean()


def split_core(g, core):
    zs = (g["Tw"][1] + g["z_fs"]) / 2
    r, h, cl = P.split_dowel_r_mm, P.split_dowel_h_mm, P.key_clearance_mm
    big = 1000
    upper = core.intersect(box(-big, big, -big, big, zs, big))
    lower = core.intersect(box(-big, big, -big, big, -big, zs))
    dowel = cq.Solid.makeCone(r, r - h, h, V(0, 0, zs + EPS), V(0, 0, -1))
    upper = upper.fuse(dowel).clean()
    sock = cq.Solid.makeCone(r + cl + 0.5, r - h, h + cl + 0.5,
                             V(0, 0, zs + 0.5), V(0, 0, -1))
    lower = lower.cut(sock).clean()
    g["z_split"] = zs
    return upper, lower


def shell_profile(g, cavity_pts):
    """Outer radius of the shell: cavity dilated by shell_wall, made
    monotone (never narrower toward the top) and flat at the bottom."""
    sw = P.shell_wall_mm + 0.25
    Tb, zt, L = g["Tb"], g["z_top"], g["L"]
    zs = [-Tb + i * 2.0 for i in range(int((zt + Tb) / 2.0) + 1)] + [zt]
    rs = []
    for z in zs:
        r = 0.0
        for (pr, pz) in cavity_pts:
            dz = abs(z - pz)
            if dz < sw:
                r = max(r, pr + math.sqrt(sw * sw - dz * dz))
        rs.append(r)
    # flat, full-width base below the tip cap; monotone after that
    base = max(r for r, z in zip(rs, zs) if z <= g["c"])
    out, cur = [], base
    for r, z in zip(rs, zs):
        cur = max(cur, r)
        out.append((cur, z))
    # the top must also carry the sprue cup
    need = g["r_g"] + P.sprue_cup_diameter_mm / 2 + 2.0
    out = [(max(r, need) if z >= L else r, z) for r, z in out]
    # collapse to a polyline with only the vertices that matter
    pts = [(0, -Tb)] + [(r, z) for r, z in out] + [(0, zt)]
    simp = [pts[0]]
    for i in range(1, len(pts) - 1):
        (r0, z0), (r1, z1), (r2, z2) = simp[-1], pts[i], pts[i + 1]
        cross = (r1 - r0) * (z2 - z0) - (z1 - z0) * (r2 - r0)
        if abs(cross) > 1e-3:
            simp.append(pts[i])
    simp.append(pts[-1])
    edges = [line(simp[i], simp[i + 1]) for i in range(len(simp) - 1)]
    edges.append(line(simp[-1], simp[0]))
    g["shell_R_max"] = max(r for r, _ in simp)
    return revolve(edges)


def build_shell(g, cavity, cavity_pts):
    L, zt, Tb = g["L"], g["z_top"], g["Tb"]
    clr = P.core_clearance_mm
    body = shell_profile(g, cavity_pts)
    Rm = g["shell_R_max"]
    W = Rm + P.flange_width_mm
    tf = P.flange_half_thick_mm
    body = body.fuse(box(-W, W, -tf, tf, -Tb, zt))

    body = body.cut(cavity)
    body = body.fuse(vent_exit_round(g, cavity))

    # core boss bore: straight 2 mm then 45 deg to the top face
    bL, bT, bc = g["bore_L"], g["bore_top"], g["boss_cyl"]
    bore = revolve([line((0, L - EPS), (bL, L - EPS)),
                    line((bL, L - EPS), (bL, L + bc)),
                    line((bL, L + bc), (bT, zt + EPS)),
                    line((bT, zt + EPS), (bT - 1, zt + 1)),
                    line((bT - 1, zt + 1), (0, zt + 1)),
                    line((0, zt + 1), (0, L - EPS))])
    body = body.cut(bore)

    # vent pin socket in the shell floor
    body = body.cut(cyl_z(g["rp"] + clr, -g["sock"] - clr, 1.0))

    # pour sprue with funnel cup, on the parting plane (+X)
    rg, e = g["r_g"], g["e"]
    rs, rc = P.sprue_diameter_mm / 2, P.sprue_cup_diameter_mm / 2
    cup_h = rc - rs
    body = body.cut(cyl_z(rs, L - e, zt + 1, x=rg))
    body = body.cut(cq.Solid.makeCone(rs, rc + 1, cup_h + 1,
                                      V(rg, 0, zt - cup_h), V(0, 0, 1)))
    # riser vents at the rim ceiling (highest point, tip-down pour)
    rr = P.riser_diameter_mm / 2
    g["riser_xy"] = []
    for ang in (120.0, 240.0):
        x = rg * math.cos(math.radians(ang))
        y = rg * math.sin(math.radians(ang))
        g["riser_xy"].append((x, y))
        body = body.cut(cyl_z(rr, L - e, zt + 1, x=x, y=y))

    # M4 bolt holes through the flanges
    xb = Rm + P.flange_width_mm / 2
    n = P.bolts_per_side
    zb = [25 + i * (L - 50) / (n - 1) for i in range(n)] if n > 1 else [L / 2]
    for x in (xb, -xb):
        for z in zb:
            body = body.cut(cq.Solid.makeCylinder(
                P.bolt_hole_mm / 2, 4 * tf, V(x, -2 * tf, z), V(0, 1, 0)))

    big = 1000
    half_a = body.intersect(box(-big, big, 0, big, -big, big))
    half_b = body.intersect(box(-big, big, -big, 0, -big, big))

    # 4 registration cones (45 deg): pins on A, sockets on B
    kr, kh, kc = P.key_base_r_mm, P.key_height_mm, P.key_clearance_mm
    zk = [8.0, zt - 12.0]
    keys = [(x, z) for x in (xb, -xb) for z in zk]
    for (x, z) in keys:
        half_a = half_a.fuse(cq.Solid.makeCone(
            kr, kr - kh, kh, V(x, EPS, z), V(0, -1, 0)))
        half_b = half_b.cut(cq.Solid.makeCone(
            kr + kc + 0.5, kr - kh + kc, kh + kc + 0.5,
            V(x, 0.5, z), V(0, -1, 0)))
    g.update(xb=xb, bolt_z=zb, keys=keys, W=W)
    return half_a.clean(), half_b.clean()


# ------------------------------------------------------------------ checks
def safety_checks(g, int_pts):
    """No constriction: untextured interior radius never decreases toward
    the opening, and the opening is the widest point of the bore."""
    base = [(r, z) for r, z in int_pts if z >= g["Tw"][1] - 1e-6]
    base.sort(key=lambda p: p[1])
    for (r0, z0), (r1, z1) in zip(base, base[1:]):
        if r1 < r0 - 1e-6:
            raise AssertionError(f"interior constriction at z={z1:.1f} mm")
    if base[-1][0] <= max(r for r, _ in base[:-1]) - 1e-6:
        raise AssertionError("opening is not the widest point")
    radii = [g["lr"], g["f"], g["Rf"], g["R"]]
    if P.interior_texture == "rings":
        w, dep = P.ring_width_mm, P.ring_depth_mm
        radii.append(1 / (dep / 2 * (2 * math.pi / w) ** 2))
    if min(radii) < P.min_interior_fillet_mm:
        raise AssertionError("an interior radius is below the 2 mm minimum")
    return min(radii)


def min_wall(int_pts, ext_pts, z_from):
    """Smallest distance from the interior skin to the exterior skin."""
    best = float("inf")
    segs = list(zip(ext_pts, ext_pts[1:]))
    for (px, pz) in int_pts:
        if pz < z_from:
            continue
        for (ax, az), (bx, bz) in segs:
            vx, vz = bx - ax, bz - az
            ll = vx * vx + vz * vz
            t = 0.0 if ll == 0 else max(0.0, min(1.0, ((px - ax) * vx +
                                                     (pz - az) * vz) / ll))
            best = min(best, math.hypot(ax + t * vx - px, az + t * vz - pz))
    return best


# ------------------------------------------------------------------ main
def bbox(s):
    b = s.BoundingBox()
    return b.xlen, b.ylen, b.zlen


def fits(dims, vol):
    """Part printed with its Z up: Z must fit, XY may rotate 90 deg."""
    x, y, z = dims
    X, Y, Z = vol
    return z <= Z and ((x <= X and y <= Y) or (y <= X and x <= Y))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(
        os.path.abspath(__file__)), "out"))
    ap.add_argument("--split-core", action="store_true")
    ap.add_argument("--texture", choices=["none", "rings"])
    args = ap.parse_args()
    if args.split_core:
        P.split_core = True
    if args.texture:
        P.interior_texture = args.texture
    os.makedirs(args.out, exist_ok=True)

    g = solve_geometry()
    int_e = interior_edges(g)
    ext_e = exterior_edges(g)
    int_pts = sample_edges(int_e)
    ext_pts = sample_edges(ext_e)
    min_r = safety_checks(g, [p for p in int_pts] if P.interior_texture ==
                          "none" else sample_edges(
                              interior_edges_untextured(g)))

    cavity = build_cavity(g)
    core = build_core(g)
    half_a, half_b = build_shell(g, cavity, ext_pts)

    product = cavity.cut(core).cut(vent_exit_round(g, cavity))
    for name, s in (("cavity", cavity), ("core", core), ("half_a", half_a),
                    ("half_b", half_b), ("product", product)):
        if not s.isValid():
            raise RuntimeError(f"{name} solid is not valid")
    if product.intersect(half_a).Volume() > 1.0 or \
            product.intersect(half_b).Volume() > 1.0:
        raise RuntimeError("shell intrudes into the casting")

    files = {"mold_half_A.stl": half_a, "mold_half_B.stl": half_b,
             "core.stl": core}
    if P.split_core:
        up, lo = split_core(g, core)
        files.update({"core_upper.stl": up, "core_lower.stl": lo})
    for fn, s in files.items():
        cq.exporters.export(s, os.path.join(args.out, fn),
                            tolerance=0.02, angularTolerance=0.05)

    # ------------------------------------------------------------ report
    D = P.derived()
    L = g["L"]
    vol_ml = product.Volume() / 1000.0
    wall_min = min_wall(int_pts, ext_pts, g["z0"])
    r = g["r_line"]
    print("=" * 64)
    print("SILICONE SLEEVE MOLD - DIMENSION SUMMARY")
    print("=" * 64)
    print(f"girth {P.user_girth_in:.2f} in   fit_ratio {P.interior_fit_ratio:.2f}"
          f"   texture {P.interior_texture}")
    print(f"interior circumference   {D['interior_circ_in']:.3f} in")
    print(f"interior diameter (nom)  {D['interior_diam_in']:.3f} in / "
          f"{D['interior_diam_mm']:.2f} mm   (held at mid-depth)")
    print(f"  with {P.draft_deg:.1f} deg draft:  "
          f"{2*r(g['Tw'][1]):.2f} mm at dome -> {2*r(g['z_fs']):.2f} mm at "
          f"flare start")
    print(f"opening diameter (rim)   {2*g['Clip'][0]:.2f} mm  "
          f"(flare +{g['Clip'][0]-r(L):.2f} mm radial)")
    print(f"outer diameter (nom)     {D['outer_diam_in']:.3f} in / "
          f"{D['outer_diam_mm']:.2f} mm   (base rim {2*g['R_rim']:.1f} mm)")
    print(f"wall                     {P.wall_thickness_mm:.1f} mm nominal, "
          f"{wall_min:.2f} mm min measured")
    print(f"base rim flat face       {g['Ce'][0]-g['Clip'][0]:.1f} mm wide + "
          f"{P.lip_round_mm:.0f} mm rounds both edges")
    print(f"interior (hollow) depth  {P.interior_length_in:.2f} in / "
          f"{g['L']-g['z0']:.1f} mm")
    print(f"solid tip                {P.solid_tip_extension_in:.2f} in / "
          f"{g['z0']:.1f} mm")
    print(f"total length             {D['total_length_in']:.2f} in / {L:.1f} mm")
    print(f"vent                     {P.vent_diameter_mm:.1f} mm dia, "
          f"{g['Cf'][1]:.1f} mm long, {P.vent_fillet_mm:.1f} mm rounds")
    print(f"smallest interior radius {min_r:.2f} mm (>= "
          f"{P.min_interior_fillet_mm} required)")
    print(f"silicone volume          {vol_ml:.0f} mL  "
          f"(mix ~{vol_ml*1.15:.0f} mL incl. 15% sprue/cup/loss)")
    print("-" * 64)
    Hs = g["Tb"] + g["z_top"]
    print(f"mold: shell {Hs:.1f} mm tall, core stem +{P.core_stem_above_mm:.0f}"
          f" mm -> assembled height {Hs + P.core_stem_above_mm:.1f} mm")
    print(f"shell R max {g['shell_R_max']:.1f} mm, flange span "
          f"{2*g['W']:.1f} mm, bolts x=+/-{g['xb']:.1f} at z="
          + ", ".join(f"{z:.0f}" for z in g["bolt_z"]))
    print(f"sprue {P.sprue_diameter_mm:.0f} mm at r={g['r_g']:.1f} (+X, "
          f"parting plane), risers {P.riser_diameter_mm:.0f} mm at 120/240 deg")
    print(f"core boss r={g['r_boss']:.2f}, bore r={g['bore_L']:.2f} "
          f"({P.core_clearance_mm} mm clearance)")
    print("-" * 64)
    print(f"build volume {P.build_volume_mm}")
    over = False
    for fn, s in files.items():
        dims = bbox(s)
        ok = fits(dims, P.build_volume_mm)
        over |= (not ok) and fn in ("mold_half_A.stl", "mold_half_B.stl",
                                    "core.stl") and not P.split_core
        print(f"  {fn:18s} {dims[0]:6.1f} x {dims[1]:6.1f} x {dims[2]:6.1f}"
              f" mm  {'fits' if ok else 'DOES NOT FIT'}")
    if over:
        print("  -> exceeds build volume. Re-run with --split-core "
              "(core in two pieces joined by a cone dowel).")
    print(f"STLs written to {args.out}")
    return 0


def interior_edges_untextured(g):
    saved = P.interior_texture
    P.interior_texture = "none"
    try:
        return interior_edges(g)
    finally:
        P.interior_texture = saved


if __name__ == "__main__":
    sys.exit(main())
