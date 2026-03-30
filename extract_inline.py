#!/usr/bin/env python3
"""
Extract inline template and styles from Angular component .ts files
into separate .html and .css files, then update the .ts to use
templateUrl and styleUrl references.
"""
import re
import os
import sys

def extract_component(ts_path):
    """Extract inline template and styles from a .ts component file."""
    with open(ts_path, 'r') as f:
        content = f.read()

    dir_path = os.path.dirname(ts_path)
    base_name = os.path.basename(ts_path).replace('.ts', '')

    # Determine output filenames
    html_file = base_name.replace('.component', '.component') + '.html'
    css_file = base_name.replace('.component', '.component') + '.css'

    # If the file doesn't have .component in name (like app.ts), just use base
    if '.component' not in base_name:
        html_file = base_name + '.html'
        css_file = base_name + '.css'

    html_path = os.path.join(dir_path, html_file)
    css_path = os.path.join(dir_path, css_file)

    # Check if already uses external files
    if 'templateUrl' in content:
        print(f"  SKIP (already external): {ts_path}")
        return False

    # Extract template
    template_match = re.search(r"  template:\s*`\n?(.*?)`\s*,", content, re.DOTALL)
    if not template_match:
        template_match = re.search(r"  template:\s*`\n?(.*?)`\s*\}", content, re.DOTALL)
    if not template_match:
        print(f"  ERROR: Could not find template in {ts_path}")
        return False

    template_content = template_match.group(1)
    # Dedent: find minimum indentation and remove it
    lines = template_content.split('\n')
    # Remove leading/trailing empty lines
    while lines and lines[0].strip() == '':
        lines.pop(0)
    while lines and lines[-1].strip() == '':
        lines.pop()

    if lines:
        # Find minimum indentation (ignoring empty lines)
        min_indent = float('inf')
        for line in lines:
            if line.strip():
                indent = len(line) - len(line.lstrip())
                min_indent = min(min_indent, indent)
        if min_indent == float('inf'):
            min_indent = 0
        # Remove common indent
        dedented = []
        for line in lines:
            if line.strip():
                dedented.append(line[min_indent:])
            else:
                dedented.append('')
        template_content = '\n'.join(dedented) + '\n'
    else:
        template_content = ''

    # Extract styles
    styles_match = re.search(r"  styles:\s*\[\s*`\n?(.*?)`\s*\]", content, re.DOTALL)
    if not styles_match:
        print(f"  ERROR: Could not find styles in {ts_path}")
        return False

    styles_content = styles_match.group(1)
    # Dedent styles
    lines = styles_content.split('\n')
    while lines and lines[0].strip() == '':
        lines.pop(0)
    while lines and lines[-1].strip() == '':
        lines.pop()

    if lines:
        min_indent = float('inf')
        for line in lines:
            if line.strip():
                indent = len(line) - len(line.lstrip())
                min_indent = min(min_indent, indent)
        if min_indent == float('inf'):
            min_indent = 0
        dedented = []
        for line in lines:
            if line.strip():
                dedented.append(line[min_indent:])
            else:
                dedented.append('')
        styles_content = '\n'.join(dedented) + '\n'
    else:
        styles_content = ''

    # Write HTML and CSS files
    with open(html_path, 'w') as f:
        f.write(template_content)
    print(f"  Created: {html_path}")

    with open(css_path, 'w') as f:
        f.write(styles_content)
    print(f"  Created: {css_path}")

    # Replace template: `` with templateUrl and styles: [] with styleUrl in .ts
    # Replace template block
    new_content = re.sub(
        r"  template:\s*`\n?.*?`\s*,",
        f"  templateUrl: './{html_file}',",
        content,
        count=1,
        flags=re.DOTALL
    )

    # Replace styles block
    new_content = re.sub(
        r"  styles:\s*\[\s*`\n?.*?`\s*\]",
        f"  styleUrl: './{css_file}'",
        new_content,
        count=1,
        flags=re.DOTALL
    )

    with open(ts_path, 'w') as f:
        f.write(new_content)
    print(f"  Updated: {ts_path}")

    return True


# ATS Frontend components
ats_base = '/home/imperatorfrodo/Desktop/PersonalProjects/MyPortfolioWebsite/MyPortfolioWebsite/ats-frontend/src/app'
ats_components = [
    f'{ats_base}/app.component.ts',
    f'{ats_base}/pages/dashboard/dashboard.component.ts',
    f'{ats_base}/pages/jobs/jobs.component.ts',
    f'{ats_base}/pages/pipeline/pipeline.component.ts',
    f'{ats_base}/pages/talent/talent.component.ts',
]

# Portfolio Frontend components
fe_base = '/home/imperatorfrodo/Desktop/PersonalProjects/MyPortfolioWebsite/MyPortfolioWebsite/frontend/src/app'
fe_components = [
    f'{fe_base}/components/navbar/navbar.component.ts',
    f'{fe_base}/components/nav/nav.component.ts',
    f'{fe_base}/components/footer/footer.component.ts',
    f'{fe_base}/components/home/home.component.ts',
    f'{fe_base}/components/contact/contact.component.ts',
    f'{fe_base}/components/login/login.component.ts',
    f'{fe_base}/components/projects/projects.component.ts',
    f'{fe_base}/components/interactive-projects/interactive-projects.component.ts',
    f'{fe_base}/components/accessibility-statement/accessibility-statement.component.ts',
    f'{fe_base}/components/accessibility-toolbar/accessibility-toolbar.component.ts',
    f'{fe_base}/components/kali-terminal-loader/kali-terminal-loader.component.ts',
    f'{fe_base}/projects/project-gallery/project-gallery.component.ts',
    f'{fe_base}/projects/ai-chatbot/ai-chatbot.component.ts',
    f'{fe_base}/projects/code-playground/code-playground.component.ts',
    f'{fe_base}/projects/real-time-analytics/real-time-analytics.component.ts',
    f'{fe_base}/projects/task-manager/task-manager.component.ts',
]

all_components = ats_components + fe_components

print(f"Processing {len(all_components)} components...\n")

success = 0
failed = 0
skipped = 0

for path in all_components:
    print(f"\nProcessing: {os.path.basename(path)}")
    if not os.path.exists(path):
        print(f"  ERROR: File not found: {path}")
        failed += 1
        continue
    result = extract_component(path)
    if result:
        success += 1
    elif result is False and 'templateUrl' in open(path).read():
        skipped += 1
    else:
        failed += 1

print(f"\n{'='*50}")
print(f"Done! Success: {success}, Skipped: {skipped}, Failed: {failed}")
