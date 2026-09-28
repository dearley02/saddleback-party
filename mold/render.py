"""
PNG previews of the cast part and the mold, rendered with matplotlib from
the same CadQuery solids mold.py exports.

Run:  python render.py [--out renders]
  part_iso.png       finished silicone part, isometric
  part_section.png   lengthwise section with key dimensions
  mold_exploded.png  shell halves and core pulled apart
"""

import argparse
import math
import os

import cadquery as cq
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.collections import PolyCollection  # noqa: E402

import mold as M  # noqa: E402
import params as P  # noqa: E402

LIGHTS = [(np.array([-0.45, -0.75, 0.85]), 0.70),
          (np.array([0.8, 0.3, 0.2]), 0.25)]
AMBIENT = 0.22


# ------------------------------------------------------------------ raster
# No OpenGL in headless containers, so this is a small numpy z-buffer
# renderer: orthographic camera, Gouraud-shaded triangles, 2x supersampling.
def mesh(shape, offset=(0, 0, 0), tol=0.08, ang=0.08):
    verts, tris = shape.tessellate(tol, ang)
    v = np.array([(p.x, p.y, p.z) for p in verts]) + np.array(offset)
    t = np.array(tris)
    fn = np.cross(v[t[:, 1]] - v[t[:, 0]], v[t[:, 2]] - v[t[:, 0]])
    vn = np.zeros_like(v)
    for k in range(3):
        np.add.at(vn, t[:, k], fn)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
    return v, t, vn


def camera(elev, azim):
    e, a = math.radians(elev), math.radians(azim)
    fwd = np.array([math.cos(e) * math.cos(a), math.cos(e) * math.sin(a),
                    math.sin(e)])            # points from scene to viewer
    right = np.cross([0, 0, 1], fwd)
    right /= np.linalg.norm(right)
    up = np.cross(fwd, right)
    return right, up, fwd


def render(parts, elev, azim, size=(1400, 1400), ssaa=2, margin=0.06):
    """parts: [(mesh, rgb)] -> (HxWx3 image, project(xyz) -> pixel xy)."""
    right, up, fwd = camera(elev, azim)
    W, H = size[0] * ssaa, size[1] * ssaa
    allv = np.vstack([m[0] for m, _ in parts])
    sx, sy = allv @ right, allv @ up
    span = max(np.ptp(sx) / W, np.ptp(sy) / H) * (1 + 2 * margin)
    cx, cy = (sx.max() + sx.min()) / 2, (sy.max() + sy.min()) / 2

    def proj(p):
        p = np.atleast_2d(p)
        return np.stack([(p @ right - cx) / span + W / 2,
                         H / 2 - (p @ up - cy) / span], axis=1)

    img = np.ones((H, W, 3))
    zbuf = np.full((H, W), -np.inf)
    for (v, t, vn), rgb in parts:
        rgb = np.array(rgb)
        p2 = proj(v)
        dep = v @ fwd
        n = vn * np.where((vn @ fwd) < 0, -1, 1)[:, None]
        inten = np.full(len(v), AMBIENT)
        for L, w in LIGHTS:
            Ln = L / np.linalg.norm(L)
            inten += w * np.clip(n @ Ln, 0, 1)
        col = np.clip(inten[:, None] * rgb, 0, 1)
        for tri in t:
            a, b, c = p2[tri]
            x0 = max(int(math.floor(min(a[0], b[0], c[0]))), 0)
            x1 = min(int(math.ceil(max(a[0], b[0], c[0]))), W - 1)
            y0 = max(int(math.floor(min(a[1], b[1], c[1]))), 0)
            y1 = min(int(math.ceil(max(a[1], b[1], c[1]))), H - 1)
            if x1 < x0 or y1 < y0:
                continue
            den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(den) < 1e-12:
                continue
            xs = np.arange(x0, x1 + 1) + 0.5
            ys = np.arange(y0, y1 + 1) + 0.5
            X, Y = np.meshgrid(xs, ys)
            l0 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / den
            l1 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / den
            l2 = 1 - l0 - l1
            inside = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
            if not inside.any():
                continue
            d = l0 * dep[tri[0]] + l1 * dep[tri[1]] + l2 * dep[tri[2]]
            zb = zbuf[y0:y1 + 1, x0:x1 + 1]
            win = inside & (d > zb)
            if not win.any():
                continue
            zb[win] = d[win]
            cc = (l0[..., None] * col[tri[0]] + l1[..., None] * col[tri[1]]
                  + l2[..., None] * col[tri[2]])
            img[y0:y1 + 1, x0:x1 + 1][win] = cc[win]
    img = img.reshape(size[1], ssaa, size[0], ssaa, 3).mean(axis=(1, 3))
    return img, lambda p: proj(p) / ssaa


