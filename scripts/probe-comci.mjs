const ST_HOST = "http://comci.net:4082";
const res = await fetch(`${ST_HOST}/st`, {
  headers: { "User-Agent": "SchoolUtil-probe" },
});
const text = await res.arrayBuffer();
const dec = new TextDecoder("euc-kr").decode(text);
const mainM = dec.match(/\.\/(\d+)\?(\d+)l/);
console.log("main route", mainM?.[1], mainM?.[2]);
const searchUrl = `${ST_HOST}/${mainM[1]}?${mainM[2]}l${encodeURIComponent(encodeURIComponent("이천제일"))}`;
// comci uses double encoding sometimes - try simple
const s2 = await fetch(
  `${ST_HOST}/${mainM[1]}?${mainM[2]}l` +
    Buffer.from("이천제일", "utf8").toString("binary"),
  { headers: { "User-Agent": "SchoolUtil" } },
).catch(() => null);
console.log("search attempt skipped - use proper euc-kr");
