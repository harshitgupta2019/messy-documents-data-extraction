import sys
import json
import pymupdf


def extract_pdf(path):
    document = pymupdf.open(path)

    pages = []

    for page in document:
        pages.append(page.get_text("text"))

    document.close()

    return {
        "text": "\n\n".join(pages).strip(),
        "pages": len(pages),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "error": "PDF path is required"
        }))
        sys.exit(1)

    try:
        result = extract_pdf(sys.argv[1])

        print(json.dumps(
            result,
            ensure_ascii=False
        ))

    except Exception as exc:
        print(json.dumps({
            "error": str(exc)
        }))
        sys.exit(1)