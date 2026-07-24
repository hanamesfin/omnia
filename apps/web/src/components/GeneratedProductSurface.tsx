"use client";

import { useMemo } from "react";

export type GeneratedProductSurfaceProps = {
  files: Record<string, string>;
  pageId: string;
  productName: string;
  /** CSS variables from the agent design system for iframe chrome */
  cssVars?: Record<string, string>;
};

function pickEntry(files: Record<string, string>, pageId: string): string {
  const keys = Object.keys(files);
  const lower = Object.fromEntries(keys.map((k) => [k.toLowerCase(), k]));
  const pageNeedle = pageId.replace(/_/g, "").toLowerCase();

  const preferred = [
    "src/App.tsx",
    "src/app.tsx",
    "App.tsx",
    "app.tsx",
    "src/pages/App.tsx",
    "src/main.tsx",
  ];
  for (const p of preferred) {
    if (lower[p.toLowerCase()]) return lower[p.toLowerCase()];
  }

  for (const k of keys) {
    const base = k.split("/").pop()?.replace(/\.(tsx|jsx|ts|js)$/i, "") || "";
    if (base.replace(/_/g, "").toLowerCase() === pageNeedle) return k;
  }

  const pageLike = keys.find((k) => /page|screen|view/i.test(k));
  if (pageLike) return pageLike;

  return keys[0] || "src/App.tsx";
}

/**
 * Build a sandboxed iframe document that runs generated React+Tailwind TSX
 * via Babel standalone — no host-page eval. External packages are stubbed.
 */
