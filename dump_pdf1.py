import pypdf

reader = pypdf.PdfReader(r"c:\Users\kiets\OneDrive\Hình ảnh\Máy tính\1\clf-c02-part-with-answer-1.pdf")
with open(r"C:\Users\kiets\.gemini\antigravity-ide\brain\317f7c45-5189-454c-b044-153c4634e666\scratch\pdf1_text_dump.txt", "w", encoding="utf-8") as f:
    for idx, page in enumerate(reader.pages[:30]):
        f.write(f"================ PAGE {idx+1} ================\n")
        f.write(page.extract_text() or "")
        f.write("\n\n")
print("Done writing text dump.")
