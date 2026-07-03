import pypdf
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader(r"c:\Users\kiets\OneDrive\Hình ảnh\Máy tính\1\clf-c02-part-with-answer-2.pdf")
print("Total pages in PDF 2:", len(reader.pages))

text_by_page = []
for idx, page in enumerate(reader.pages):
    text_by_page.append(page.extract_text() or "")

# Let's search for "Topic 1 Question #..." or "Question #..."
questions_found = []
for page_idx, text in enumerate(text_by_page):
    matches = re.finditer(r'(?:Topic\s*1\s*)?Question\s*#\s*(\d+)', text, re.IGNORECASE)
    for m in matches:
        questions_found.append({
            'number': m.group(1),
            'page': page_idx + 1,
            'text_snippet': text[max(0, m.start() - 100):min(len(text), m.end() + 200)]
        })

print(f"Total question headers found: {len(questions_found)}")
print("\nFirst 5 question headers details:")
for q in questions_found[:5]:
    print(f"Question #{q['number']} on Page {q['page']}:")
    print(q['text_snippet'])
    print("-" * 50)
