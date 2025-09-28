import type { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import type { LiteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import type { LiteElement } from "mathjax-full/js/adaptors/lite/Element.js";
import type { LiteText } from "mathjax-full/js/adaptors/lite/Text.js";
import type { LiteDocument } from "mathjax-full/js/adaptors/lite/Document.js";

let mathJaxPromise: Promise<{
  mj: MathDocument<LiteElement, LiteText, LiteDocument>;
  adaptor: LiteAdaptor;
}> | null = null;

async function initMathJax() {
  async function loadMathJax() {
    const [
      { mathjax },
      { TeX },
      { SVG },
      { liteAdaptor },
      { RegisterHTMLHandler },
    ] = await Promise.all([
      import("mathjax-full/js/mathjax.js"),
      import("mathjax-full/js/input/tex.js"),
      import("mathjax-full/js/output/svg.js"),
      import("mathjax-full/js/adaptors/liteAdaptor.js"),
      import("mathjax-full/js/handlers/html.js"),
      import("mathjax-full/js/input/tex/base/BaseConfiguration.js"),
      import("mathjax-full/js/input/tex/ams/AmsConfiguration.js"),
      import("mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js"),
      import("mathjax-full/js/input/tex/mhchem/MhchemConfiguration.js"),
      import("mathjax-full/js/input/tex/physics/PhysicsConfiguration.js"),
      import(
        "mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js"
      ),
    ]);
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const tex = new TeX({
      packages: ["base", "ams", "mathtools", "mhchem", "physics"],
    });
    const svg = new SVG({ fontCache: "none" });
    const mj = mathjax.document("", { InputJax: tex, OutputJax: svg });
    console.log("MathJax loaded");
    return { mj, adaptor };
  }

  if (!mathJaxPromise) {
    mathJaxPromise = loadMathJax();
  }
  return mathJaxPromise;
}

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

export async function latexToSvgDataUrl(
  latex: string,
  opts?: { display?: boolean; encoding?: "base64" | "utf8" },
) {
  const { display = false, encoding = "base64" } = opts || {};
  const { mj, adaptor } = await initMathJax();
  const node = mj.convert(latex, { display });
  const container = adaptor.outerHTML(node as LiteElement);
  const svg = extractSvgString(container);
  return toDataUrl(svg, encoding);
}
