export interface PortableNotebookPage {
  pageNumber: number;
  content: string;
}

export function notebookExportFilename(title: string, suffix: string, extension: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "caderno";
  return `${slug}${suffix ? `-${suffix}` : ""}.${extension}`;
}

export function notebookHtmlToPlainText(html: string) {
  const parsed = new DOMParser().parseFromString(html || "", "text/html");
  parsed.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  parsed.querySelectorAll("p, h1, h2, h3, li, blockquote").forEach((node) => node.append("\n"));
  return (parsed.body.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function notebookToPlainText(title: string, pages: PortableNotebookPage[]) {
  return [title, ...pages.map((page) => `\nPÁGINA ${page.pageNumber}\n\n${notebookHtmlToPlainText(page.content)}`)].join("\n").trim();
}

export function notebookToMarkdown(title: string, pages: PortableNotebookPage[]) {
  const pageMarkdown = pages.map((page) => {
    const parsed = new DOMParser().parseFromString(page.content || "", "text/html");
    parsed.querySelectorAll("img").forEach((image) => {
      const replacement = parsed.createTextNode(`\n![${image.getAttribute("alt") || "Imagem"}](${image.getAttribute("src") || ""})\n`);
      image.replaceWith(replacement);
    });
    parsed.querySelectorAll("h1, h2, h3").forEach((heading) => {
      const level = Number(heading.tagName.slice(1));
      heading.replaceWith(parsed.createTextNode(`\n${"#".repeat(level)} ${heading.textContent?.trim() || ""}\n`));
    });
    parsed.querySelectorAll("li").forEach((item) => item.replaceWith(parsed.createTextNode(`\n- ${item.textContent?.trim() || ""}`)));
    parsed.querySelectorAll("blockquote").forEach((quote) => quote.replaceWith(parsed.createTextNode(`\n> ${(quote.textContent || "").trim()}\n`)));
    parsed.querySelectorAll("strong").forEach((strong) => strong.replaceWith(parsed.createTextNode(`**${strong.textContent || ""}**`)));
    parsed.querySelectorAll("em").forEach((emphasis) => emphasis.replaceWith(parsed.createTextNode(`*${emphasis.textContent || ""}*`)));
    parsed.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
    parsed.querySelectorAll("p").forEach((paragraph) => paragraph.append("\n\n"));
    return `## Página ${page.pageNumber}\n\n${(parsed.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim()}`;
  });
  return `# ${title}\n\n${pageMarkdown.join("\n\n---\n\n")}\n`;
}

export function buildStandaloneNotebookHtml(title: string, pages: PortableNotebookPage[]) {
  const sections = pages.map((page) => `<section class="page"><div class="page-number">Página ${page.pageNumber}</div>${page.content || "<p></p>"}</section>`).join("\n");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>
body{margin:0;background:#eef1ef;color:#18231f;font-family:Arial,sans-serif}.document{max-width:900px;margin:32px auto}.page{box-sizing:border-box;min-height:1123px;margin:0 0 24px;padding:72px 76px;background:#fff;border-radius:8px;box-shadow:0 12px 38px #21362c1c}.page-number{margin-bottom:24px;color:#6d8179;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}h1,h2,h3{font-family:Georgia,serif;color:#173c32}h1{font-size:34px}h2{margin-top:28px;font-size:23px}p,li{font-size:16px;line-height:1.65}img{display:block;max-width:100%;max-height:620px;margin:24px auto;object-fit:contain;background:transparent}blockquote{margin:22px 0;padding:16px 20px;border-left:4px solid #4b8b76;background:#eef6f2}@media print{body{background:#fff}.document{margin:0;max-width:none}.page{min-height:100vh;margin:0;box-shadow:none;break-after:page}}
</style></head><body><main class="document">${sections}</main></body></html>`;
}

export async function embedNotebookImages(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(parsed.images);
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute("src");
    if (!source || source.startsWith("data:")) return;
    try {
      const response = await fetch(source);
      if (!response.ok) return;
      image.setAttribute("src", await blobToDataUrl(await response.blob()));
    } catch { /* mantém o endereço original se a imagem não puder ser incorporada */ }
  }));
  return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
}

export function downloadNotebookBlob(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]!));
}
