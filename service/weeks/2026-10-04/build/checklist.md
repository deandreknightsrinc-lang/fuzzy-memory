# Production Checklist - week of 2026-10-04

## Monday - plan
- [ ] Senior pastor locks title, theme scripture, sermon outline in service.yaml
- [ ] Newspaper editor opens the matching issue.yaml (same theme)
## Tuesday - scripts
- [ ] Run the builder; send each speaker their file from build/scripts/
- [ ] Apostle Sir DeAndre Knight: review and approve script
- [ ] Dr. Minister Daniel Alejandro Harris Bey: review and approve script
## Wednesday - record & generate
- [ ] Record all `recorded` segments (sermon, prayer, invitation)
- [ ] ElevenLabs: `python -m studio voice <week>` renders every AI voice file into build/audio/
- [ ] HeyGen: make each avatar segment from its ElevenLabs audio (see heygen.md)
- [ ] OpenArt: generate b-roll stills, then image-to-video (see prompts.md)
## Thursday - edit (Final Cut Pro)
- [ ] File > Import > XML > build/timeline.fcpxml: segments + chapter markers are pre-laid
- [ ] Drop each clip over its placeholder (the to-do marker names the file); drop voice-overs + b-roll
- [ ] Lower thirds, scripture overlays, captions (Final Cut: Transcribe to Captions), color grade, loudness -14 LUFS
- [ ] Share > YouTube & Facebook keeps the chapter markers
## Friday - review
- [ ] Pastor watches full cut; theology + accuracy check on every AI segment
- [ ] Newspaper issue finalized and exported to PDF
## Saturday - schedule
- [ ] Upload as YouTube Premiere using youtube.md; set thumbnail
- [ ] Schedule social clips
## Sunday - premiere 11:00 AM
- [ ] Live chat moderators + prayer team online
- [ ] Send newspaper + service link to members (email / text)