def show(img, path, title, labels=(), proj=None):
    h, w = img.shape[:2]
    fig = plt.figure(figsize=(w / 150, h / 150 + 0.4), dpi=150)
    ax = fig.add_axes([0, 0, 1, h / (h + 60)])
    ax.imshow(img, interpolation="lanczos")
    for xyz, text, (dx, dy) in labels:
        x, y = proj(np.array(xyz, float))[0]
        ax.annotate(text, xy=(x, y), xytext=(x + dx, y + dy), fontsize=9,
                    ha="center", va="center",
                    bbox=dict(fc="white", ec="0.6", lw=0.5, pad=2),
                    arrowprops=dict(arrowstyle="-", lw=0.7, color="0.25"))
    ax.set_axis_off()
    fig.suptitle(title, fontsize=12, y=0.995)
    fig.savefig(path, facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ section
def section_faces(solid):
    plane = cq.Face.makePlane(1000, 1000, cq.Vector(0, 0, 100),
                              cq.Vector(0, 1, 0))
    return solid.intersect(plane)


def dim(ax, p0, p1, text, off=(0, 0), color="k", fs=9, ha="center"):
    ax.annotate("", xy=p1, xytext=p0,
                arrowprops=dict(arrowstyle="<->", color=color, lw=0.9,
                                shrinkA=0, shrinkB=0))
    mx, my = (p0[0] + p1[0]) / 2 + off[0], (p0[1] + p1[1]) / 2 + off[1]
    ax.text(mx, my, text, ha=ha, va="center", fontsize=fs, color=color,
            bbox=dict(fc="white", ec="none", pad=1.2, alpha=0.9))


def ext(ax, p0, p1, color="0.55"):
    ax.plot([p0[0], p1[0]], [p0[1], p1[1]], color=color, lw=0.6, ls="--")


def part_section(g, product, path):
    sec = section_faces(product)
    # plot with the sleeve axis horizontal: u = z (tip left), v = x
    verts, tris = sec.tessellate(0.1)
    uv = np.array([(p.z, p.x) for p in verts])
    polys = uv[np.array(tris)]
    fig, ax = plt.subplots(figsize=(15, 7.5))
    ax.add_collection(PolyCollection(polys, facecolor="#9fd3b0",
                                     edgecolor="#9fd3b0", lw=0.2))
    for e in sec.Edges():
        pts = [e.positionAt(i / 40) for i in range(41)]
        ax.plot([p.z for p in pts], [p.x for p in pts], color="#1d5b34",
                lw=1.0)
    ax.axhline(0, color="0.6", lw=0.6, ls="-.")

    L, z0, rl, ro = g["L"], g["z0"], g["r_line"], g["r_oline"]
    zm = g["z_mid"]
    Clip, Rr, rp = g["Clip"][0], g["R_rim"], g["rp"]
    top = Rr + 12

    # lengths (above the part)
    for u in (0, z0, L):
        ext(ax, (u, 0), (u, top + 24))
    dim(ax, (0, top + 22), (L, top + 22),
        f"total length {L:.1f} mm ({L/25.4:.2f} in)")
    dim(ax, (z0, top + 10), (L, top + 10),
        f"hollow depth {L-z0:.1f} mm ({(L-z0)/25.4:.2f} in)")
    dim(ax, (0, top + 10), (z0, top + 10),
        f"solid tip\n{z0:.1f} mm", fs=8)

    # diameters at mid-depth
    dim(ax, (zm, -rl(zm)), (zm, rl(zm)),
        f"ID {2*rl(zm):.1f} mm\n({2*rl(zm)/25.4:.3f} in)", off=(0, 12))
    dim(ax, (zm, -ro(zm)), (zm, -rl(zm) - 0.5), "", fs=8)
    dim(ax, (zm, ro(zm)), (zm, rl(zm) + 0.5), "", fs=8)
    ax.text(zm, -ro(zm) - 6, f"OD {2*ro(zm):.1f} mm ({2*ro(zm)/25.4:.3f} in)"
            "\nboth at mid-depth", ha="center", va="top", fontsize=9)

    # wall thickness callout
    uw = zm + 30
    dim(ax, (uw, -rl(uw)), (uw, -ro(uw)), "", fs=8)
    ax.annotate(f"wall {P.wall_thickness_mm:.1f} mm",
                xy=(uw, -(rl(uw) + ro(uw)) / 2), xytext=(uw + 12, -top + 4),
                fontsize=9, arrowprops=dict(arrowstyle="-", lw=0.6))

    # opening + rim at the base
    ub = L + 8
    ext(ax, (L, Clip), (ub + 18, Clip))
    ext(ax, (L, -Clip), (ub + 18, -Clip))
    ext(ax, (L - 3, Rr), (ub + 34, Rr))
    ext(ax, (L - 3, -Rr), (ub + 34, -Rr))
    dim(ax, (ub + 16, -Clip), (ub + 16, Clip),
        f"opening\n{2*Clip:.1f} mm", ha="center")
    dim(ax, (ub + 32, -Rr), (ub + 32, Rr), f"rim OD\n{2*Rr:.1f} mm",
        off=(0, 20))
    ax.annotate(f"{P.base_flare_mm:.0f} mm flare, open base\n"
                f"{P.lip_round_mm:.0f} mm rounded lip",
                xy=(L - 8, rl(L - 8) + 3.5), xytext=(L - 70, top - 4),
                fontsize=8.5, arrowprops=dict(arrowstyle="->", lw=0.6))

    # vent
    ax.annotate(f"{P.vent_diameter_mm:.0f} mm anti-suction vent\n"
                f"{P.vent_fillet_mm:.0f} mm rounds both ends",
                xy=(z0 / 2, rp), xytext=(8, -top + 2), fontsize=8.5,
                arrowprops=dict(arrowstyle="->", lw=0.6))
    ax.annotate("ellipsoid tip", xy=(3, g["a"] * 0.55),
                xytext=(-22, g["a"] + 14), fontsize=8.5,
                arrowprops=dict(arrowstyle="->", lw=0.6))
    ax.annotate(f"{P.draft_deg:.0f}° draft toward base",
                xy=(zm - 30, rl(zm - 30)), xytext=(zm - 95, 8), fontsize=8.5,
                arrowprops=dict(arrowstyle="->", lw=0.6))

    ax.set_xlim(-30, L + 55)
    ax.set_ylim(-top - 8, top + 30)
    ax.set_aspect("equal")
    ax.set_axis_off()
    ax.set_title(
        f"Sleeve lengthwise section  |  girth {P.user_girth_in:.2f} in, "
        f"fit {P.interior_fit_ratio:.2f}  |  silicone "
        f"{product.Volume()/1000:.0f} mL", fontsize=12)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(
        os.path.abspath(__file__)), "renders"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    g = M.solve_geometry()
    cavity = M.build_cavity(g)
    core = M.build_core(g)
    half_a, half_b = M.build_shell(g, cavity,
                                   M.sample_edges(M.exterior_edges(g)))
    product = cavity.cut(core).cut(M.vent_exit_round(g, cavity))

    silicone = (0.50, 0.78, 0.62)
    L, zt, zs = g["L"], g["z_top"], g["z_stem"]

    # 1. finished part, opening up so the flare and bore are visible
    img, proj = render([(mesh(product), silicone)], elev=30, azim=-60,
                       size=(1000, 1300))
    show(img, os.path.join(args.out, "part_iso.png"),
         "Finished silicone sleeve (isometric)", labels=[
             ((g["R_rim"] * 0.7, -g["R_rim"] * 0.7, L),
              f"flared open base, {2*g['R_rim']:.0f} mm rim", (230, -60)),
             ((g["Clip"][0] * 0.3, g["Clip"][0] * 0.7, L - 25),
              f"{2*g['Clip'][0]:.1f} mm opening", (-250, -120)),
             ((-g["a"] * 0.2, -g["a"] * 0.95, g["c"] * 0.5),
              "rounded tip + 3 mm vent", (-260, 60)),
         ], proj=proj)

    # 2. dimensioned section
    part_section(g, product, os.path.join(args.out, "part_section.png"))

    # 3. exploded mold: halves apart on Y, core lifted out on Z
    gap, lift = 75.0, 150.0
    img, proj = render([
        (mesh(half_a, (0, gap, 0), 0.15, 0.15), (0.40, 0.58, 0.86)),
        (mesh(half_b, (0, -gap, 0), 0.15, 0.15), (0.60, 0.72, 0.92)),
        (mesh(core, (0, 0, lift), 0.1, 0.1), (0.90, 0.47, 0.36)),
    ], elev=20, azim=-35, size=(1400, 1500))
    xb, kz = g["xb"], g["keys"][1][1]
    show(img, os.path.join(args.out, "mold_exploded.png"),
         "Mold exploded: half A (cone pins), half B (sockets), core",
         labels=[
             ((0, gap, L * 0.35), "half A: cavity + cone key pins",
              (330, 120)),
             ((xb, gap, kz), "registration cone pin", (230, -40)),
             ((-g["W"] + 3, -gap - 6, L * 0.5), "half B: key sockets",
              (-150, 0)),
             ((xb, -gap - P.flange_half_thick_mm, g["bolt_z"][0]),
              "M4 bolt holes (6)", (190, 60)),
             ((g["r_line"](L * 0.6), 0, L * 0.6 + lift), "core (1\u00b0 draft)",
              (220, 0)),
             ((0, 0, -g["sock"] + lift + 8), "3 mm vent pin", (-190, 10)),
             ((0, -g["r_ear"] + 3, zt + lift + 4), "rest bar + pull-rod stem",
              (-230, -40)),
             ((g["r_g"], -gap, zt), "8 mm sprue + cup", (-150, -130)),
         ], proj=proj)

    print(f"renders written to {args.out}")


if __name__ == "__main__":
    main()
