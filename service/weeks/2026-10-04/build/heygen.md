# HeyGen Hand-off - 2026-10-04

For each segment: HeyGen > Create Video > pick the avatar > **Upload audio** > choose the ElevenLabs file from `build/audio/` (made by `python -m studio voice`). Using the ElevenLabs audio keeps the voice identical across HeyGen, voice-overs and the news show.

Export: 1080p, 16:9, then save as the file name in the last column.

| # | Segment | Avatar | Avatar ID | Audio file | Save as |
|---|---------|--------|-----------|------------|---------|
| 3 | welcome | Apostle Sir DeAndre Knight | (set avatar_id in brand.yaml) | audio/03-welcome.mp3 | assets/03-welcome.mp4 |
| 7 | announcements | Apostle Sir DeAndre Knight | (set avatar_id in brand.yaml) | audio/07-announcements.mp3 | assets/07-announcements.mp4 |
| 11 | benediction | Apostle Sir DeAndre Knight | (set avatar_id in brand.yaml) | audio/11-benediction.mp3 | assets/11-benediction.mp4 |

## Scripts (in case you type instead of uploading audio)

### 3. welcome

```
Welcome to BAC Ministries, whether you are joining us for the first time or you have been with us from the beginning.
Grab your Bible, grab a notebook, and let us make room for the Word today.
```

### 7. announcements

```
Issue #11 of the BAC Ministries Weekly is out - read it at the link below.

Midweek Bible study: [day / time / link]

Prayer requests: [form link or phone]
```

### 11. benediction

```
The Lord bless thee, and keep thee: the Lord make his face shine upon thee, and be gracious unto thee:
the Lord lift up his countenance upon thee, and give thee peace. (Numbers chapter 6, verses 24 through 26)
```

