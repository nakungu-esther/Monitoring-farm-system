/**
 * Builds AgriTrack-pitch.pptx for Google Slides:
 * Google Drive → Upload → Open with → Google Slides (fully editable).
 *
 * Run: npm run pitch:pptx
 * Output: public/AgriTrack-pitch.pptx
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pub = path.join(root, "public");

const img = (rel) => path.join(pub, ...rel.split("/"));

const pptx = new pptxgen();
pptx.author = "Esther Nakungu";
pptx.title = "AgriTrack — Pitch";
pptx.subject = "Remote farm monitoring & financial trust";
pptx.defineLayout({ name: "AGRI_16_9", width: 10, height: 5.625 });
pptx.layout = "AGRI_16_9";

const GREEN = "14532d";
const GREEN_LIGHT = "166534";
const WHITE = "FFFFFF";
const SLATE = "334155";

function coverSlide(title, lines, extra = []) {
  const s = pptx.addSlide();
  s.background = { color: GREEN };
  try {
    s.addImage({
      path: img("logo.png"),
      x: 0.5,
      y: 0.45,
      w: 0.85,
      h: 0.85,
    });
  } catch {
    /* optional */
  }
  s.addText("AgriTrack", {
    x: 1.45,
    y: 0.55,
    w: 8,
    h: 0.5,
    fontSize: 28,
    bold: true,
    color: WHITE,
    fontFace: "Calibri",
  });
  s.addText(title, {
    x: 0.5,
    y: 1.45,
    w: 9,
    h: 1.2,
    fontSize: 30,
    bold: true,
    color: WHITE,
    fontFace: "Calibri",
  });
  let y = 2.85;
  for (const line of lines) {
    s.addText(line, {
      x: 0.5,
      y,
      w: 9,
      h: 0.55,
      fontSize: 14,
      color: "E2E8F0",
      fontFace: "Calibri",
    });
    y += 0.52;
  }
  for (const t of extra) {
    s.addText(t, {
      x: 0.5,
      y: y + 0.2,
      w: 9,
      h: 0.5,
      fontSize: 11,
      color: "CBD5E1",
      italic: true,
      fontFace: "Calibri",
    });
    y += 0.55;
  }
  return s;
}

function contentSlide(label, title, bodyLines, opts = {}) {
  const s = pptx.addSlide();
  s.background = { color: "ECFDF5" };
  s.addText(label.toUpperCase(), {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.35,
    fontSize: 10,
    color: GREEN_LIGHT,
    bold: true,
    fontFace: "Calibri",
  });
  s.addText(title, {
    x: 0.5,
    y: 0.65,
    w: 9,
    h: 0.55,
    fontSize: 26,
    bold: true,
    color: GREEN,
    fontFace: "Calibri",
  });
  const items = bodyLines.map((t) => ({
    text: t,
    options: { bullet: { type: "bullet" }, color: SLATE, fontSize: 14, fontFace: "Calibri" },
  }));
  s.addText(items, {
    x: 0.55,
    y: 1.3,
    w: 9,
    h: opts.bodyH ?? 3.8,
    valign: "top",
  });
  if (opts.footer) {
    s.addText(opts.footer, {
      x: 0.55,
      y: 4.35,
      w: 9,
      h: 0.45,
      fontSize: 14,
      bold: true,
      color: GREEN_LIGHT,
      fontFace: "Calibri",
    });
  }
  if (opts.quote) {
    s.addText(opts.quote, {
      x: 0.55,
      y: opts.footer ? 4.85 : 4.2,
      w: 9,
      h: 0.85,
      fontSize: 13,
      color: "92400E",
      fill: { color: "FEF3C7" },
      fontFace: "Calibri",
    });
  }
  return s;
}

