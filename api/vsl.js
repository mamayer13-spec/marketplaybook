/* Liefert den VSL für /form (eigener Player statt Vidalytics, 11.11.2026).
   Der R2-Bucket ist absichtlich privat (dort liegen auch die bezahlten App-Videos),
   deshalb keine öffentliche Adresse: diese Funktion leitet auf eine signierte
   Adresse weiter, die 12 Stunden gilt. Ausgeliefert wird direkt von Cloudflare.
   Ohne Abhängigkeiten: die AWS-Signatur (SigV4, Query-Variante) steht unten von Hand.
   Envs im Vercel-Projekt: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME. */
const crypto = require("crypto");

const VIDEOS = { lang: "vsl/vsl-lang-2026-11-11.mp4" };
const GUELTIG_S = 12 * 3600;

const hmac = (k, s) => crypto.createHmac("sha256", k).update(s).digest();
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function signiert(key, jetzt = new Date()) {
  const { R2_ACCOUNT_ID: konto, R2_ACCESS_KEY_ID: ak, R2_SECRET_ACCESS_KEY: sk, R2_BUCKET_NAME: bucket } = process.env;
  if (!konto || !ak || !sk || !bucket) throw new Error("R2-Envs fehlen");
  const host = `${konto}.r2.cloudflarestorage.com`;
  const amz = jetzt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const tag = amz.slice(0, 8);
  const scope = `${tag}/auto/s3/aws4_request`;
  const pfad = "/" + [bucket, ...key.split("/")].map(enc).join("/");
  const q = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${ak}/${scope}`],
    ["X-Amz-Date", amz],
    ["X-Amz-Expires", String(GUELTIG_S)],
    ["X-Amz-SignedHeaders", "host"],
  ].map(([k, v]) => `${enc(k)}=${enc(v)}`).sort().join("&");
  const kanon = ["GET", pfad, q, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const zuSignieren = ["AWS4-HMAC-SHA256", amz, scope, sha(kanon)].join("\n");
  const schl = hmac(hmac(hmac(hmac("AWS4" + sk, tag), "auto"), "s3"), "aws4_request");
  const sig = crypto.createHmac("sha256", schl).update(zuSignieren).digest("hex");
  return `https://${host}${pfad}?${q}&X-Amz-Signature=${sig}`;
}

module.exports = (req, res) => {
  const key = VIDEOS[(req.query && req.query.v) || "lang"];
  if (!key) { res.statusCode = 404; return res.end("Unbekanntes Video"); }
  try {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    res.statusCode = 302;
    res.setHeader("Location", signiert(key));
    res.end();
  } catch (e) {
    res.statusCode = 500; res.end("Video gerade nicht verfügbar");
  }
};
module.exports.signiert = signiert;
