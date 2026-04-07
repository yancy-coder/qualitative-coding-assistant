import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { Segment } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
  trimValues: false,
});

type XmlNode = Record<string, unknown>;

function collectText(node: XmlNode): string {
  const parts: string[] = [];

  for (const [tag, value] of Object.entries(node)) {
    if (tag === ":@" || tag === "#text") continue;

    if (tag === "w:t") {
      const children = Array.isArray(value) ? value : [value];
      for (const child of children as XmlNode[]) {
        if (typeof child === "string") {
          parts.push(child);
        } else if (child && typeof child === "object" && "#text" in child) {
          parts.push(String(child["#text"]));
        }
      }
      continue;
    }

    if (tag === "w:tab") {
      parts.push("\t");
      continue;
    }

    if (tag === "w:br") {
      parts.push("\n");
      continue;
    }

    if (tag === "w:rPr" || tag === "w:pPr" || tag === "w:sectPr") continue;

    if (value && typeof value === "object") {
      const children = Array.isArray(value) ? value : [value];
      for (const child of children as XmlNode[]) {
        parts.push(collectText(child));
      }
    }
  }

  return parts.join("");
}

function extractParagraphs(nodes: XmlNode[]): string[] {
  const paragraphs: string[] = [];

  for (const node of nodes) {
    if ("w:p" in node) {
      const children = Array.isArray(node["w:p"]) ? node["w:p"] : [node["w:p"]];
      const text = (children as XmlNode[]).map((c) => collectText(c)).join("");
      paragraphs.push(text);
      continue;
    }

    if ("w:tbl" in node) {
      const tbl = Array.isArray(node["w:tbl"]) ? node["w:tbl"] : [node["w:tbl"]];
      for (const row of tbl as XmlNode[]) {
        if ("w:tr" in row) {
          const tr = Array.isArray(row["w:tr"]) ? row["w:tr"] : [row["w:tr"]];
          for (const cell of tr as XmlNode[]) {
            if ("w:tc" in cell) {
              const tc = Array.isArray(cell["w:tc"])
                ? cell["w:tc"]
                : [cell["w:tc"]];
              paragraphs.push(...extractParagraphs(tc as XmlNode[]));
            }
          }
        }
      }
      continue;
    }

    for (const [tag, value] of Object.entries(node)) {
      if (tag === ":@" || tag === "#text") continue;
      if (value && typeof value === "object") {
        const children = Array.isArray(value) ? value : [value];
        paragraphs.push(...extractParagraphs(children as XmlNode[]));
      }
    }
  }

  return paragraphs;
}

export async function parseDocxToSegments(
  buffer: Buffer,
  sourceFile: string,
): Promise<Segment[]> {
  const zip = await JSZip.loadAsync(buffer);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error(`${sourceFile}: word/document.xml not found in docx`);
  }

  const xml = await docXmlFile.async("string");
  const parsed = parser.parse(xml) as XmlNode[];

  let bodyNodes: XmlNode[] = [];
  for (const root of parsed) {
    if ("w:document" in root) {
      const doc = Array.isArray(root["w:document"])
        ? root["w:document"]
        : [root["w:document"]];
      for (const d of doc as XmlNode[]) {
        if ("w:body" in d) {
          bodyNodes = Array.isArray(d["w:body"])
            ? (d["w:body"] as XmlNode[])
            : [d["w:body"] as XmlNode];
          break;
        }
      }
      break;
    }
  }

  const allParagraphs = extractParagraphs(bodyNodes);

  const nonEmpty = allParagraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const rawText = nonEmpty.join("\n");
  const segments: Segment[] = [];
  let charOffset = 0;

  for (let i = 0; i < nonEmpty.length; i++) {
    const text = nonEmpty[i];
    const start = rawText.indexOf(text, charOffset);
    segments.push({
      segment_id: `${sourceFile}__seg_${String(i + 1).padStart(4, "0")}`,
      source_file: sourceFile,
      paragraph_index: i + 1,
      verbatim: text,
      char_start: start,
      char_end: start + text.length,
    });
    charOffset = start + text.length;
  }

  return segments;
}
