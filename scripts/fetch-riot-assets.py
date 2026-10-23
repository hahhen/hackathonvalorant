"""Fetch only selected PNGs from Riot's public ZIP using HTTP ranges.

No match/player API is used. Run --list first to inspect the official archive.
"""
import argparse
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

CATALOG = "https://valorant.dyn.riotcdn.net/x/content-catalog/PublicContentCatalog-release-08.09.zip"
ROOT = Path(__file__).resolve().parent.parent


class RemoteZip(io.RawIOBase):
    def __init__(self, url):
        self.url = url
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as res:
            self.size = int(res.headers["Content-Length"])
        self.pos = 0
        self.cache_start = 0
        self.cache = b""

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos

    def read(self, size=-1):
        end = self.size if size < 0 else min(self.pos + size, self.size)
        if end <= self.pos:
            return b""
        if self.cache_start <= self.pos and end <= self.cache_start + len(self.cache):
            start = self.pos - self.cache_start
            data = self.cache[start:start + end - self.pos]
            self.pos = end
            return data
        fetch_end = min(self.size, max(end, self.pos + 131072))
        req = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{fetch_end - 1}", "User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as res:
            if res.status != 206:
                raise RuntimeError("Server did not honor the byte range; refusing a full ZIP download")
            self.cache = res.read()
        self.cache_start = self.pos
        data = self.cache[:end - self.pos]
        self.pos = end
        return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--pattern", default=r"(agent|character|weapon|gun).*(png)$")
    parser.add_argument("--selection", type=Path, help="JSON mapping local relative paths to archive member paths")
    parser.add_argument("--inspect-content", action="store_true")
    parser.add_argument("--download-ui-assets", action="store_true")
    parser.add_argument("--download-maps", action="store_true")
    args = parser.parse_args()
    with zipfile.ZipFile(RemoteZip(CATALOG)) as archive:
        if args.inspect_content:
            content = json.loads(archive.read("PublicContentCatalog.json"))
            print("Top-level keys:", list(content))
            for group in ("characters", "weapons", "maps"):
                for item in content.get(group, []):
                    print(group, item["id"], item["name"]["defaultText"])
                if content.get(group):
                    print("Item keys:", list(content[group][0]))
            return
        if args.list:
            for entry in archive.namelist():
                if re.search(args.pattern, entry, re.I):
                    print(entry)
            return
        selected = {}
        metadata = {}
        if args.download_maps:
            content = json.loads(archive.read("PublicContentCatalog.json"))
            for item in content["maps"]:
                name, uuid = item["name"]["defaultText"], item["id"]
                if name not in {"Ascent", "Haven", "Split", "Bind", "Lotus", "Icebox"}:
                    continue
                local = f"maps/{name.lower()}.png"
                selected[local] = f"Maps/{uuid}_splash.png"
                metadata[local] = {"id": uuid.lower(), "name": name, "kind": "maps"}
        elif args.download_ui_assets:
            content = json.loads(archive.read("PublicContentCatalog.json"))
            for group, folder in (("characters", "agents"), ("weapons", "weapons")):
                standard = {"Classic", "Shorty", "Frenzy", "Ghost", "Sheriff", "Stinger", "Spectre", "Bucky", "Judge", "Bulldog", "Guardian", "Phantom", "Vandal", "Marshal", "Outlaw", "Operator", "Ares", "Odin", "Melee"}
                for item in content[group]:
                    name, uuid = item["name"]["defaultText"], item["id"]
                    if group == "weapons" and (name not in standard or uuid == "C5DE005C-4BDC-26A7-A47D-C295EAAAE9D8"):
                        continue
                    if group == "characters" and uuid == "DED3520F-4264-BFED-162D-B080E2ABCCF9":
                        continue
                    slug = re.sub(r"[^a-z0-9]", "", name.lower())
                    local = f"{folder}/{slug}.png"
                    selected[local] = f"{'Characters' if group == 'characters' else 'Weapons'}/{uuid}{'_small' if group == 'characters' else ''}.png"
                    metadata[local] = {"id": uuid.lower(), "name": name, "kind": folder}
                    if group == "weapons":
                        selected[f"weapons/{slug}-kill.png"] = f"Weapons/{uuid}_killstream.png"
        elif args.selection:
            selected = json.loads(args.selection.read_text(encoding="utf-8"))
        else:
            parser.error("Use --list, --download-ui-assets or --selection")
        manifest = []
        asset_root = (ROOT / "public" / "assets").resolve()
        for local, member in selected.items():
            target = (asset_root / local).resolve()
            if not target.is_relative_to(asset_root):
                raise ValueError("Output must stay inside public/assets")
            data = archive.read(member)
            if not data.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError(f"Not a PNG: {member}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            manifest.append({"file": f"/assets/{local}", "archiveMember": member, "bytes": len(data), **metadata.get(local, {})})
            print(f"Downloaded {local}: {len(data)} bytes")
        manifest_name = "maps-manifest.json" if args.download_maps else "manifest.json"
        (asset_root / manifest_name).write_text(json.dumps({
            "source": CATALOG, "owner": "Riot Games", "catalogVersion": "08.09", "assets": manifest
        }, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
