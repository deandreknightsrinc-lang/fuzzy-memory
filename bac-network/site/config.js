// BAC Network home site settings. Edit this file, then reload the page.
window.BAC = {
  domain: "bacnetwork.com", // must match DOMAIN in .env

  // Ghost Content API keys. Get each one in Ghost admin:
  // Settings > Integrations > Add custom integration > copy "Content API key".
  newsKey: "",
  magazineKey: "",

  channels: [
    { id: "tv1", name: "BAC TV", tagline: "Entertainment, music and original shows", host: "tv1" },
    { id: "tv2", name: "BAC News Live", tagline: "Breaking news and daily news shows", host: "newslive" },
  ],
};
