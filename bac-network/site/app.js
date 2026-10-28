(function () {
  const cfg = window.BAC;
  const url = (sub) => `https://${sub}.${cfg.domain}`;
  const hosts = { news: "news", magazine: "magazine", watch: "watch" };

  document.getElementById("year").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-link]").forEach((a) => {
    a.href = url(hosts[a.dataset.link]) + (a.dataset.path || "");
  });

  // Live channels: embedded Owncast players with an on-air badge
  const wrap = document.getElementById("channels");
  cfg.channels.forEach((ch) => {
    const base = url(ch.host);
    const card = document.createElement("article");
    card.className = "channel";
    card.innerHTML = `
      <div class="player"><iframe src="${base}/embed/video" title="${ch.name}" allowfullscreen loading="lazy"></iframe></div>
      <div class="channel-info">
        <h3>${ch.name} <span class="badge off">Off air</span></h3>
        <p>${ch.tagline}</p>
        <a href="${base}">Watch with chat</a>
      </div>`;
    wrap.appendChild(card);
    fetch(`${base}/api/status`)
      .then((r) => r.json())
      .then((s) => {
        if (s.online) {
          const b = card.querySelector(".badge");
          b.textContent = "Live";
          b.className = "badge on";
        }
      })
      .catch(() => {});
  });

  // Latest stories from the two Ghost publications
  function loadStories(site, key, listId) {
    const list = document.getElementById(listId);
    if (!key) {
      list.innerHTML = `<li class="muted">Add the ${site} Content API key in config.js to show stories here.</li>`;
      return;
    }
    fetch(`${url(site)}/ghost/api/content/posts/?key=${key}&limit=5&fields=title,url,published_at,custom_excerpt,excerpt`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.posts || !data.posts.length) {
          list.innerHTML = `<li class="muted">No stories published yet.</li>`;
          return;
        }
        list.innerHTML = data.posts
          .map((p) => {
            const date = new Date(p.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            const blurb = (p.custom_excerpt || p.excerpt || "").slice(0, 140);
            return `<li><a href="${p.url}">${p.title}</a><span class="date">${date}</span><p>${blurb}</p></li>`;
          })
          .join("");
      })
      .catch(() => {
        list.innerHTML = `<li class="muted">Stories are unavailable right now.</li>`;
      });
  }
  loadStories("news", cfg.newsKey, "news-list");
  loadStories("magazine", cfg.magazineKey, "magazine-list");

  // Program schedule
  fetch("schedule.json")
    .then((r) => r.json())
    .then((rows) => {
      document.getElementById("schedule-body").innerHTML = rows
        .map((r) => `<tr><td>${r.channel}</td><td>${r.day}</td><td>${r.time}</td><td>${r.show}</td></tr>`)
        .join("");
    });
})();
