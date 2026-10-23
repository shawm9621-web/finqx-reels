const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function pad(n) {
  return String(n).padStart(4, "0");
}

async function main() {
  const res = await fetch(process.env.MANIFEST_URL + "?t=" + Date.now());
  if (!res.ok) {
    throw new Error("manifest failed " + res.status);
  }
  const d = await res.json();

  d.bg = null;
  try {
    const topic = encodeURIComponent(
      "soft abstract colorful bokeh gradient background, glowing lights, modern finance, no text, no people, vertical"
    );
    const seed = Math.floor(Math.random() * 100000);
    const pu = "https://image.pollinations.ai/prompt/" + topic + "?width=1080&height=1920&nologo=true&seed=" + seed;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 70000);
    const br = await fetch(pu, { signal: ctrl.signal });
    clearTimeout(timer);
    if (br.ok) {
      const buf = Buffer.from(await br.arrayBuffer());
      if (buf.length > 20000) {
        d.bg = "data:image/jpeg;base64," + buf.toString("base64");
        console.log("background ok");
      } else {
        console.log("background too small, skipped");
      }
    } else {
      console.log("background status " + br.status + ", skipped");
    }
  } catch (e) {
    console.log("background skipped");
  }

  const copy = Object.assign({}, d);
  delete copy.bg;
  fs.writeFileSync("manifest.json", JSON.stringify(copy));

  fs.mkdirSync("frames", { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto("file://" + path.resolve("reel.html"), { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((x) => window.build(x), d);
  await new Promise((r) => setTimeout(r, 800));

  const total = 15 * 25;
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.draw(t), i / 25);
    await page.screenshot({
      path: "frames/f" + pad(i) + ".jpg",
      type: "jpeg",
      quality: 92,
    });
  }
  await browser.close();
  console.log("frames done: " + total);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
