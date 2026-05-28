#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


WINDOWS = [
    (120, 430, 880, 1280),
    (920, 430, 1680, 1280),
    (120, 1450, 880, 2185),
    (920, 1450, 1680, 2185),
]

PIECE_TO_FEN = {
    "wk": "K",
    "wq": "Q",
    "wr": "R",
    "wb": "B",
    "wn": "N",
    "wp": "P",
    "bk": "k",
    "bq": "q",
    "br": "r",
    "bb": "b",
    "bn": "n",
    "bp": "p",
}


@dataclass(frozen=True)
class SquareRef:
    page: int
    board: int
    square: str
    label: str


TRAINING_FENS = {
    # PDF page 1, exercise 1-4.
    (0, 0): "4k3/1R6/4K3/8/8/8/8/8",
    (0, 1): "1k6/ppp5/6r1/8/8/8/5PPP/4R1K1",
    (0, 2): "2kr4/2p5/8/8/7R/1P4b1/6P1/6K1",
    (0, 3): "8/8/8/8/7r/1Npk4/K7/1R6",
    # PDF page 2-3, examples with queens and lower-page board placement.
    (1, 0): "1k6/qp6/3P4/7R/8/8/6P1/5RK1",
    (1, 1): "k7/q6R/Pb6/8/4R3/8/1B6/1K6",
    (1, 2): "3r2k1/7p/6p1/8/1R6/2P5/1PP1p3/2K5",
    (1, 3): "1kr5/1p6/8/8/8/5pP1/5B2/6RK",
    (2, 0): "1k6/8/1K6/8/8/5Q2/8/8",
    (2, 1): "1rk5/1rp5/8/4Q3/8/1P6/1K6/8",
    (2, 2): "6k1/6b1/7b/8/8/7q/8/3RKR2",
    (2, 3): "3q2k1/7p/7Q/8/8/6qP/6P1/6K1",
    # PDF page 11, exercise 41-44. These pages contain queens, bishops and knights.
    (10, 0): "K6q/1p4b1/2N5/8/6Pn/7P/5Q1k/8",
    (10, 1): "6k1/3B2bp/8/8/4n3/3P2q1/1QP5/7K",
    (10, 2): "rq3bk1/2pQ4/8/6N1/8/8/5PP1/5RK1",
    (10, 3): "6kq/2p5/1n1p4/6N1/8/7P/6P1/5QK1",
}


def clusters(values: list[int], min_sep: int = 50) -> list[int]:
    values = sorted(values)
    grouped: list[list[int]] = []
    for value in values:
        if not grouped or value - grouped[-1][-1] > min_sep:
            grouped.append([value])
        else:
            grouped[-1].append(value)
    return [round(sum(group) / len(group)) for group in grouped]


def detect_board(image: Image.Image, window: tuple[int, int, int, int], threshold: int = 190) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = window
    x_scores = [
        (sum(1 for y in range(y1, y2) if image.getpixel((x, y)) < threshold), x)
        for x in range(x1, x2)
    ]
    max_x = max(score for score, _ in x_scores)
    x_clusters = clusters([x for score, x in x_scores if score > max_x * 0.75])

    y_scores = [
        (sum(1 for x in range(x1, x2) if image.getpixel((x, y)) < threshold), y)
        for y in range(y1, y2)
    ]
    max_y = max(score for score, _ in y_scores)
    y_clusters = clusters([y for score, y in y_scores if score > max_y * 0.75])

    if len(x_clusters) < 2 or len(y_clusters) < 2:
        raise RuntimeError(f"Could not detect board in window {window}")

    return x_clusters[0], y_clusters[0], x_clusters[-1], y_clusters[-1]


def square_crop(image: Image.Image, rect: tuple[int, int, int, int], square: str) -> Image.Image:
    x0, y0, x1, y1 = rect
    file_index = ord(square[0]) - ord("a")
    rank_index = 8 - int(square[1])
    cell_w = (x1 - x0) / 8
    cell_h = (y1 - y0) / 8
    return image.crop(
        (
            round(x0 + file_index * cell_w + 4),
            round(y0 + rank_index * cell_h + 4),
            round(x0 + (file_index + 1) * cell_w - 4),
            round(y0 + (rank_index + 1) * cell_h - 4),
        )
    )


FEATURE_SIZE = 32
FEATURE_BITS = FEATURE_SIZE * FEATURE_SIZE


def square_color(square: str) -> int:
    file_index = ord(square[0]) - ord("a")
    rank_index = 8 - int(square[1])
    return (file_index + rank_index) % 2


