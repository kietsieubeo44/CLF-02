import pypdf
import os

reader = pypdf.PdfReader(r"c:\Users\kiets\OneDrive\Hình ảnh\Máy tính\1\clf-c02-part-with-answer-1.pdf")
scratch_dir = r"C:\Users\kiets\.gemini\antigravity-ide\brain\317f7c45-5189-454c-b044-153c4634e666\scratch"
os.makedirs(scratch_dir, exist_ok=True)

def extract_images_from_page(page_num):
    page = reader.pages[page_num - 1]
    if '/Resources' in page and '/XObject' in page['/Resources']:
        xObject = page['/Resources']['/XObject'].get_object()
        img_idx = 0
        for obj in xObject:
            if xObject[obj]['/Subtype'] == '/Image':
                img_data = xObject[obj]
                ext = ".png" # default to png
                # Check if it has /Filter or other formats
                filter_type = img_data.get('/Filter')
                if filter_type == '/DCTDecode':
                    ext = ".jpg"
                elif filter_type == '/JPXDecode':
                    ext = ".jp2"
                
                try:
                    data = img_data.get_data()
                    filename = f"page_{page_num}_img_{img_idx}{ext}"
                    filepath = os.path.join(scratch_dir, filename)
                    with open(filepath, "wb") as fp:
                        fp.write(data)
                    print(f"Extracted image: {filename} ({len(data)} bytes)")
                    img_idx += 1
                except Exception as e:
                    print(f"Error extracting image {obj}: {e}")
    else:
        print(f"No XObject in Page {page_num}")

extract_images_from_page(3)
extract_images_from_page(7)
