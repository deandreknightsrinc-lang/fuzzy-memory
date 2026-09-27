"""Build a newspaper issue from newspaper/issues/<date>/issue.yaml into issue.html + issue.pdf."""

import html
import re
import subprocess
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from .brand import Brand, load_yaml

TEMPLATES = Path(__file__).parent / "templates"
CHROMIUM_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "chromium", "chromium-browser", "google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]


def paragraphs(text: str) -> str:
    """Tiny text-to-HTML: blank line = new paragraph, '## ' = subhead, '> ' = pull quote, *x* = italics."""
    out = []
    for block in re.split(r"\n\s*\n", (text or "").strip()):
        block = html.escape(block.strip())
        block = re.sub(r"\*(.+?)\*", r"<em>\1</em>", block)
        if not block:
            continue
        if block.startswith("## "):
            out.append(f"<h4>{block[3:]}</h4>")
        elif block.startswith("&gt; "):
            out.append(f"<blockquote>{block[5:]}</blockquote>")
        else:
            out.append(f"<p>{block.replace(chr(10), '<br>')}</p>")
    return "\n".join(out)


def find_chromium() -> str | None:
    import shutil
    for c in CHROMIUM_CANDIDATES:
        if Path(c).exists() or shutil.which(c):
            return c
    return None


def build(issue_dir: Path, pdf: bool = True) -> Path:
    issue = load_yaml(issue_dir / "issue.yaml")
    brand = Brand(issue["brand"])

    for a in issue.get("articles", []):
        a["author_name"] = brand.person(a["author"])["name"] if a.get("author") else a.get("byline", "")
        a["body_html"] = paragraphs(a.get("body", ""))

    d = issue["date"] if isinstance(issue["date"], date) else date.fromisoformat(str(issue["date"]))
    env = Environment(loader=FileSystemLoader(TEMPLATES), autoescape=True)
    page = env.get_template("newspaper.html").render(
        brand=brand, issue=issue, date_str=d.strftime("%a, %b %d, %Y"),
        front=[a for a in issue["articles"] if a.get("section") == "front"],
        inside=[a for a in issue["articles"] if a.get("section") != "front"],
        editor=brand.person(brand.newspaper.get("editor")) if brand.newspaper.get("editor") else None,
    )
    out_html = issue_dir / "issue.html"
    out_html.write_text(page)

    if pdf:
        chrome = find_chromium()
        if not chrome:
            print("Chromium/Chrome not found - open issue.html in a browser and Print > Save as PDF.")
        else:
            subprocess.run(
                [chrome, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                 f"--print-to-pdf={issue_dir / 'issue.pdf'}", out_html.resolve().as_uri()],
                check=True, capture_output=True,
            )
    return out_html
