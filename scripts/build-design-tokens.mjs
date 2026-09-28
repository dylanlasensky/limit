import { readFileSync, writeFileSync } from "node:fs";
const tokens = JSON.parse(
  readFileSync(new URL("../packages/design/tokens.json", import.meta.url), "utf8")
);
function hsl(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255);
  const max = Math.max(...rgb),
    min = Math.min(...rgb),
    d = max - min,
    l = (max + min) / 2;
  let h = 0;
  if (d) {
    const i = rgb.indexOf(max);
    h =
      [
        (rgb[1] - rgb[2]) / d + (rgb[1] < rgb[2] ? 6 : 0),
        (rgb[2] - rgb[0]) / d + 2,
        (rgb[0] - rgb[1]) / d + 4,
      ][i] * 60;
  }
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}
const names = {
  background: "background",
  card: "card",
  foreground: "foreground",
  muted: "muted-foreground",
  primary: "primary",
  primaryText: "primary-foreground",
  border: "border",
};
let css = "/* Generated from packages/design/tokens.json. */\n";
for (const theme of ["dark", "light"])
  css += `${theme === "dark" ? ":root, .dark" : "html.light"} {\n${Object.entries(names)
    .map(([key, name]) => `  --${name}: ${hsl(tokens[theme][key])};`)
    .join("\n")}\n}\n`;
writeFileSync(new URL("../src/design-tokens.css", import.meta.url), css);
