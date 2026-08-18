import sys
import json
import fitz

def extract_pdf(path):
    document = fitz.open(path)

    pages = []

    for page in document:
        pages.append(page.get_text("text"))

    document.close()

    return {
        "text": "\n\n".join(pages).strip(),
        "pages": len(pages)
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "PDF path is required"}))
        sys.exit(1)

    try:
        print(json.dumps(
            extract_pdf(sys.argv[1]),
            ensure_ascii=False
        ))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
