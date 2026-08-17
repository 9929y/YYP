import { jsx as d, jsxs as i } from "react/jsx-runtime";
function p({ children: s, columns: a, className: e, style: l }) {
  return /* @__PURE__ */ d(
    "div",
    {
      className: ["ds-root", e].filter(Boolean).join(" "),
      style: { ...a ? { "--ds-bento-cols": a } : {}, ...l },
      children: s
    }
  );
}
const c = {
  none: "0",
  sm: "var(--ds-sp-sm)",
  md: "var(--ds-sp-md)",
  lg: "var(--ds-sp-lg)",
  card: "var(--ds-pad-card)"
};
function m({
  children: s,
  as: a = "div",
  padding: e = "card",
  className: l,
  style: n
}) {
  return /* @__PURE__ */ d(
    a,
    {
      className: ["ds-surface", l].filter(Boolean).join(" "),
      style: { padding: c[e], ...n },
      children: s
    }
  );
}
function v({
  children: s,
  size: a = "base",
  tone: e = "fg",
  weight: l = "regular",
  as: n = "p",
  className: t,
  style: r
}) {
  return /* @__PURE__ */ d(
    n,
    {
      className: [
        "ds-text",
        `ds-text--${a}`,
        `ds-text--${e}`,
        `ds-text--${l}`,
        t
      ].filter(Boolean).join(" "),
      style: r,
      children: s
    }
  );
}
function f({
  tabs: s,
  activeId: a,
  onChange: e,
  trailing: l,
  className: n,
  style: t
}) {
  return /* @__PURE__ */ i(
    "nav",
    {
      className: ["ds-nav", n].filter(Boolean).join(" "),
      style: t,
      "aria-label": "View switcher",
      children: [
        /* @__PURE__ */ d("div", { className: "ds-nav__group ds-glass", children: s.map((r) => /* @__PURE__ */ d(
          "button",
          {
            type: "button",
            className: "ds-nav__tab",
            "aria-current": r.id === a ? "page" : void 0,
            onClick: () => e == null ? void 0 : e(r.id),
            children: r.label
          },
          r.id
        )) }),
        l ? /* @__PURE__ */ d("div", { className: "ds-nav__trailing ds-glass", children: l }) : null
      ]
    }
  );
}
function N({
  title: s,
  meta: a,
  children: e,
  href: l,
  tilt: n = 60,
  className: t,
  style: r
}) {
  return /* @__PURE__ */ i("div", { className: "ds-card-stage", children: [
    /* @__PURE__ */ d(
      l ? "a" : "div",
      {
        ...l ? { href: l } : { tabIndex: 0, role: "link" },
        className: ["ds-card", t].filter(Boolean).join(" "),
        style: { "--ds-card-tilt": `${-Math.abs(n)}deg`, ...r },
        "aria-label": a ? `${s} — ${a}` : s,
        children: /* @__PURE__ */ d("div", { className: "ds-card__media", children: e ?? "placeholder" })
      }
    ),
    /* @__PURE__ */ i("div", { className: "ds-card__caption", children: [
      /* @__PURE__ */ d("span", { className: "ds-card__title", children: s }),
      a ? /* @__PURE__ */ d("span", { className: "ds-card__meta", children: a }) : null
    ] })
  ] });
}
function _({ children: s, selected: a, count: e, onClick: l, className: n, style: t }) {
  return /* @__PURE__ */ i(
    l ? "button" : "span",
    {
      ...l ? { type: "button", onClick: l } : {},
      className: ["ds-pill", a && "ds-pill--selected", n].filter(Boolean).join(" "),
      ...a ? { "aria-pressed": !0 } : {},
      style: t,
      children: [
        s,
        e != null ? /* @__PURE__ */ d("span", { children: e }) : null
      ]
    }
  );
}
function b({ label: s, className: a, style: e }) {
  return /* @__PURE__ */ d(
    "span",
    {
      className: ["ds-accent-dot", a].filter(Boolean).join(" "),
      style: e,
      ...s ? { role: "img", "aria-label": s } : { "aria-hidden": !0 }
    }
  );
}
function g({ children: s, columns: a, className: e, style: l }) {
  return /* @__PURE__ */ d(
    "div",
    {
      className: ["ds-bento", e].filter(Boolean).join(" "),
      style: { ...a ? { "--ds-bento-cols": a } : {}, ...l },
      children: s
    }
  );
}
function h({ children: s, w: a = 1, h: e = 1, className: l, style: n }) {
  return /* @__PURE__ */ d(
    "div",
    {
      className: ["ds-bento__cell", l].filter(Boolean).join(" "),
      style: {
        "--ds-cell-w": a,
        "--ds-cell-h": e,
        ...n
      },
      children: s
    }
  );
}
export {
  b as AccentDot,
  g as Bento,
  h as BentoCell,
  N as Card,
  f as GlassNav,
  _ as Pill,
  p as Root,
  m as Surface,
  v as Text
};
//# sourceMappingURL=yanice-ds.js.map
