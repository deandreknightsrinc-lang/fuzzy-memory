"""Write a Final Cut Pro timeline (FCPXML) for a service: one labeled placeholder per segment.

Import with File > Import > XML. Each segment is a gap clip of the planned length, carrying:
  - a chapter marker (exports as YouTube chapters when you share from Final Cut)
  - a to-do marker telling the editor which file goes there
Drop the real clip over each placeholder, then delete the placeholder.
"""

from xml.sax.saxutils import quoteattr

FRAME = "100/3000s"  # 30 fps, matches FFVideoFormat1080p30


def seconds(value: float) -> str:
    return f"{int(round(value))}s"


def build(rows: list, project_name: str, event_name: str) -> str:
    total = sum(int(round(r["end"] - r["start"])) for r in rows)
    spine = []
    offset = 0
    for r in rows:
        dur = int(round(r["end"] - r["start"]))
        if dur <= 0:
            continue
        seg = r["seg"]
        label = f"{r['n']:02d} {seg['type'].replace('_', ' ').title()}"
        todo = f"Place {r['asset']}" + (f" (audio: {r['audio']})" if r.get("audio") else "")
        spine.append(
            f'        <gap name={quoteattr(label)} offset="{offset}s" start="0s" duration="{dur}s">\n'
            f'          <chapter-marker start="0s" duration="{FRAME}" value={quoteattr(label)} posterOffset="0s"/>\n'
            f'          <marker start="0s" duration="{FRAME}" value={quoteattr(todo)} completed="0"/>\n'
            f"        </gap>"
        )
        offset += dur

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" name="FFVideoFormat1080p30" frameDuration="{FRAME}" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
  </resources>
  <library>
    <event name={quoteattr(event_name)}>
      <project name={quoteattr(project_name)}>
        <sequence format="r1" duration="{total}s" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
{chr(10).join(spine)}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
"""
