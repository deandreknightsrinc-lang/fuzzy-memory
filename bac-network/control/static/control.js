(function () {
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_LABEL = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const GROUP = { daily: DAYS, weekdays: DAYS.slice(0, 5), weekends: DAYS.slice(5) };
  const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix",
    "America/Anchorage", "Pacific/Honolulu", "America/Toronto", "Europe/London", "Africa/Lagos", "UTC"];

  let channels = [];
  let current = null;
  let editing = null; // index of the slot being edited, or -1 for a new one

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clock = (hm) => {
    const [h, m] = hm.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  const size = (b) => (b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : (b / 1e6).toFixed(0) + " MB");
  const daysText = (d) => {
    if (typeof d === "string") return { daily: "Every day", weekdays: "Weekdays", weekends: "Weekends" }[d] || DAY_LABEL[d] || d;
    return d.map((x) => DAY_LABEL[x] || x).join(", ");
  };

  function toast(msg, bad) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = bad ? "bad" : "";
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), bad ? 6000 : 3000);
  }

  async function api(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
    return data;
  }

  async function load() {
    channels = await api("GET", "/api/channels");
    if (!current || !channels.find((c) => c.id === current)) current = channels[0].id;
    render();
  }

  const ch = () => channels.find((c) => c.id === current);

  function render() {
    $("#tabs").innerHTML = channels
      .map((c) => `<button role="tab" aria-selected="${c.id === current}" data-ch="${c.id}">${esc(c.schedule.channel || c.id)}</button>`)
      .join("");
    const c = ch();
    $("#main").innerHTML = onAirHtml(c) + scheduleHtml(c) + showsHtml(c);
  }

  function onAirHtml(c) {
    const o = c.onair;
    if (!o) {
      return `<section><h2>On air</h2><p class="muted">The 24/7 playout hasn't reported in yet. It starts a minute or so after the network does.</p></section>`;
    }
    const next = (o.next || []).slice(0, 3)
      .map((n) => `<div>${esc(n.title)} <span class="muted">${DAY_LABEL[n.day]} ${clock(n.start)}</span>${n.type === "live" ? ' <span class="badge live">Live</span>' : ""}</div>`)
      .join("");
    const kind = { live: '<span class="badge live">Live show</span>', filler: '<span class="badge">Filler</span>', shows: '<span class="badge">Scheduled</span>' }[o.now.type] || "";
    return `<section>
      <div class="section-head"><h2>On air</h2><span class="muted small">Updated ${esc(o.updated.replace("T", " "))} (${esc(o.timezone)})</span></div>
      <div class="onair">
        <div><div class="muted small">Now</div><div class="big">${esc(o.now.title)} ${kind}</div>
          ${o.now.until ? `<div class="muted">until ${clock(o.now.until)}</div>` : ""}
          ${o.now.type === "live" ? `<div class="small">Go live from OBS now. The channel is waiting for you.</div>` : ""}</div>
        <div><div class="muted small">Coming up</div>${next || '<div class="muted">Nothing scheduled</div>'}</div>
      </div></section>`;
  }

  function scheduleHtml(c) {
    const s = c.schedule;
    const order = (slot) => {
      const days = Array.isArray(slot.days) ? slot.days : GROUP[slot.days] || [slot.days];
      return DAYS.indexOf(days[0]) * 1440 + Number(slot.start.slice(0, 2)) * 60 + Number(slot.start.slice(3));
    };
    const rows = s.slots
      .map((slot, i) => ({ slot, i }))
      .sort((a, b) => order(a.slot) - order(b.slot))
      .map(({ slot, i }) => {
        const what = slot.type === "live"
          ? '<span class="badge live">Live</span>'
          : `${esc(slot.folder)}${slot.order === "shuffle" ? ' <span class="muted small">(shuffle)</span>' : ""}${folderWarning(c, slot.folder)}`;
        return `<tr><td>${esc(slot.title)}</td><td>${daysText(slot.days)}</td><td>${clock(slot.start)} to ${clock(slot.end)}</td>
          <td class="hide-sm">${what}</td>
          <td class="actions-cell"><button class="link" data-edit="${i}">Edit</button><button class="link danger" data-del="${i}">Delete</button></td></tr>`;
      })
      .join("");
    const zones = ZONES.includes(s.timezone) ? ZONES : [s.timezone, ...ZONES];
    return `<section>
      <div class="section-head">
        <div><h2>Weekly schedule</h2><div class="muted small">Outside these slots the channel plays the <b>${esc(s.filler || "filler")}</b> show. Changes go on air at the next programme change.</div></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <label class="muted small">Time zone <select id="tz">${zones.map((z) => `<option ${z === s.timezone ? "selected" : ""}>${esc(z)}</option>`).join("")}</select></label>
          <button class="primary" id="add-slot">Add a slot</button>
        </div>
      </div>
      ${rows ? `<table><thead><tr><th>Show</th><th>Days</th><th>Time</th><th class="hide-sm">Plays</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p class="muted">No slots yet. The channel plays filler all day.</p>'}
    </section>`;
  }

  function folderWarning(c, name) {
    const f = c.folders.find((x) => x.name === name);
    if (!f) return ' <span class="badge warn">folder missing</span>';
    if (!f.files.length) return ' <span class="badge warn">no videos yet</span>';
    return "";
  }

  function showsHtml(c) {
    const filler = c.schedule.filler || "filler";
    const cards = c.folders
      .map((f) => {
        const used = c.schedule.slots.filter((s) => s.folder === f.name).map((s) => s.title);
        const role = f.name === filler ? "Plays when nothing is scheduled" : used.length ? `Used by ${used.map(esc).join(", ")}` : "Not in the schedule yet";
        const files = f.files
          .map((file) => `<li><span title="${esc(file.name)}">${esc(file.name)}</span><span class="muted small">${size(file.size)}
            <button class="link danger" data-delfile="${esc(f.name)}" data-name="${esc(file.name)}">Remove</button></span></li>`)
          .join("");
        return `<div class="show">
          <h3>${esc(f.name)} ${!f.files.length && !used.length && f.name !== filler ? `<button class="link danger" data-delfolder="${esc(f.name)}">Delete</button>` : ""}</h3>
          <div class="muted small">${role} · ${f.files.length} video${f.files.length === 1 ? "" : "s"}</div>
          ${files ? `<ul>${files}</ul>` : '<p class="muted small">No videos yet.</p>'}
          <label class="ghost">Upload videos<input type="file" accept="video/*,.mkv,.ts" multiple data-upload="${esc(f.name)}"></label>
          <div class="progress" hidden><div></div></div>
          <div class="muted small upload-status"></div>
        </div>`;
      })
      .join("");
    return `<section>
      <div class="section-head">
        <div><h2>Shows</h2><div class="muted small">Episodes play in alphabetical order, so name them 01-…, 02-… and so on. ${size(c.free_bytes)} free on the server.</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label class="ghost">${c.slate ? "Replace" : "Add"} holding screen<input type="file" accept="image/png,image/jpeg" data-upload="_slate"></label>
          <button class="primary" id="new-show">New show</button>
        </div>
      </div>
      <div class="shows">${cards || '<p class="muted">No shows yet.</p>'}</div>
    </section>`;
  }

  // ----- schedule editing -----

  async function saveSchedule(slots, message) {
    const c = ch();
    try {
      const res = await api("PUT", `/api/schedule/${c.id}`, { ...c.schedule, slots });
      c.schedule = res.schedule;
      render();
      toast(message);
      return true;
    } catch (e) {
      toast(e.message, true);
      return false;
    }
  }

  function openSlot(i) {
    const c = ch();
    editing = i;
    const slot = i >= 0 ? c.schedule.slots[i] : { title: "", days: "weekdays", start: "", end: "", type: "shows", folder: c.folders[0] && c.folders[0].name };
    const form = $("#slot-form");
    $("#slot-dialog-title").textContent = i >= 0 ? "Edit slot" : "Add a slot";
    form.title.value = slot.title;
    form.start.value = slot.start;
    form.end.value = slot.end;
    form.type.value = slot.type === "live" ? "live" : "shows";
    form.shuffle.checked = slot.order === "shuffle";
    form.folder.innerHTML = c.folders.map((f) => `<option ${f.name === slot.folder ? "selected" : ""}>${esc(f.name)}</option>`).join("");
    const days = Array.isArray(slot.days) ? slot.days : GROUP[slot.days] || [slot.days];
    $("#day-boxes").innerHTML = DAYS.map((d) => `<label><input type="checkbox" value="${d}" ${days.includes(d) ? "checked" : ""}>${DAY_LABEL[d]}</label>`).join("");
    $("#slot-error").hidden = true;
    toggleShows();
    $("#slot-dialog").showModal();
  }

  function toggleShows() {
    $("#shows-fields").hidden = $("#slot-form").type.value === "live";
  }

  function pickedDays() {
    const days = [...document.querySelectorAll("#day-boxes input:checked")].map((x) => x.value);
    for (const [word, list] of Object.entries(GROUP)) {
      if (days.length === list.length && list.every((d) => days.includes(d))) return word;
    }
    return days;
  }

  $("#slot-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const slot = { title: form.title.value.trim(), days: pickedDays(), start: form.start.value, end: form.end.value };
    if (form.type.value === "live") slot.type = "live";
    else {
      slot.folder = form.folder.value;
      if (form.shuffle.checked) slot.order = "shuffle";
    }
    const err = $("#slot-error");
    if (Array.isArray(slot.days) && !slot.days.length) {
      err.textContent = "Pick at least one day.";
      err.hidden = false;
      return;
    }
    if (slot.type !== "live" && !slot.folder) {
      err.textContent = "Make a show folder first (Shows > New show).";
      err.hidden = false;
      return;
    }
    const slots = ch().schedule.slots.slice();
    if (editing >= 0) slots[editing] = slot;
    else slots.push(slot);
    try {
      const c = ch();
      const res = await api("PUT", `/api/schedule/${c.id}`, { ...c.schedule, slots });
      c.schedule = res.schedule;
      $("#slot-dialog").close();
      render();
      toast("Schedule saved.");
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });

  $("#slot-cancel").addEventListener("click", () => $("#slot-dialog").close());
  $("#slot-form").addEventListener("change", (ev) => ev.target.name === "type" && toggleShows());
  document.querySelectorAll(".presets button").forEach((b) =>
    b.addEventListener("click", () => {
      const list = GROUP[b.dataset.days];
      document.querySelectorAll("#day-boxes input").forEach((x) => (x.checked = list.includes(x.value)));
    })
  );

  // ----- uploads -----

  function upload(folder, files, card) {
    const c = ch();
    const bar = card && $(".progress", card);
    const status = card && $(".upload-status", card);
    const queue = [...files];
    const next = () => {
      const file = queue.shift();
      if (!file) {
        if (bar) bar.hidden = true;
        load();
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", `/api/upload/${c.id}/${encodeURIComponent(folder)}/${encodeURIComponent(file.name)}`);
      if (bar) bar.hidden = false;
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        if (bar) $("div", bar).style.width = `${(e.loaded / e.total) * 100}%`;
        if (status) status.textContent = `Uploading ${file.name}: ${Math.round((e.loaded / e.total) * 100)}%${queue.length ? `, ${queue.length} more after this` : ""}`;
      };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status === 200) toast(`${file.name} uploaded.`);
        else toast(data.error || `Upload of ${file.name} failed.`, true);
        next();
      };
      xhr.onerror = () => {
        toast(`Upload of ${file.name} failed. Check your connection and try again.`, true);
        next();
      };
      xhr.send(file);
    };
    next();
  }

  // ----- clicks -----

  document.addEventListener("click", async (ev) => {
    const t = ev.target;
    if (t.dataset.ch) {
      current = t.dataset.ch;
      render();
    } else if (t.id === "add-slot") {
      openSlot(-1);
    } else if (t.dataset.edit) {
      openSlot(Number(t.dataset.edit));
    } else if (t.dataset.del) {
      const slots = ch().schedule.slots.slice();
      const [gone] = slots.splice(Number(t.dataset.del), 1);
      if (confirm(`Remove "${gone.title}" from the schedule? Its videos stay in the show folder.`)) saveSchedule(slots, "Slot removed.");
    } else if (t.id === "new-show") {
      const name = prompt("Name for the new show folder (for example evening-report):");
      if (!name) return;
      try {
        await api("POST", `/api/folder/${current}/${encodeURIComponent(name.trim())}`);
        await load();
        toast(`Show "${name.trim()}" created. Upload its videos below.`);
      } catch (e) {
        toast(e.message, true);
      }
    } else if (t.dataset.delfile) {
      if (!confirm(`Remove ${t.dataset.name}? This deletes it from the server.`)) return;
      try {
        await api("DELETE", `/api/file/${current}/${encodeURIComponent(t.dataset.delfile)}/${encodeURIComponent(t.dataset.name)}`);
        await load();
        toast("Video removed.");
      } catch (e) {
        toast(e.message, true);
      }
    } else if (t.dataset.delfolder) {
      try {
        await api("DELETE", `/api/folder/${current}/${encodeURIComponent(t.dataset.delfolder)}`);
        await load();
        toast("Show deleted.");
      } catch (e) {
        toast(e.message, true);
      }
    }
  });

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.dataset.upload && t.files.length) {
      upload(t.dataset.upload, t.files, t.closest(".show"));
      t.value = "";
    } else if (t.id === "tz") {
      const c = ch();
      c.schedule.timezone = t.value;
      saveSchedule(c.schedule.slots, `Time zone set to ${t.value}.`);
    }
  });

  load().catch((e) => ($("#main").innerHTML = `<p class="error">${esc(e.message)}</p>`));
  setInterval(() => {
    if (!$("#slot-dialog").open && !document.querySelector(".progress:not([hidden])")) load().catch(() => {});
  }, 30000);
})();
