import path from "path";

/** 是否允许写入项目根目录下的 outputs（本地开发或显式开启） */
export function allowLocalFileOutputs(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_LOCAL_OUTPUTS === "true"
  );
}

/** 按输出日期的年月日：outputs/YYYY-MM-DD */
export function getDatedOutputDir(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return path.join(process.cwd(), "outputs", `${y}-${m}-${day}`);
}

/** 文件名前缀：YYYY-MM-DD_HHmmss */
export function getOutputTimestampPrefix(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}_${h}${min}${s}`;
}
