#!/usr/bin/env python3
"""Convert PROJECT_SUMMARY.md to PDF"""

from markdown_pdf import MarkdownPdf, Section

def main():
    # Create PDF from markdown
    pdf = MarkdownPdf(toc_level=2)

    # Add the markdown file
    pdf.add_section(Section("PROJECT_SUMMARY.md"))

    # Save to PDF
    pdf.save("PROJECT_SUMMARY.pdf")
    print("Successfully converted PROJECT_SUMMARY.md to PROJECT_SUMMARY.pdf")

if __name__ == "__main__":
    main()
