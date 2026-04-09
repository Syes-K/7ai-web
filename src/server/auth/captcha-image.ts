import { randomInt } from "crypto";

const CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";

/**
 * 生成随机验证码文本（不含易混淆字符）；校验时转小写比对。
 */
export function generateCaptchaText(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[randomInt(CHARSET.length)];
  }
  return out;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 纯 SVG 图片（无外部字体文件），输出 data:image/svg+xml;base64,...
 */
export function buildCaptchaSvgDataUri(text: string): string {
  const w = 120;
  const h = 44;
  let lines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = randomInt(w);
    const y1 = randomInt(h);
    const x2 = randomInt(w);
    const y2 = randomInt(h);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,229,255,0.22)" stroke-width="1"/>`;
  }
  const chars = [...text];
  let texts = "";
  chars.forEach((ch, i) => {
    const x = 8 + i * 21;
    const rot = randomInt(17) - 8;
    texts += `<text x="${x}" y="30" font-family="ui-monospace,monospace,sans-serif" font-size="20" fill="#E8EAEF" transform="rotate(${rot} ${x} 22)">${escapeXml(ch)}</text>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect fill="#151A24" width="100%" height="100%"/>${lines}${texts}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
