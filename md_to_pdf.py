#!/usr/bin/env python3
"""Convert PROJECT_SUMMARY.md to PDF with complete content"""

from fpdf import FPDF
import re

class PDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=15)
        self.set_left_margin(15)
        self.set_right_margin(15)

    def header(self):
        self.set_font('Helvetica', 'B', 10)
        self.cell(0, 10, 'SonicSoothe: Technical Project Summary')
        self.ln(15)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def parse_and_add_content(pdf, content):
    """Parse markdown and add to PDF"""
    lines = content.split('\n')

    for line in lines:
        # Skip empty lines
        if not line.strip():
            pdf.ln(3)
            continue

        # H1 headers
        if line.startswith('# '):
            pdf.set_font('Helvetica', 'B', 16)
            pdf.multi_cell(0, 8, line[2:].strip())
            pdf.ln(2)

        # H2 headers
        elif line.startswith('## '):
            pdf.set_font('Helvetica', 'B', 14)
            pdf.multi_cell(0, 7, line[3:].strip())
            pdf.ln(1)

        # H3 headers
        elif line.startswith('### '):
            pdf.set_font('Helvetica', 'B', 12)
            pdf.multi_cell(0, 6, line[4:].strip())
            pdf.ln(1)

        # H4 headers
        elif line.startswith('#### '):
            pdf.set_font('Helvetica', 'B', 11)
            pdf.multi_cell(0, 6, line[5:].strip())
            pdf.ln(1)

        # Horizontal rule
        elif line.strip() == '---':
            pdf.ln(2)

        # Numbered lists
        elif re.match(r'^\d+\.', line.strip()):
            pdf.set_font('Helvetica', '', 10)
            # Remove markdown bold markers
            clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', line.strip())
            try:
                pdf.multi_cell(0, 5, clean_line)
            except:
                # Skip if line is too long
                pass

        # Bullet points
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            pdf.set_font('Helvetica', '', 10)
            clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', line.strip()[2:])
            try:
                pdf.multi_cell(0, 5, '  - ' + clean_line)
            except:
                pass

        # Bold text (starts with **)
        elif line.strip().startswith('**'):
            pdf.set_font('Helvetica', 'B', 10)
            clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', line.strip())
            try:
                pdf.multi_cell(0, 5, clean_line)
            except:
                pass

        # Regular paragraphs
        else:
            pdf.set_font('Helvetica', '', 10)
            # Remove markdown bold markers
            clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', line.strip())
            if clean_line:
                try:
                    pdf.multi_cell(0, 5, clean_line)
                except:
                    pass

def main():
    # Read the markdown file
    with open('PROJECT_SUMMARY.md', 'r', encoding='utf-8') as f:
        content = f.read()

    # Create PDF
    pdf = PDF()
    pdf.add_page()

    # Parse and add content
    parse_and_add_content(pdf, content)

    # Save PDF
    pdf.output('PROJECT_SUMMARY.pdf')
    print("Successfully converted PROJECT_SUMMARY.md to PROJECT_SUMMARY.pdf")
    print(f"Total pages: {pdf.page_no()}")

if __name__ == "__main__":
    main()
