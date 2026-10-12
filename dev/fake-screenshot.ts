/** Capture factice (page « Paramètres du compte ») pour l'aperçu navigateur et la vidéo. */
export function fakeScreenshot(lang: "fr" | "en" = "fr", w = 1280, h = 800): ImageData {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6f7f9";
  g.fillRect(0, 0, w, h);
  // barre latérale
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 240, h);
  g.fillStyle = "#e7e9ee";
  g.fillRect(240, 0, 1, h);
  g.fillStyle = "#4f46e5";
  g.beginPath();
  g.roundRect(24, 24, 32, 32, 8);
  g.fill();
  g.fillStyle = "#111827";
  g.font = "600 17px Segoe UI, sans-serif";
  g.fillText("Nimbus", 68, 46);
  const nav = lang === "fr"
    ? ["Tableau de bord", "Projets", "Équipe", "Facturation", "Paramètres"]
    : ["Dashboard", "Projects", "Team", "Billing", "Settings"];
  nav.forEach((n, i) => {
    const y = 104 + i * 44;
    if (i === 4) {
      g.fillStyle = "#eef0ff";
      g.beginPath();
      g.roundRect(16, y - 26, 208, 38, 8);
      g.fill();
    }
    g.fillStyle = i === 4 ? "#4338ca" : "#4b5563";
    g.font = `${i === 4 ? 600 : 400} 15px Segoe UI, sans-serif`;
    g.fillText(n, 32, y);
  });
  // contenu
  g.fillStyle = "#111827";
  g.font = "600 26px Segoe UI, sans-serif";
  g.fillText(lang === "fr" ? "Paramètres du compte" : "Account settings", 288, 72);
  g.fillStyle = "#6b7280";
  g.font = "15px Segoe UI, sans-serif";
  g.fillText(lang === "fr" ? "Gérez votre profil et vos accès API." : "Manage your profile and API access.", 288, 100);
  const card = (y: number, hh: number) => {
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#e5e7eb";
    g.beginPath();
    g.roundRect(288, y, w - 336, hh, 12);
    g.fill();
    g.stroke();
  };
  card(132, 300);
  const fields: [string, string][] = lang === "fr"
    ? [["Nom complet", "Camille Martin"], ["Adresse e-mail", "camille.martin@exemple.fr"], ["Téléphone", "+33 6 12 34 56 78"]]
    : [["Full name", "Camille Martin"], ["Email address", "camille.martin@example.com"], ["Phone", "+1 415 555 0134"]];
  fields.forEach(([label, value], i) => {
    const y = 176 + i * 84;
    g.fillStyle = "#374151";
    g.font = "600 14px Segoe UI, sans-serif";
    g.fillText(label, 320, y);
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#d1d5db";
    g.beginPath();
    g.roundRect(320, y + 12, 460, 40, 8);
    g.fill();
    g.stroke();
    g.fillStyle = "#111827";
    g.font = "15px Segoe UI, sans-serif";
    g.fillText(value, 334, y + 38);
  });
  card(456, 190);
  g.fillStyle = "#111827";
  g.font = "600 17px Segoe UI, sans-serif";
  g.fillText(lang === "fr" ? "Clé API" : "API key", 320, 496);
  g.fillStyle = "#f3f4f6";
  g.beginPath();
  g.roundRect(320, 516, 620, 44, 8);
  g.fill();
  g.fillStyle = "#1f2937";
  g.font = "15px Consolas, monospace";
  g.fillText("nimbus_demo_7rT2a9fKp3LmZ8vWcYb4Hd6", 336, 544);
  g.fillStyle = "#6b7280";
  g.font = "14px Segoe UI, sans-serif";
  g.fillText(lang === "fr" ? "Ne partagez jamais cette clé." : "Never share this key.", 320, 600);
  // bouton
  g.fillStyle = "#4f46e5";
  g.beginPath();
  g.roundRect(w - 228, 676, 180, 46, 10);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "600 15px Segoe UI, sans-serif";
  g.textAlign = "center";
  g.fillText(lang === "fr" ? "Enregistrer" : "Save changes", w - 138, 705);
  return g.getImageData(0, 0, w, h);
}

