from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
BRANDS_DIR = REPO_ROOT / "brands"


class Brand:
    def __init__(self, slug: str):
        path = BRANDS_DIR / slug / "brand.yaml"
        if not path.exists():
            raise SystemExit(f"Brand profile not found: {path}")
        self.slug = slug
        self.data = yaml.safe_load(path.read_text())
        self.ministry = self.data["ministry"]
        self.colors = self.data["colors"]
        self.fonts = self.data["fonts"]
        self.newspaper = self.data.get("newspaper", {})
        self.staff = {s["key"]: s for s in self.data.get("staff", [])}

    def person(self, key: str) -> dict:
        if key not in self.staff:
            raise SystemExit(f"Unknown staff key '{key}' - add it to brands/{self.slug}/brand.yaml")
        return self.staff[key]


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text())
