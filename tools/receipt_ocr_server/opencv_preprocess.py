from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import cv2
import numpy as np


@dataclass(frozen=True)
class PreprocessResult:
    image_bytes: bytes
    mime: Literal["image/jpeg", "image/png"]
    did_warp: bool
    width: int
    height: int


def _order_points(pts: np.ndarray) -> np.ndarray:
    # pts: (4,2)
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # tl
    rect[2] = pts[np.argmax(s)]  # br
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # tr
    rect[3] = pts[np.argmax(diff)]  # bl
    return rect


def _four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect

    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_w = int(max(width_a, width_b))

    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_h = int(max(height_a, height_b))

    max_w = max(1, max_w)
    max_h = max(1, max_h)

    dst = np.array(
        [[0, 0], [max_w - 1, 0], [max_w - 1, max_h - 1], [0, max_h - 1]],
        dtype="float32",
    )

    m = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, m, (max_w, max_h))


def preprocess_receipt_image(
    image_bytes: bytes,
    *,
    max_long_edge: int = 2000,
    output_format: Literal["jpeg", "png"] = "jpeg",
    jpeg_quality: int = 85,
) -> PreprocessResult:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    h, w = img.shape[:2]
    scale = min(1.0, float(max_long_edge) / float(max(h, w)))
    if scale < 1.0:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    did_warp = False
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(gray, 50, 150)

        cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:8]

        screen_cnt = None
        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4 and cv2.contourArea(approx) > (img.shape[0] * img.shape[1] * 0.12):
                screen_cnt = approx
                break

        if screen_cnt is not None:
            warped = _four_point_transform(img, screen_cnt.reshape(4, 2).astype("float32"))
            if warped is not None and warped.size > 0:
                img = warped
                did_warp = True
    except Exception:
        # Contour finding is best-effort; OCR should still run on resized original.
        did_warp = False

    out_h, out_w = img.shape[:2]

    if output_format == "png":
        ok, buf = cv2.imencode(".png", img)
        if not ok:
            raise RuntimeError("Failed to encode PNG")
        return PreprocessResult(bytes(buf), "image/png", did_warp, out_w, out_h)

    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)])
    if not ok:
        raise RuntimeError("Failed to encode JPEG")
    return PreprocessResult(bytes(buf), "image/jpeg", did_warp, out_w, out_h)

