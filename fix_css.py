import os
import re
import glob

replacements = [
    (r"background:\s*(?:#ffffff|#fff)\b", "background: var(--bg-card)"),
    (r"background-color:\s*(?:#ffffff|#fff)\b", "background-color: var(--bg-card)"),
    (r"background:\s*(?:#fafaf9|#f9fafb|#f3f4f6|#f1f5f9|#f5f5f3|#f8fafc)\b", "background: var(--bg-subtle)"),
    (r"background-color:\s*(?:#fafaf9|#f9fafb|#f3f4f6|#f1f5f9|#f5f5f3|#f8fafc)\b", "background-color: var(--bg-subtle)"),
    (r"color:\s*(?:#1a1a1a|#000000|#000|#1f2937|#111827|#0f172a)\b", "color: var(--text-main)"),
    (r"color:\s*(?:#374151|#334155)\b", "color: var(--text-body)"),
    (r"color:\s*(?:#73726c|#4b5563|#6b7280|#475569|#64748b|#94a3b8)\b", "color: var(--text-muted)"),
    (r"border:\s*([\d\.]+)px\s+solid\s+(?:rgba\([^)]+\)|#[0-9a-fA-F]{3,6})\b", r"border: \1px solid var(--border-color)"),
    (r"border-bottom:\s*([\d\.]+)px\s+solid\s+(?:rgba\([^)]+\)|#[0-9a-fA-F]{3,6})\b", r"border-bottom: \1px solid var(--border-color)"),
    (r"border-top:\s*([\d\.]+)px\s+solid\s+(?:rgba\([^)]+\)|#[0-9a-fA-F]{3,6})\b", r"border-top: \1px solid var(--border-color)"),
    (r"border-color:\s*(?:rgba\([^)]+\)|#[0-9a-fA-F]{3,6})\b", "border-color: var(--border-color)"),
]

css_files = glob.glob("frontend/src/**/*.module.css", recursive=True)

for file_path in css_files:
    if "index.css" in file_path:
        continue
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)

    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")

print("Done replacing CSS variables!")
