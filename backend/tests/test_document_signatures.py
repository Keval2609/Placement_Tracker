import io
from types import SimpleNamespace
from zipfile import ZipFile

import docx
import pytest
from fastapi import HTTPException

from app.services.parsers import validate_and_parse_file, validate_document_signature


def test_valid_docx_with_misleading_metadata():
    content = io.BytesIO()
    document = docx.Document()
    document.add_paragraph("A placement notice")
    document.save(content)
    text, kind = validate_and_parse_file(
        SimpleNamespace(filename="wrong.pdf", content_type="application/pdf"), content.getvalue()
    )
    assert kind == "docx"
    assert "A placement notice" in text


def test_pdf_signature():
    assert validate_document_signature(b"%PDF-1.7\n") == "pdf"


@pytest.mark.parametrize("content", [b"", b"arbitrary text", b"\xd0\xcf\x11\xe0legacy doc"])
def test_spoofed_upload_rejected(content):
    with pytest.raises(HTTPException) as exc:
        validate_and_parse_file(
            SimpleNamespace(filename="fake.pdf", content_type="application/pdf"), content
        )
    assert exc.value.status_code == 400


def test_arbitrary_zip_rejected():
    content = io.BytesIO()
    with ZipFile(content, "w") as archive:
        archive.writestr("readme.txt", "hello")
    with pytest.raises(HTTPException):
        validate_document_signature(content.getvalue())
