import pypdf

reader = pypdf.PdfReader(r"c:\Users\kiets\OneDrive\Hình ảnh\Máy tính\1\clf-c02-part-with-answer-1.pdf")
print("Total pages:", len(reader.pages))

# Inspect page 3, 7 and see if they have images
for page_num in [3, 7]:
    page = reader.pages[page_num - 1]
    print(f"\n--- Page {page_num} ---")
    xObject = page['/Resources'].get('/XObject')
    if xObject:
        xObject = xObject.get_object()
        for obj in xObject:
            if xObject[obj]['/Subtype'] == '/Image':
                print(f"Image found: {obj}")
            else:
                print(f"Other object: {obj}, Subtype: {xObject[obj]['/Subtype']}")
    else:
        print("No XObject resources found.")
