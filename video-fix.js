/**
 * Pinto Basto CRM — Video Fix
 * Mostra erro claro se o vídeo não carregar.
 */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("video").forEach(video => {
    video.preload = "metadata";
    video.setAttribute("playsinline", "");

    const source = video.querySelector("source");
    const src = source ? source.getAttribute("src") : video.getAttribute("src");

    video.addEventListener("error", () => {
      const box = document.createElement("div");
      box.style.padding = "14px";
      box.style.border = "1px solid #fecaca";
      box.style.background = "#fee2e2";
      box.style.color = "#991b1b";
      box.style.borderRadius = "14px";
      box.style.fontWeight = "800";
      box.innerHTML = `Vídeo não carregou: <code>${src}</code><br>Confirma que o ficheiro existe na pasta <code>assets</code> e abre com Live Server.`;
      video.insertAdjacentElement("afterend", box);
    });
  });
});