/** Visual flow for Google Slides import (table cells, not HTML). */
function howItWorksSlide() {
  const s = pptx.addSlide();
  s.background = { color: "ECFDF5" };
  s.addText("ARCHITECTURE", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.35,
    fontSize: 10,
    color: GREEN_LIGHT,
    bold: true,
    fontFace: "Calibri",
  });
  s.addText("How it works", {
    x: 0.5,
    y: 0.65,
    w: 9,
    h: 0.55,
    fontSize: 26,
    bold: true,
    color: GREEN,
    fontFace: "Calibri",
  });
  s.addText("One connected flow from field to chain to oversight.", {
    x: 0.45,
    y: 1.05,
    w: 9.1,
    h: 0.35,
    fontSize: 12,
    color: SLATE,
    fontFace: "Calibri",
  });

  const border = { type: "solid", pt: 0.5, color: "94A3B8" };
  const mid = { valign: "middle", align: "center", fontFace: "Calibri" };

  const rows = [
    [
      {
        text: "Login",
        options: {
          ...mid,
          fill: { color: "E2E8F0" },
          bold: true,
          fontSize: 11,
          color: SLATE,
          border,
        },
      },
      {
        text: "→",
        options: { ...mid, fontSize: 14, color: SLATE, border },
      },
      {
        text: "Role identified",
        options: {
          ...mid,
          fill: { color: "E2E8F0" },
          bold: true,
          fontSize: 11,
          color: SLATE,
          border,
        },
      },
    ],
    [
      {
        text: "↓",
        options: {
          ...mid,
          colspan: 3,
          fontSize: 13,
          color: SLATE,
          border,
        },
      },
    ],
    [
      {
        text: "Farmer\n• Input, farm logs & harvests\n• Stock updates",
        options: {
          ...mid,
          fill: { color: "BBF7D0" },
          fontSize: 10,
          color: GREEN,
          border,
        },
      },
      {
        text: "Trader\n• Sales & purchases\n• Payments on Sui",
        options: {
          ...mid,
          fill: { color: "BFDBFE" },
          fontSize: 10,
          color: "1E3A8A",
          border,
        },
      },
      {
        text: "Admin\n• Live dashboard\n• Monitoring & alerts",
        options: {
          ...mid,
          fill: { color: "CBD5E1" },
          fontSize: 10,
          color: "0F172A",
          border,
        },
      },
    ],
    [
      {
        text: "↓",
        options: {
          ...mid,
          colspan: 3,
          fontSize: 13,
          color: SLATE,
          border,
        },
      },
    ],
    [
      {
        text: "Blockchain transaction",
        options: {
          ...mid,
          colspan: 3,
          fill: { color: "DDD6FE" },
          bold: true,
          fontSize: 11,
          color: "5B21B6",
          border,
        },
      },
    ],
    [
      {
        text: "↓",
        options: {
          ...mid,
          colspan: 3,
          fontSize: 13,
          color: SLATE,
          border,
        },
      },
    ],
    [
      {
        text: "System updates → Alerts → Admin action",
        options: {
          ...mid,
          colspan: 3,
          fill: { color: "F1F5F9" },
          fontSize: 11,
          color: SLATE,
          border,
        },
      },
    ],
  ];

  s.addTable(rows, {
    x: 0.45,
    y: 1.32,
    w: 9.1,
    h: 3.55,
    colW: [3.03, 3.03, 3.03],
    border,
    fontSize: 10,
  });
  return s;
}

function imageSlide(label, title, caption, imageRel) {
  const s = pptx.addSlide();
  s.background = { color: "F8FAFC" };
  const labelColor = label.toLowerCase().includes("trust") ? "6D28D9" : GREEN_LIGHT;
  s.addText(label.toUpperCase(), {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: labelColor,
    bold: true,
    fontFace: "Calibri",
  });
  s.addText(title, {
    x: 0.5,
    y: 0.55,
    w: 9,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: GREEN,
    fontFace: "Calibri",
  });
  s.addText(caption, {
    x: 0.5,
    y: 1.05,
    w: 9,
    h: 0.45,
    fontSize: 12,
    color: SLATE,
    fontFace: "Calibri",
  });
  try {
    s.addImage({
      path: img(imageRel),
      x: 0.35,
      y: 1.5,
      w: 9.3,
      h: 3.95,
    });
  } catch {
    s.addText(`Image: ${imageRel}`, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 0.5,
      fontSize: 11,
      color: "94A3B8",
    });
  }
  return s;
}

// 1 Title
coverSlide(
  "Remote farm monitoring & financial trust",
  [
    "A single place for owners and investors to watch operations",
    "and trust what happens with money — from anywhere.",
    "Powered by Sui · Pitch · April 2026",
  ],
  ["Presented by · Esther Nakungu", "Solo project · AgriTrack"],
);

// 2 Problem
contentSlide("Challenge", "The problem", [
  "No live picture of what happens on the farm for people who are not on site.",
  "Money is hard to prove when records are informal or easy to argue about.",
  "Remote owners cannot verify day-to-day work or payments with confidence.",
]);

// 3 Solution
contentSlide(
  "Answer",
  "Our solution",
  [
    "Live activity — farmers log what happens as it happens.",
    "Clear roles — farmer, trader, and admin each see what they should.",
    "Verifiable payments — Sui for proof when it matters.",
  ],
  {
    footer: "Monitor operations and trust the money trail from anywhere.",
    quote:
      "This is not just farm management — it is trusted, verifiable agricultural operations.",
  },
);

// 4 How it works — table flow (visible in Google Slides after PPTX upload)
howItWorksSlide();

// 5 What you get
contentSlide("Product", "What you get", [
  "Daily farm logs with optional photo proof.",
  "One dashboard for stock, revenue, and alerts.",
  "Sales and credit tracked in one place.",
  "Payment verification on Sui when you need proof.",
]);

