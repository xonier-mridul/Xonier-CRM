"use client";

import { useEffect, useState } from "react";

const layoutTags = new Set(
  "a abbr address article b bdi bdo blockquote br caption center cite code col colgroup dd del div dl dt em font footer h1 h2 h3 h4 h5 h6 header hr i img ins li main mark ol p pre s section small span strike strong style sub sup table tbody td tfoot th thead tr u ul wbr".split(" "),
);
const layoutAttributes = new Set(
  "align alt bgcolor border cellpadding cellspacing class color colspan dir face height id lang rowspan size style title valign width".split(" "),
);

function createEmailDocument(html: string) {
  // Template contents are inert, so inspecting the email does not fetch its images.
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, iframe, object, embed, svg, math, template, noscript, title, meta, link, base").forEach(element => element.remove());

  for (const element of Array.from(template.content.querySelectorAll("*"))) {
    const tag = element.localName;
    if (!layoutTags.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const href = element.getAttribute("href")?.trim() ?? "";
    const src = element.getAttribute("src")?.trim() ?? "";
    const background = element.getAttribute("background")?.trim() ?? "";
    for (const attribute of Array.from(element.attributes)) {
      if (!layoutAttributes.has(attribute.name)) element.removeAttribute(attribute.name);
    }

    if (tag === "a" && /^(https?:\/\/|mailto:)/i.test(href)) {
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
    if (tag === "img") {
      if (/^https:\/\//i.test(src) || /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(src)) {
        element.setAttribute("src", src);
      }
    }
    if (/^https:\/\//i.test(background)) {
      element.setAttribute("background", background);
    }
  }

  // The isolated frame allows HTTPS images and blocks scripts and external CSS.
  return `<!doctype html><html><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'">
      <meta name="referrer" content="no-referrer">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{margin:0;background:#fff;color:#1f2937;font:14px/1.5 Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%}</style>
      </head><body>${template.innerHTML}</body></html>`;
}

export default function EmailBody({ text, html }: { text: string; html?: string | null }) {
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    if (html?.trim()) setPreview(createEmailDocument(html));
  }, [html]);

  if (!html?.trim()) {
    return <p className="min-h-40 whitespace-pre-wrap py-6 text-sm leading-7 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{text || "No readable message text."}</p>;
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {preview && (
        <iframe
          title="Email content"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          srcDoc={preview}
          className="block h-[min(65vh,720px)] min-h-64 w-full bg-white"
        />
      )}
    </div>
  );
}
