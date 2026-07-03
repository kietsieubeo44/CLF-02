import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader(r"c:\Users\kiets\OneDrive\Hình ảnh\Máy tính\1\clf-c02-part-with-answer-2.pdf")

for page_num in [3, 7, 8]:
    print(f"================ PAGE {page_num} ================")
    print(reader.pages[page_num - 1].extract_text())
    print("=" * 50)
