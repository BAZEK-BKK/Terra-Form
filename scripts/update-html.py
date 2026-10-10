import re
import os

html_files = ['en/index.html', 'fr/index.html', 'th/index.html']

new_picture = '''<picture>
  <source media="(min-width: 1200px)" srcset="../assets/images/hero-desktop.avif" type="image/avif" />
  <source media="(min-width: 768px)" srcset="../assets/images/hero-tablet.avif" type="image/avif" />
  <source srcset="../assets/images/hero-mobile.avif" type="image/avif" />
  <source media="(min-width: 1200px)" srcset="../assets/images/hero-desktop.webp" type="image/webp" />
  <source media="(min-width: 768px)" srcset="../assets/images/hero-tablet.webp" type="image/webp" />
  <source srcset="../assets/images/hero-mobile.webp" type="image/webp" />
  <img alt="Contemporary Thai house in concrete and timber with a tropical garden" class="ll-hero2-visual-img" loading="eager" width="1440" height="2880" decoding="async" src="../assets/images/hero-desktop.webp" />
</picture>'''

for f in html_files:
  if os.path.exists(f):
    with open(f, 'r', encoding='utf-8') as file:
      content = file.read()
    content = re.sub(r'<picture>.*?</picture>', new_picture, content, flags=re.DOTALL)
    with open(f, 'w', encoding='utf-8') as file:
      file.write(content)
    print(f"Updated {f}")
