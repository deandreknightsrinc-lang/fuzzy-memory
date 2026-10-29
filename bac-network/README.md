# BAC Network and Media

Everything BAC needs to go live, running on one server:

| Address | What it is | Built on |
|---|---|---|
| `bacnetwork.com` | Home site: live players, headlines, schedule | Custom (in `site/`) |
| `news.bacnetwork.com` | BAC News, the daily newspaper, with newsletter and paid subscriptions | Ghost |
| `magazine.bacnetwork.com` | BAC Magazine, features and issues | Ghost |
| `tv1.bacnetwork.com` | BAC TV, live entertainment channel with chat | Owncast |
| `newslive.bacnetwork.com` | BAC News Live, live news channel with chat | Owncast |
| `watch.bacnetwork.com` | BAC Watch, on-demand episodes and replays | PeerTube |
| `status.bacnetwork.com` | BAC Status, uptime monitoring and down alerts for everything above | Uptime Kuma |
| `control.bacnetwork.com` | BAC Control Room: upload shows and edit the channel schedules from your browser | Custom (in `control/`) |

## Try it on your own computer first (free)

You can run the whole network privately on a Mac or PC before paying for a server. Nobody else can watch, but everything works: both channels broadcast, and the news site, magazine, video library and status page are all usable.

1. Install and open [Docker Desktop](https://www.docker.com/products/docker-desktop/). Give it at least 6 GB of memory (Settings > Resources).
2. Open Terminal in this `bac-network` folder and run `bash scripts/try-local.sh`. The first run downloads a few GB and takes several minutes.
3. Open http://localhost:8000. Both channels start playing a demo video within a minute.

Everything runs on `localhost` ports 8000 to 8007; the script prints the full list. To test going live, point OBS at `rtmp://localhost:1935/live` with stream key `abc123`, during a slot marked `"type": "live"`. Stop everything with `bash scripts/try-local.sh stop`. Your posts and uploads are kept for next time.

When you move to a server, the same folder works unchanged: follow the steps below.

## What you need

1. **A server.** Ubuntu 24.04 with 4 CPUs, 8 GB RAM and 160 GB disk. Hetzner (about $15/month) or DigitalOcean (about $48/month) both work. Video storage grows over time; add a storage volume when needed.
2. **A domain name**, such as bacnetwork.com (about $12/year).
3. **An email sending service** for newsletters and sign-ups: Mailgun, Postmark or Brevo (free tiers exist).
4. **OBS Studio** (free) on the computer you broadcast from.

## Step 1: Point your domain at the server

In your domain provider's DNS settings, create these **A records**, all pointing to your server's IP address:
`@`, `www`, `news`, `magazine`, `tv1`, `newslive`, `watch`, `status`, `control`

## Step 2: Install

Log in to the server and run:

```bash
git clone <your repo> /opt/bac-network   # or upload this folder there
cd /opt/bac-network
bash scripts/setup-server.sh              # first run creates .env with random passwords
nano .env                                 # set DOMAIN, ADMIN_EMAIL and the SMTP lines
bash scripts/setup-server.sh              # second run starts everything
```

Also edit `site/config.js` and set `domain` to the same domain.

## First login

Do these right away, because the first person to open each admin page becomes its owner.

- **News:** open `https://news.YOURDOMAIN/ghost` and create the admin account.
- **Magazine:** open `https://magazine.YOURDOMAIN/ghost` and create the admin account.
- **Live channels:** open `https://tv1.YOURDOMAIN/admin` and `https://newslive.YOURDOMAIN/admin`. Username `admin`, password `abc123`. Setup has already given each channel its own stream key (`TV1_STREAM_KEY` and `TV2_STREAM_KEY` in `.env`) and removed the default one. **Change the admin password immediately** under Configuration > Server Setup.
- **Status monitor:** open `https://status.YOURDOMAIN` and create the admin account. Then add an HTTP monitor for each address in the table above, and a notification (email, Telegram, Discord and many others are built in) so you hear about an outage before your viewers do.
- **Video library:** open `https://watch.YOURDOMAIN` and log in as `root`. The password was printed at the end of setup, or run `docker compose logs watch | grep -A1 -i password`.

## Show headlines on the home site

In each Ghost admin, go to Settings > Integrations > Add custom integration, name it "Home site", and copy the **Content API key** into `site/config.js` (`newsKey` and `magazineKey`).

## Going live

In OBS: Settings > Stream > Service: Custom.

| Channel | Server | Stream key |
|---|---|---|
| BAC TV | `rtmp://YOURDOMAIN:1935/live` | `TV1_STREAM_KEY` from your `.env` file |
| BAC News Live | `rtmp://YOURDOMAIN:1936/live` | `TV2_STREAM_KEY` from your `.env` file |
| BAC Watch live events | `rtmp://YOURDOMAIN:1937/live` | Shown when you create a live video in PeerTube |

Press Start Streaming and the channel goes live on its page and on the home site.

Only go live during a slot marked `"type": "live"` in the channel's schedule (see below). At other times the 24/7 playout is using the channel and OBS can't connect.

## Control Room

The easiest way to run the channels day to day. Open `https://control.YOURDOMAIN` (trial run: http://localhost:8007), log in as `bac` with `CONTROL_PASSWORD` from your `.env` file (setup prints it), and pick a channel at the top:

- **On air** shows what's playing now and what's coming up. During a live slot it tells you the channel is waiting for OBS.
- **Weekly schedule:** add, edit or delete slots, and set the channel's time zone. Two slots that overlap are refused with a plain explanation. Changes go on air at the next programme change.
- **Shows:** make a new show, upload episodes straight from your browser (several at once, with a progress bar), remove old ones, and add the holding screen image. A warning appears next to any scheduled show that has no videos yet.

Everything in the Control Room edits the same files described below, so you can mix both ways.

## Broadcasting 24/7

Each channel stays on air around the clock. The playout service follows a weekly schedule, plays your videos, steps aside for live shows, and fills gaps.

**1. Upload videos** in the Control Room, or into the `media` folder on the server (FileZilla or any SFTP app works), one folder per show:

```
media/tv1/prime-time/          episode files for Prime Time Feature
media/tv1/music-videos/
media/tv1/filler/              plays whenever nothing is scheduled
media/tv1/slate.png            optional "We'll be right back" image (1280x720)
media/tv2/morning-news/        upload each morning's recording here for the replay slot
media/tv2/filler/
```

Any common video format works (MP4, MOV, MKV and more); the playout converts everything to the same 720p format on the fly.

**2. Edit the schedule** in the Control Room, or in `broadcast/schedule/tv1.json` (BAC TV) or `tv2.json` (BAC News Live). Each slot looks like this:

```json
{ "days": "weekdays", "start": "20:00", "end": "22:00", "title": "Prime Time Feature", "folder": "prime-time" }
```

- `days`: `daily`, `weekdays`, `weekends`, or a list such as `["mon", "wed", "fri"]`
- `start` and `end`: 24-hour time in the schedule's `timezone`. A slot can run past midnight (`"23:00"` to `"01:00"`).
- `folder`: which folder under `media/<channel>/` to play. Episodes play in order and pick up where they left off the next day. Add `"order": "shuffle"` for random order.
- `"type": "live"` instead of a folder: the playout steps aside so you can go live from OBS.

Changes are picked up automatically between programmes; no restart needed. The home site's "Now / Next" lines and the schedule table come straight from these files.

If a slot's folder is empty, the channel shows the slate. If there is no slot, it plays the `filler` folder.

## Day to day

- **Publish a story:** write it in the News or Magazine admin and press Publish. It appears on the home site automatically.
- **Upload an episode:** BAC Watch > Publish.
- **Change the schedule:** edit `broadcast/schedule/tv1.json` or `tv2.json` (see Broadcasting 24/7).
- **Add a channel:** copy the `tv2` block in `docker-compose.yml` with a new name and port (1938, 1939...), add a matching block in `Caddyfile` and an entry in `site/config.js`, then `docker compose up -d`. For 24/7 playout on it, also copy a `playout-tv2` block and add `broadcast/schedule/<id>.json` and a `media/<id>/` folder.
- **Backups:** `bash scripts/backup.sh`, or schedule it nightly with cron (see the top of that file). Copy the `backups` folder off the server regularly.
- **Updates:** `docker compose pull && docker compose up -d`.

## Earning money

- Ghost has paid memberships built in: connect Stripe under Settings > Membership in the News or Magazine admin.
- Both Ghost sites send email newsletters to subscribers.
