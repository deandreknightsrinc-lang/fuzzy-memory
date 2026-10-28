// Home site settings for the trial run on your computer (see docker-compose.local.yml).
window.BAC = {
  urls: {
    news: "http://localhost:8001",
    magazine: "http://localhost:8002",
    tv1: "http://localhost:8003",
    newslive: "http://localhost:8004",
    watch: "http://localhost:8005",
  },

  newsKey: "",
  magazineKey: "",

  channels: [
    { id: "tv1", name: "BAC TV", tagline: "Entertainment, music and original shows", host: "tv1" },
    { id: "tv2", name: "BAC News Live", tagline: "Breaking news and daily news shows", host: "newslive" },
  ],
};
