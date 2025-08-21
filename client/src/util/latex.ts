import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: "none" });
const mj = mathjax.document("", { InputJax: tex, OutputJax: svg });

function extractSvgString(html: string) {
  const m = html.match(/<svg[\s\S]*?<\/svg>/i);
  if (!m) {
    throw new Error("Could not find <svg> in MathJax output.");
  }
  return m[0];
}

function toDataUrl(svg: string, mode: "base64" | "utf8" = "base64") {
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace(
      /^<svg/i,
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
    );
  }
  if (mode === "utf8") {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(new TextEncoder().encode(svg))),
  );
  return `data:image/svg+xml;base64,${base64}`;
}

export function latexToSvgDataUrl(
  latex: string,
  opts?: { display?: boolean; encoding?: "base64" | "utf8" },
) {
  const { display = false, encoding = "base64" } = opts || {};
  const node = mj.convert(latex, { display });
  const container = adaptor.outerHTML(node);
  const svg = extractSvgString(container);
  return toDataUrl(svg, encoding);
}
