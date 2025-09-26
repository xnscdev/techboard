declare module "mathjax-full/js/mathjax.js" {
  type MathJaxDocument = {
    convert: (latex: string, options: { display: boolean }) => unknown;
  };

  type MathJaxInstance = {
    document: (s: string, obj: unknown) => MathJaxDocument;
  };

  export const mathjax: MathJaxInstance;
}

declare module "mathjax-full/js/input/tex.js";
declare module "mathjax-full/js/input/tex/AllPackages.js";
declare module "mathjax-full/js/output/svg.js";

declare module "mathjax-full/js/adaptors/liteAdaptor.js" {
  type AdaptorInstance = {
    outerHTML: (node: unknown) => string;
  };

  function liteAdaptor(): AdaptorInstance;
}

declare module "mathjax-full/js/handlers/html.js" {
  function RegisterHTMLHandler(adaptor: AdaptorInstance): void;
}
