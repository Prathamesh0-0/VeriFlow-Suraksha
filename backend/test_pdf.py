import pymupdf
import sys

doc = pymupdf.open(r'C:\Users\prath\Desktop\Projects\Suraksha Hackathon\DS\Packet_A_Genuine\2. BankStatement_A.pdf')
page = doc[0]

# Method: Extract text with dict mode
blocks = page.get_text('dict')
print('Blocks keys:', list(blocks.keys()))
print('Num blocks:', len(blocks.get('blocks', [])))
for b in blocks.get('blocks', [])[:5]:
    btype = b.get('type')
    bbox = b.get('bbox')
    print(f'Block type: {btype}, bbox: {bbox}')
    if btype == 0:  # text block
        for line in b.get('lines', []):
            for span in line.get('spans', []):
                print(f'  TEXT: {span.get("text")}')

imgs = page.get_images(full=True)
print(f'\nImages: {len(imgs)}')
for img_info in imgs:
    xref = img_info[0]
    img_data = doc.extract_image(xref)
    print(f'  xref={xref}, ext={img_data["ext"]}, w={img_data["width"]}, h={img_data["height"]}')

doc.close()
