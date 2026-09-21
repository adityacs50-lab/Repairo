"""Download the DESIGN.md fonts (Inter, DM Mono, Pixelify Sans) into fonts2/."""
import re, os, urllib.request
CSS = ("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700"
       "&family=DM+Mono:wght@400;500&family=Pixelify+Sans:wght@400;600;700&display=swap")
req = urllib.request.Request(CSS, headers={"User-Agent": "Mozilla/5.0"})
css = urllib.request.urlopen(req).read().decode()
os.makedirs("fonts2", exist_ok=True)
seen = set()
for b in re.findall(r"@font-face \{(.*?)\}", css, re.S):
    fam = re.search(r"font-family: '([^']+)'", b).group(1)
    w   = re.search(r"font-weight: (\d+)", b).group(1)
    url = re.search(r"url\((https[^)]+)\)", b).group(1)
    name = f"{fam.replace(' ','')}-{w}.ttf"
    if name in seen:
        continue
    seen.add(name)
    urllib.request.urlretrieve(url, f"fonts2/{name}")
    print("fonts2/" + name)
