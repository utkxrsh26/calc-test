import os
from flask import Flask, request, jsonify
from io import BytesIO
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
from flask_cors import CORS


os.environ["DOCTR_MULTIPROCESSING_DISABLE"] = "TRUE"
os.environ["DOCTR_CACHE_DIR"] = "/tmp/.cache/doctr"

app = Flask(__name__)
CORS(app) 


print("Loading OCR model...")
model = ocr_predictor(pretrained=True, cache_dir=os.environ["DOCTR_CACHE_DIR"])
print("OCR model loaded.")

def extract_text(ocr_result):
    """Extract plain text from the doctr OCR result."""
    pages_text = []
    for page in ocr_result.pages:
        page_lines = []
        # Loop through each block and line in the page.
        for block in page.blocks:
            for line in block.lines:
                line_text = " ".join(word.value for word in line.words)
                page_lines.append(line_text)
        pages_text.append("\n".join(page_lines))
    return "\n\n".join(pages_text)

@app.route('/ocr', methods=['POST'])
def ocr_pdf():
    print("Received OCR request")
    if 'pdf' not in request.files:
        print("No PDF file provided in the request.")
        return jsonify({"error": "No PDF file provided."}), 400

    pdf_file = request.files['pdf']
    print("PDF file received:", pdf_file.filename)

    try:
        pdf_bytes = BytesIO(pdf_file.read())
        size = pdf_bytes.getbuffer().nbytes
        print(f"Read PDF into memory, size: {size} bytes")
        doc = DocumentFile.from_pdf(pdf_bytes)
        print("PDF successfully parsed into a DocumentFile.")
    except Exception as e:
        print("Failed to read PDF:", e)
        return jsonify({"error": "Failed to read PDF.", "details": str(e)}), 400

    try:
        print("Starting OCR processing...")
        ocr_result = model(doc)
        print("OCR processing complete.")
        text = extract_text(ocr_result)
        print("Extracted text (first 100 chars):", text[:100])
    except Exception as e:
        print("OCR processing failed:", e)
        return jsonify({"error": "OCR processing failed.", "details": str(e)}), 500

    print("Returning JSON response with extracted text.")
    return jsonify({"text": text})

if __name__ == '__main__':
    app.run(debug=True)