// 6–10 Screenshots
imageSlide(
  "Product preview",
  "Admin — full system view",
  "Users, produce, revenue, and charts in one place for oversight.",
  "pitch-assets/pitch-admin.png",
);
imageSlide(
  "Product preview",
  "Farmer — day-to-day operations",
  "Harvests, stock, and money received — what happens on the farm.",
  "pitch-assets/pitch-farmer.png",
);
imageSlide(
  "Product preview",
  "Trader — sales & payments",
  "Purchases, amounts in UGX, and a clear purchasing desk.",
  "pitch-assets/pitch-trader.png",
);
imageSlide(
  "Payments & trust",
  "Wallet on Sui",
  "Connect a real wallet or use mock SUI for testing — same flow.",
  "pitch-assets/pitch-wallet-connect.png",
);
imageSlide(
  "Payments & trust",
  "From chain to ledger",
  "QR receive, link a payment to a sale, optional escrow — proof end to end.",
  "pitch-assets/pitch-wallet-escrow.png",
);

// 11 Impact
const sImpact = pptx.addSlide();
sImpact.background = { color: "FAFBF9" };
sImpact.addText("OUTCOMES", {
  x: 0.5,
  y: 0.35,
  w: 9,
  h: 0.3,
  fontSize: 10,
  color: GREEN_LIGHT,
  bold: true,
  fontFace: "Calibri",
});
sImpact.addText("Impact", {
  x: 0.5,
  y: 0.6,
  w: 9,
  h: 0.5,
  fontSize: 26,
  bold: true,
  color: GREEN,
  fontFace: "Calibri",
});
const cols = [
  {
    title: "Farmers",
    lines: [
      "Clearer accountability in the field.",
      "Documented trail of work, stock, harvests.",
      "Fewer disputes with buyers.",
      "Stronger case for credit and support.",
    ],
  },
  {
    title: "Owners & investors",
    lines: [
      "Confidence from a live picture.",
      "Revenue, costs, alerts without waiting on reports.",
      "Earlier signals when something drifts.",
      "History for boards, donors, partners.",
    ],
  },
  {
    title: "Agribusiness",
    lines: [
      "Scale without losing transparency.",
      "One standard across farmers or sites.",
      "Roles that match real teams.",
      "Readiness for audits and pilots.",
    ],
  },
];
let cx = 0.45;
for (const c of cols) {
  sImpact.addText(c.title, {
    x: cx,
    y: 1.25,
    w: 3.05,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: GREEN_LIGHT,
    fontFace: "Calibri",
  });
  const bullets = c.lines.map((t) => ({
    text: t,
    options: { bullet: { type: "bullet" }, fontSize: 11, color: SLATE, fontFace: "Calibri" },
  }));
  sImpact.addText(bullets, {
    x: cx,
    y: 1.65,
    w: 3.05,
    h: 3.2,
    valign: "top",
  });
  cx += 3.15;
}

// 12 Why
contentSlide("Why now", "Why it matters", [
  "Agriculture needs trust, not only effort.",
  "Clear records reduce fraud and confusion around money.",
  "Remote ownership only works with visibility and proof.",
]);

// 13 Next
contentSlide("Roadmap", "Next steps", [
  "Mobile experience so daily input is effortless.",
  "Stronger proof — location and media where it helps.",
  "More payment rails alongside Sui.",
  "First pilot — name your partner on this slide.",
]);

// 14 Thank you
const sEnd = pptx.addSlide();
sEnd.background = { color: GREEN };
sEnd.addText("Thank you", {
  x: 0.5,
  y: 1.8,
  w: 9,
  h: 0.9,
  fontSize: 36,
  bold: true,
  color: WHITE,
  fontFace: "Calibri",
});
sEnd.addText("Trust and transparency for the people who feed us.", {
  x: 0.5,
  y: 2.75,
  w: 9,
  h: 0.6,
  fontSize: 16,
  color: "E2E8F0",
  fontFace: "Calibri",
});
sEnd.addText("Built & presented by · Esther Nakungu", {
  x: 0.5,
  y: 3.35,
  w: 9,
  h: 0.4,
  fontSize: 13,
  color: "FFFFFF",
  bold: true,
  fontFace: "Calibri",
});
sEnd.addText("Questions welcome · Thank you for your time", {
  x: 0.5,
  y: 3.85,
  w: 9,
  h: 0.5,
  fontSize: 11,
  color: "CBD5E1",
  fontFace: "Calibri",
});

const out = path.join(pub, "AgriTrack-pitch.pptx");
await pptx.writeFile({ fileName: out });
console.log("Wrote:", out);
console.log("Upload to Google Drive → Open with → Google Slides.");
