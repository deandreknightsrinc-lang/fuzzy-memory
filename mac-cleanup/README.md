# Mac clean-up

`kbk-cleanup.sh` shows what's filling the Mac (including "System Data") and moves things to the external drive (**KNIGHT LYFE INC - Data** by default). It also builds your own sound library there.

```bash
cd ~/fuzzy-memory && git pull
bash mac-cleanup/kbk-cleanup.sh                     # report only: changes nothing
bash mac-cleanup/kbk-cleanup.sh --sound-library     # 1. your sound library + Logic's library steps
bash mac-cleanup/kbk-cleanup.sh --downloads         # 2. empty Downloads onto the drive
bash mac-cleanup/kbk-cleanup.sh --all               # everything below, asking before each step
```

| Option | What it does |
|---|---|
| `--sound-library` | Builds the **Knight Lyfe Sound Library** on the drive with `sound-library/setup-library.sh`: organized folders, the Knight Lyfe sound packs, and links so it shows up in Logic's Library and Browser. It then shows the steps to put **Logic's own sound library** on the drive. |
| `--downloads` | Moves everything in Downloads to the drive. **Stems folders** go to your library's `Stems`, and **samples and sample packs** go to the library's `Inbox (drop new sounds here)` (sort them with `sound-library/organize-samples.sh`). Everything else goes to `KBK-Offload/Downloads`. Files still downloading are left alone. |
| `--documents`, `--desktop` | Goes through each item, biggest first, and asks before moving it to `KBK-Offload/Documents` (or `Desktop`). |
| `--caches` | Clears app caches (apps rebuild what they need), Xcode build files, old simulators, and pip/npm/Homebrew download caches. Quit your apps first. |
| `--snapshots` | Removes Time Machine's *local* snapshots on the Mac. These are often the biggest hidden part of System Data. Your backups on the Time Machine drive aren't touched. |
| `--iphone-backups` | Moves iPhone/iPad backups to the drive and leaves a link, so Finder keeps backing up there. |
| `--dry-run` | Shows what would happen without changing anything. |
| `--drive "/Volumes/NAME"` | Uses another drive. |

**How moving stays safe:** each item is copied, then the copy is checked: same number of files and same total bytes. Only then is it removed from the Mac. A name that already exists on the drive gets "(2)" instead of overwriting. If the drive runs low (it keeps 1 GB spare), the item is skipped. Every move is logged in `KBK-Offload/logs` on the drive.

## Logic Pro's sound library on the drive

Logic has to do this itself; moving its folders by hand breaks it:

1. Plug in the drive and open Logic Pro.
2. Go to **Logic Pro → Sound Library → Relocate Sound Library…** and pick the drive. Logic moves what's installed and keeps using it from there.
3. Go to **Logic Pro → Sound Library → Download All Available Sounds** (about 70 GB, downloaded straight onto the drive). Or use **Open Sound Library Manager** to download only what you use.
4. Keep the drive plugged in when you use Logic.

## What "System Data" is

It's everything the Storage page doesn't put in another box. The big parts are usually:

- **Time Machine local snapshots:** hourly copies kept on the Mac between backups (`--snapshots`).
- **Caches** of apps and the system (`--caches`).
- **App data in ~/Library:** iPhone backups, Messages and Mail attachments, Docker, AI models (Ollama), and helpers.
- **Plug-in and sample libraries** in `/Library/Application Support` and `/Users/Shared` (Output Arcade, Splice, Native Instruments…). Move these with each app's own setting, not by dragging folders.
- **Swap and the sleep image** in `/private/var/vm`. macOS manages these; a restart shrinks them.

The report lists the biggest of these by name and size. If it says Terminal can't see everything, turn on Terminal in **System Settings → Privacy & Security → Full Disk Access**, reopen Terminal, and run it again. That's also why System Data looks like a locked box: without that permission nothing can look inside it.

**Downloads in the future:** set the browsers to save to the drive. In Chrome: Settings → Downloads → Location. In Safari: Settings → General → File download location.
