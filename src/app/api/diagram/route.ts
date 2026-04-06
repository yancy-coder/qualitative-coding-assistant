import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { AxialCode, SelectiveCode } from "@/lib/qualitative/types";
import {
  allowLocalFileOutputs,
  getDatedOutputDir,
  getOutputTimestampPrefix,
} from "@/lib/server/localOutputs";
import {
  getOpenRouterDefaultHeaders,
  normalizeOpenRouterApiKey,
  normalizeOpenRouterBaseUrl,
  proxyDispatcherInit,
} from "@/lib/server/openrouter";
import { fetch as undiciFetch } from "undici";

const DEFAULT_IMAGE_MODEL = "google/gemini-3-pro-image-preview";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const apiKey = normalizeOpenRouterApiKey(process.env.OPENROUTER_API_KEY);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY" },
        { status: 500 },
      );
    }

    const { axialCodes, selectiveCodes } = (await req.json()) as {
      axialCodes: AxialCode[];
      selectiveCodes: SelectiveCode[];
    };

    const model =
      process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
    const baseURL = normalizeOpenRouterBaseUrl(
      process.env.OPENROUTER_BASE_URL,
    );
    const imageSize =
      process.env.OPENROUTER_IMAGE_SIZE?.trim() || "2K";
    const aspectRatio =
      process.env.OPENROUTER_IMAGE_ASPECT_RATIO?.trim() || "4:3";

    const prompt = buildImagePrompt(axialCodes, selectiveCodes);

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: aspectRatio,
        image_size: imageSize,
      },
    };

    const headers = getOpenRouterDefaultHeaders(apiKey);

    const res = await undiciFetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      ...proxyDispatcherInit(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("OpenRouter error:", res.status, errBody);
      if (res.status === 401) {
        return NextResponse.json(
          {
            error:
              "OpenRouter 认证失败（401）：密钥无效、已撤销或账号异常。请到 openrouter.ai/keys 重新生成密钥，确认账户有余额；检查 .env 中 OPENROUTER_API_KEY 整行无引号、无多余空格，且勿在聊天/仓库中泄露密钥。",
          },
          { status: 502 },
        );
      }
      if (res.status === 403) {
        const regionBlocked =
          /not available in your region|region/i.test(errBody);
        return NextResponse.json(
          {
            error: regionBlocked
              ? "OpenRouter 地区限制（403）：当前模型在你所在网络地区不可用，与余额无关。可尝试：更换网络/VPN 出口；或在 .env 设置 OPENROUTER_IMAGE_MODEL 为其它支持生图的模型（见 openrouter.ai/models，筛选 Image 输出）。本地可运行 npm run test:openrouter 查看详细 HTTP 状态。"
              : `OpenRouter 403：${errBody.slice(0, 400)}`,
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: `OpenRouter ${res.status}: ${errBody.slice(0, 300)}` },
        { status: 502 },
      );
    }

    type ImageEntry = {
      image_url?: { url?: string };
      imageUrl?: { url?: string };
    };
    const data = (await res.json()) as {
      choices?: Array<{ message?: { images?: ImageEntry[] } }>;
    };
    const images = data?.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      console.error("No images in response:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: "模型未返回图片，请重试" },
        { status: 502 },
      );
    }

    const imageDataUrl: string =
      images[0]?.image_url?.url ?? images[0]?.imageUrl?.url ?? "";
    if (!imageDataUrl.startsWith("data:image")) {
      return NextResponse.json(
        { error: "返回的图片格式异常" },
        { status: 502 },
      );
    }

    void savePngToOutputs(imageDataUrl);

    return NextResponse.json({ imageDataUrl });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Diagram generation failed";
    console.error("Diagram error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function savePngToOutputs(dataUrl: string): Promise<void> {
  if (!allowLocalFileOutputs()) return;
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;
    const buf = Buffer.from(base64, "base64");
    const dir = getDatedOutputDir();
    await mkdir(dir, { recursive: true });
    const name = `${getOutputTimestampPrefix()}_framework_diagram.png`;
    await writeFile(path.join(dir, name), buf);
  } catch {
    /* best-effort */
  }
}

function buildImagePrompt(
  axialCodes: AxialCode[],
  selectiveCodes: SelectiveCode[],
): string {
  const coreCategories = selectiveCodes
    .map((s) => s.core_category)
    .join("、");
  const storyline = selectiveCodes.map((s) => s.storyline).join("\n");

  const nodes = axialCodes.map(
    (a) =>
      `- 「${a.category}」（${paradigmSlotLabel(a.paradigm_slot)}）：${a.relationship_description}`,
  );

  return `请为我绘制一张学术论文级别的扎根理论（Grounded Theory）理论框架图。

## 编码数据

核心范畴：${coreCategories}

故事线：
${storyline}

主轴编码节点与范式维度：
${nodes.join("\n")}

## 绘图要求
1. 绘制一张清晰、专业的学术理论框架关系图（concept map / theoretical framework diagram）
2. 核心范畴放在图的中心位置，用醒目的矩形框或双线框突出
3. 按 Strauss & Corbin 编码范式组织布局：因果条件 → 现象 → 脉络条件/中介条件 → 行动策略 → 结果
4. 所有标签和文字使用中文
5. 使用箭头表示范畴间的因果、影响、调节关系，箭头上可标注关系说明
6. 风格：白色或浅灰背景，黑色文字，简洁线条，无装饰性图案；适合直接放入学术论文
7. 布局对称、层次分明，避免交叉线条
8. 不要输出任何代码或文字说明，只生成图片`;
}

function paradigmSlotLabel(slot: string): string {
  const map: Record<string, string> = {
    causal_cond: "因果条件",
    phenomenon: "现象",
    context: "脉络条件",
    intervening: "中介条件",
    strategy: "行动策略",
    consequence: "结果",
    other: "其他",
  };
  return map[slot] ?? slot;
}
