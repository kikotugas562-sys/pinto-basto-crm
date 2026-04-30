/**
 * Pinto Basto CRM — Video WebM Fix
 * Se o vídeo aparecer 0:00 ou não tocar, mostra um cartão animado em fallback.
 */
document.addEventListener("DOMContentLoaded", () => {
  const titles = ["Dashboard Premium", "Voz e resumo", "Clientes inteligentes"];

  document.querySelectorAll("video").forEach((video, index) => {
    video.preload = "metadata";
    video.setAttribute("playsinline", "");
    video.load();

    const makeFallback = () => {
      if (video.dataset.fallbackDone === "1") return;
      video.dataset.fallbackDone = "1";

      const fallback = document.createElement("div");
      fallback.className = "video-animated-fallback";
      fallback.innerHTML = `
        <div class="fallback-screen">
          <div class="fallback-title">${titles[index] || "Pinto Basto CRM"}</div>
          <div class="fallback-subtitle">Demonstração animada</div>
          <div class="fallback-cards">
            <span>Clientes</span><span>Interações</span><span>Chat</span>
          </div>
          <div class="fallback-progress"><i></i></div>
        </div>
      `;
      video.replaceWith(fallback);
    };

    video.addEventListener("loadedmetadata", () => {
      if (!isFinite(video.duration) || video.duration === 0) {
        makeFallback();
      }
    });

    video.addEventListener("error", makeFallback);

    setTimeout(() => {
      if (video.readyState === 0 || !isFinite(video.duration) || video.duration === 0) {
        makeFallback();
      }
    }, 1600);
  });
});