def board_backgrounds(image: Image.Image, rect: tuple[int, int, int, int]) -> dict[int, list[int]]:
    samples: dict[int, list[list[int]]] = {0: [], 1: []}
    for rank in range(1, 9):
        for file_name in "abcdefgh":
            square = f"{file_name}{rank}"
            sample = square_crop(image, rect, square).resize((FEATURE_SIZE, FEATURE_SIZE))
            samples[square_color(square)].append(list(sample.getdata()))

    backgrounds: dict[int, list[int]] = {}
    for color, color_samples in samples.items():
        pixels: list[int] = []
        for index in range(FEATURE_BITS):
            values = sorted(sample[index] for sample in color_samples)
            pixels.append(values[len(values) // 2])
        backgrounds[color] = pixels
    return backgrounds


def feature(image: Image.Image, background: list[int] | None = None) -> int:
    sample = image.resize((FEATURE_SIZE, FEATURE_SIZE))
    value = 0
    for index, pixel in enumerate(sample.getdata()):
        if background is None:
            active = pixel < 150
        else:
            active = abs(pixel - background[index]) > 42
        if active:
            value |= 1 << index
    return value


def distance(a: int, b: int) -> float:
    return bin(a ^ b).count("1") / FEATURE_BITS


def fen_to_refs(page: int, board: int, fen: str) -> list[SquareRef]:
    refs: list[SquareRef] = []
    rows = fen.split("/")
    for row_index, row in enumerate(rows):
        file_index = 0
        rank = 8 - row_index
        for char in row:
            if char.isdigit():
                file_index += int(char)
                continue
            file_name = chr(ord("a") + file_index)
            color = "w" if char.isupper() else "b"
            piece = char.lower()
            piece_label = {
                "k": "k",
                "q": "q",
                "r": "r",
                "b": "b",
                "n": "n",
                "p": "p",
            }[piece]
            refs.append(SquareRef(page, board, f"{file_name}{rank}", f"{color}{piece_label}"))
            file_index += 1
    return refs


def build_fen(labels: dict[str, str]) -> str:
    rows: list[str] = []
    for rank in range(8, 0, -1):
        row = ""
        empty = 0
        for file_name in "abcdefgh":
            label = labels.get(f"{file_name}{rank}", "empty")
            fen_piece = PIECE_TO_FEN.get(label)
            if fen_piece:
                if empty:
                    row += str(empty)
                    empty = 0
                row += fen_piece
            else:
                empty += 1
        if empty:
            row += str(empty)
        rows.append(row)
    return "/".join(rows)


def classify_square(
    square_feature: int,
    templates: dict[str, list[int]],
) -> tuple[str, dict[str, float]]:
    scores = {
        label: min(distance(square_feature, template) for template in label_templates)
        for label, label_templates in templates.items()
    }
    best = min(scores, key=scores.get)

    active_pixels = bin(square_feature).count("1")

    # The PDF uses hatched dark squares. Features are calculated after subtracting
    # the board background, so truly empty squares should have very little residue.
    if active_pixels < 18 or scores["empty"] <= 0.045 or scores["empty"] <= scores[best] + 0.018:
        best = "empty"
    elif scores[best] > 0.4:
        best = "empty"

    return best, scores


def main() -> None:
    if len(sys.argv) not in (2, 3):
        print(
            "usage: extract-pdf-puzzles.py /path/to/extracted-page-images [validated-training.json]",
            file=sys.stderr,
        )
        sys.exit(2)

    image_dir = Path(sys.argv[1])
    training_fens = dict(TRAINING_FENS)
    if len(sys.argv) == 3:
        extra_training = json.loads(Path(sys.argv[2]).read_text())
        for item in extra_training:
            training_fens[(item["page"] - 1, item["board"] - 1)] = item["fenBoard"]

    image_paths = sorted(image_dir.glob("page-*.jpg"))
    pages = [Image.open(path).convert("L") for path in image_paths]
    rects = [[detect_board(page, window) for window in WINDOWS] for page in pages]
    backgrounds = [[board_backgrounds(page, rect) for rect in page_rects] for page, page_rects in zip(pages, rects)]

    templates: dict[str, list[int]] = {"empty": []}
    for label in PIECE_TO_FEN:
        templates[label] = []

    for (page_index, board_index), fen in training_fens.items():
        occupied = {ref.square: ref.label for ref in fen_to_refs(page_index, board_index, fen)}
        for square, label in occupied.items():
            templates[label].append(
                feature(
                    square_crop(pages[page_index], rects[page_index][board_index], square),
                    backgrounds[page_index][board_index][square_color(square)],
                )
            )
        for rank in range(1, 9):
            for file_name in "abcdefgh":
                square = f"{file_name}{rank}"
                if square not in occupied:
                    templates["empty"].append(
                        feature(
                            square_crop(pages[page_index], rects[page_index][board_index], square),
                            backgrounds[page_index][board_index][square_color(square)],
                        )
                    )

    puzzles = []
    for page_index, page in enumerate(pages):
        for board_index, rect in enumerate(rects[page_index]):
            labels: dict[str, str] = {}
            confidences: dict[str, float] = {}
            for rank in range(1, 9):
                for file_name in "abcdefgh":
                    square = f"{file_name}{rank}"
                    square_feature = feature(
                        square_crop(page, rect, square),
                        backgrounds[page_index][board_index][square_color(square)],
                    )
                    label, scores = classify_square(square_feature, templates)
                    if label != "empty":
                        labels[square] = label
                        sorted_scores = sorted(scores.values())
                        confidences[square] = sorted_scores[1] - sorted_scores[0]
            puzzles.append(
                {
                    "pdfIndex": page_index * 4 + board_index + 1,
                    "page": page_index + 1,
                    "board": board_index + 1,
                    "fenBoard": build_fen(labels),
                    "pieces": labels,
                    "confidence": confidences,
                    "rect": rect,
                }
            )

    print(json.dumps(puzzles, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
