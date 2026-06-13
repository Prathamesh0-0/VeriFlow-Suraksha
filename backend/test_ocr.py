"""Test EasyOCR on bank statement"""
import pymupdf
import numpy as np
import easyocr
import time

print("Initializing EasyOCR reader (first time downloads model)...")
start = time.time()
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
print(f"Reader initialized in {time.time()-start:.1f}s")

doc = pymupdf.open(r'C:\Users\prath\Desktop\Projects\Suraksha Hackathon\DS\Packet_A_Genuine\2. BankStatement_A.pdf')
page = doc[0]
pix = page.get_pixmap(dpi=200)

# Convert PyMuPDF pixmap to numpy array
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
# If RGBA, convert to RGB
if pix.n == 4:
    img = img[:,:,:3]

print(f"Image shape: {img.shape}")
start = time.time()
results = reader.readtext(img, detail=0, paragraph=True)
print(f"OCR completed in {time.time()-start:.1f}s")
print("---TEXT---")
for line in results:
    print(line)
doc.close()
