(function () {
  const cfg = window.BAC;
  const url = (sub) => (cfg.urls && cfg.urls[sub]) || `https://${sub}.${cfg.domain}`;
  const hosts = { news: "news", magazine: "magazine", watch: "watch" };

  document.getElementById("year").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-link]").forEach((a) => {
    a.href = url(hosts[a.dataset.link]) + (a.dataset.path || "");
  });

  // What the playout service says is on now and next
  const DAY_NAMES = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const clock = (hm) => {
    const [h, m] = hm.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  const onAir = {};
  function loadOnAir(ch, el) {
    onAir[ch.id] = fetch(`broadcast/${ch.id}.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    onAir[ch.id].then((info) => {
      if (!info) return;
      const next = info.next[0];
      el.innerHTML =
        `<strong>Now:</strong> ${info.now.title}${info.now.until ? ` until ${clock(info.now.until)}` : ""}` +
        (next ? `<br><strong>Next:</strong> ${next.title}, ${DAY_NAMES[next.day]} ${clock(next.start)}` : "");
      el.hidden = false;
    });
  }

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
        <p class="onair" hidden></p>
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
    loadOnAir(ch, card.querySelector(".onair"));
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

  // Program schedule: from the live playout schedules when available, otherwise schedule.json
  const daysLabel = (d) => {
    const list = Array.isArray(d) ? d : [d];
    return list.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(", ");
  };
  const renderSchedule = (rows) => {
    document.getElementById("schedule-body").innerHTML = rows
      .map((r) => `<tr><td>${r.channel}</td><td>${r.day}</td><td>${r.time}</td><td>${r.show}${r.live ? ' <span class="badge on">Live</span>' : ""}</td></tr>`)
      .join("");
  };
  Promise.all(cfg.channels.map((ch) => onAir[ch.id])).then((infos) => {
    const rows = [];
    infos.forEach((info) => {
      if (!info) return;
      info.schedule
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start))
        .forEach((s) => rows.push({ channel: info.channel, day: daysLabel(s.days), time: clock(s.start), show: s.title, live: s.type === "live" }));
    });
    if (rows.length) return renderSchedule(rows);
    fetch("schedule.json").then((r) => r.json()).then(renderSchedule);
  });
})();