export function buildGeneratedSrcDoc(
  files: Record<string, string>,
  pageId: string,
  productName: string,
  cssVars?: Record<string, string>
): string {
  const entry = pickEntry(files, pageId);
  const fileJson = JSON.stringify(files);
  const entryJson = JSON.stringify(entry);
  const nameJson = JSON.stringify(productName);
  const varsStyle = Object.entries(cssVars || {})
    .map(([k, v]) => `${k}:${String(v).replace(/;/g, "")}`)
    .join(";");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${String(productName).replace(/</g, "")}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.26.9/babel.min.js"></script>
  <style>
    html, body, #root { height: 100%; margin: 0; }
    body { ${varsStyle}; background: var(--pf-bg, #f6f5f2); color: var(--pf-fg, #141414);
      font-family: var(--pf-font-body, system-ui, sans-serif); }
    .gen-error { padding: 1.5rem; font: 13px/1.45 ui-monospace, monospace; color: #b91c1c; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__GEN_FILES__ = ${fileJson};
    window.__GEN_ENTRY__ = ${entryJson};
    window.__GEN_NAME__ = ${nameJson};
  </script>
  <script>
    (function () {
      var files = window.__GEN_FILES__ || {};
      var entry = window.__GEN_ENTRY__;
      var React = window.React;
      var ReactDOM = window.ReactDOM;
      var Babel = window.Babel;

      function stubIcon(name) {
        return function Icon(props) {
          return React.createElement(
            "span",
            Object.assign({ "aria-hidden": true, "data-icon": name }, props),
            "◇"
          );
        };
      }

      function resolveKey(from, spec) {
        if (!spec.startsWith(".")) return null;
        var base = from.split("/");
        base.pop();
        spec.split("/").forEach(function (seg) {
          if (seg === "." || !seg) return;
          if (seg === "..") base.pop();
          else base.push(seg);
        });
        var path = base.join("/");
        var keys = Object.keys(files);
        var candidates = [path, path + ".tsx", path + ".jsx", path + ".ts", path + ".js", path + "/index.tsx"];
        for (var i = 0; i < candidates.length; i++) {
          var c = candidates[i];
          if (files[c]) return c;
          var hit = keys.find(function (k) { return k.toLowerCase() === c.toLowerCase(); });
          if (hit) return hit;
        }
        return null;
      }

      function rewriteSource(fromPath, source) {
        var out = String(source || "");
        // Strip type-only imports
        out = out.replace(/^\\s*import\\s+type\\s+[^;]+;?\\s*$/gm, "");
        // lucide-react → stub icons
        out = out.replace(
          /import\\s*\\{([^}]+)\\}\\s*from\\s*['"]lucide-react['"]\\s*;?/g,
          function (_m, names) {
            return String(names)
              .split(",")
              .map(function (n) {
                var id = n.trim().split(/\\s+as\\s+/).pop().trim();
                if (!id) return "";
                return "const " + id + " = (props) => React.createElement('span', Object.assign({'data-icon':'" + id + "','aria-hidden':true}, props), '◇');";
              })
              .join("\\n");
          }
        );
        // Other external packages → empty module
        out = out.replace(
          /import\\s+([^;]+?)\\s+from\\s*['"](?!\\.\\.\\/|\\.\\/)[^'"]+['"]\\s*;?/g,
          function (_m, clause) {
            var c = String(clause).trim();
            if (c.startsWith("{")) {
              return String(c.slice(1, -1))
                .split(",")
                .map(function (n) {
                  var id = n.trim().split(/\\s+as\\s+/).pop().trim();
                  if (!id || id === "default") return "";
                  return "const " + id + " = () => null;";
                })
                .join("\\n");
            }
            if (c === "React" || c === "* as React") return "";
            var def = c.split(/\\s+as\\s+/).pop().trim();
            return def ? "const " + def + " = {};" : "";
          }
        );
        // Relative imports → __req("path")
        out = out.replace(
          /import\\s+([^;]+?)\\s+from\\s*['"](\\.[^'"]+)['"]\\s*;?/g,
          function (_m, clause, rel) {
            var resolved = resolveKey(fromPath, rel) || rel;
            var c = String(clause).trim();
            if (c.startsWith("{")) {
              return "const " + c + " = __req(" + JSON.stringify(resolved) + ");";
            }
            if (c.startsWith("* as ")) {
              var ns = c.slice(5).trim();
              return "const " + ns + " = __req(" + JSON.stringify(resolved) + ");";
            }
            return "const " + c + " = (__req(" + JSON.stringify(resolved) + ").default || __req(" + JSON.stringify(resolved) + "));";
          }
        );
        // export default
        out = out.replace(/export\\s+default\\s+/g, "exports.default = ");
        // named exports
        out = out.replace(/export\\s+(const|function|class)\\s+/g, "$1 ");
        out = out.replace(/export\\s*\\{([^}]+)\\}\\s*;?/g, function (_m, names) {
          return String(names)
            .split(",")
            .map(function (n) {
              var parts = n.trim().split(/\\s+as\\s+/);
              var local = parts[0].trim();
              var exp = (parts[1] || parts[0]).trim();
              return "exports[" + JSON.stringify(exp) + "] = " + local + ";";
            })
            .join("\\n");
        });
        return out;
      }

      var cache = {};
      function __req(id) {
        var keys = Object.keys(files);
        var key = files[id] ? id : keys.find(function (k) { return k.toLowerCase() === String(id).toLowerCase(); });
        if (!key || !files[key]) {
          return { default: function Missing() { return React.createElement("div", null, "Missing " + id); } };
        }
        if (cache[key]) return cache[key].exports;
        var module = { exports: {} };
        cache[key] = module;
        var raw = rewriteSource(key, files[key]);
        var transformed;
        try {
          transformed = Babel.transform(raw, {
            presets: [["react", { runtime: "classic" }], ["typescript", { isTSX: true, allExtensions: true }]],
            filename: key,
          }).code;
        } catch (err) {
          module.exports.default = function Err() {
            return React.createElement("div", { className: "gen-error" }, String(err && err.message || err));
          };
          return module.exports;
        }
        try {
          var fn = new Function("React", "ReactDOM", "exports", "module", "__req", transformed + "\\n; if (module.exports && !module.exports.default && typeof App !== 'undefined') { module.exports.default = App; }");
          fn(React, ReactDOM, module.exports, module, __req);
        } catch (err) {
          module.exports.default = function Err() {
            return React.createElement("div", { className: "gen-error" }, String(err && err.message || err));
          };
        }
        return module.exports;
      }

      try {
        var mod = __req(entry);
        var App = mod.default || mod.App || Object.values(mod).find(function (v) { return typeof v === "function"; });
        if (!App) {
          throw new Error("No default export in " + entry);
        }
        var root = ReactDOM.createRoot(document.getElementById("root"));
        root.render(React.createElement(App, { productName: window.__GEN_NAME__, pageId: ${JSON.stringify(pageId)} }));
      } catch (err) {
        document.getElementById("root").innerHTML = '<div class="gen-error">' +
          String(err && err.message || err).replace(/</g, "&lt;") + "</div>";
      }
    })();
  </script>
</body>
</html>`;
}

export function GeneratedProductSurface({
  files,
  pageId,
  productName,
  cssVars,
}: GeneratedProductSurfaceProps) {
  const srcDoc = useMemo(
    () => buildGeneratedSrcDoc(files, pageId, productName, cssVars),
    [files, pageId, productName, cssVars]
  );

  return (
    <iframe
      title={`${productName} generated UI`}
      className="h-full min-h-0 w-full flex-1 border-0 bg-transparent"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
    />
  );
}
