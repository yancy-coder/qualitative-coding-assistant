/**
 * 生成项目根目录下的最小合法 test.docx（供本地 / API 测试）。
 */
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "test.docx");

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>质性编码测试段落一：受访者表示近期工作任务集中，主观压力感受明显。</w:t></w:r></w:p>
    <w:p><w:r><w:t>质性编码测试段落二：团队例会频率与信息同步方式影响协作效率。</w:t></w:r></w:p>
    <w:p><w:r><w:t>质性编码测试段落三：组织支持感与上级反馈风格会调节员工的投入意愿。</w:t></w:r></w:p>
  </w:body>
</w:document>`;

const zip = new JSZip();
zip.file("[Content_Types].xml", contentTypes);
zip.folder("_rels").file(".rels", rels);
zip.folder("word").file("document.xml", documentXml);

const buf = await zip.generateAsync({ type: "nodebuffer" });
fs.writeFileSync(out, buf);
console.log("Wrote", out);
