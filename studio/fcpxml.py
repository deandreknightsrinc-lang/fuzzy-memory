"""Write a Final Cut Pro timeline (FCPXML): one labeled placeholder per segment or clip.

Import with File > Import > XML. Each segment is a gap clip of the planned length, carrying:
  - a chapter marker (exports as YouTube chapters when you share from Final Cut)
  - a to-do marker telling the editor which file goes there
Drop the real clip over each placeholder, then delete the placeholder.
"""

from xml.sax.saxutils import quoteattr

FRAME = "100/3000s"  # 30 fps, matches FFVideoFormat1080p30


def build(items: list, project_name: str, event_name: str) -> str:
    """items: dicts with label, seconds, todo, and chapter (True = add a chapter marker)."""
    total = sum(int(round(i["seconds"])) for i in items)
    spine = []
    offset = 0
    for i in items:
        dur = int(round(i["seconds"]))
        if dur <= 0:
            continue
        chapter = (f'          <chapter-marker start="0s" duration="{FRAME}" value={quoteattr(i["label"])} posterOffset="0s"/>\n'
                   if i.get("chapter", True) else "")
        spine.append(
            f'        <gap name={quoteattr(i["label"])} offset="{offset}s" start="0s" duration="{dur}s">\n'
            f"{chapter}"
            f'          <marker start="0s" duration="{FRAME}" value={quoteattr(i["todo"])} completed="0"/>\n'
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
