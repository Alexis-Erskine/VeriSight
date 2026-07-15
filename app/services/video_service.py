import os

from flask import current_app


class VideoService:

    ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm"}
    ALLOWED_MIMETYPES = {
        "video/mp4", "video/x-msvideo", "video/quicktime",
        "video/x-matroska", "video/webm",
    }
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB

    def validate_video(self, file):
        filename = file.filename or ""

        if not filename:
            raise ValueError("No file provided")

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Invalid file extension '{ext}'. "
                f"Allowed: {', '.join(sorted(self.ALLOWED_EXTENSIONS))}"
            )

        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)

        if size > self.MAX_FILE_SIZE:
            max_mb = self.MAX_FILE_SIZE // (1024 * 1024)
            raise ValueError(f"File exceeds maximum size of {max_mb} MB")

        return True
