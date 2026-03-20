from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

# Color palette
INDIGO = RGBColor(0x4F, 0x46, 0xE5)
DARK_BG = RGBColor(0x0F, 0x0F, 0x1A)
CARD_BG = RGBColor(0x1A, 0x1A, 0x2E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xCC, 0xCC, 0xDD)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
GREEN = RGBColor(0x22, 0xC5, 0x5E)
VIOLET = RGBColor(0x7C, 0x3A, 0xED)

SLIDE_W = Inches(16)
SLIDE_H = Inches(9)


def _set_slide_bg(slide, color: RGBColor):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def _add_text(
    slide,
    left,
    top,
    width,
    height,
    text,
    font_size=18,
    bold=False,
    color=WHITE,
    alignment=PP_ALIGN.LEFT,
    font_name="Calibri",
):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font_name
    p.alignment = alignment
    return tf


def _add_image_safe(slide, img_path: Path, left, top, width, height):
    if img_path.exists():
        slide.shapes.add_picture(str(img_path), left, top, width, height)
        return True
    return False


def _make_title_slide(prs, content: dict):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    _set_slide_bg(slide, DARK_BG)

    # Accent bar at top
    shape = slide.shapes.add_shape(
        1,
        Inches(0),
        Inches(0),
        SLIDE_W,
        Inches(0.08),  # 1 = rectangle
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = INDIGO
    shape.line.fill.background()

    # Title
    _add_text(
        slide,
        Inches(1.5),
        Inches(2.5),
        Inches(13),
        Inches(2),
        content["title"],
        font_size=48,
        bold=True,
        color=WHITE,
        alignment=PP_ALIGN.CENTER,
        font_name="Calibri Light",
    )

    # Overview subtitle
    overview = content.get("overview", "")
    if overview:
        _add_text(
            slide,
            Inches(2),
            Inches(4.8),
            Inches(12),
            Inches(1.5),
            overview,
            font_size=22,
            color=MUTED,
            alignment=PP_ALIGN.CENTER,
        )

    # Section count badge
    num_sections = len(content.get("sections", []))
    _add_text(
        slide,
        Inches(5),
        Inches(7),
        Inches(6),
        Inches(0.8),
        f"{num_sections} sections  •  Interactive quiz included",
        font_size=16,
        color=LIGHT_GRAY,
        alignment=PP_ALIGN.CENTER,
    )


def _make_section_slide(prs, i: int, section: dict, total: int, images_dir: Path):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    _set_slide_bg(slide, DARK_BG)

    # Section number badge (top-left)
    _add_text(
        slide,
        Inches(0.6),
        Inches(0.4),
        Inches(1.5),
        Inches(0.6),
        f"{i + 1} / {total}",
        font_size=14,
        color=INDIGO,
        bold=True,
    )

    # Section title
    _add_text(
        slide,
        Inches(0.6),
        Inches(1.0),
        Inches(8.5),
        Inches(1),
        section["title"],
        font_size=34,
        bold=True,
        color=WHITE,
        font_name="Calibri Light",
    )

    # Accent line under title
    shape = slide.shapes.add_shape(1, Inches(0.6), Inches(2.1), Inches(2), Inches(0.05))
    shape.fill.solid()
    shape.fill.fore_color.rgb = INDIGO
    shape.line.fill.background()

    # Narration text (left column)
    _add_text(
        slide,
        Inches(0.6),
        Inches(2.5),
        Inches(8.5),
        Inches(5.5),
        section["narration_text"],
        font_size=18,
        color=LIGHT_GRAY,
    )

    # Images (right column) — up to 3 stacked
    img_y = Inches(0.5)
    img_x = Inches(9.8)
    img_w = Inches(5.8)

    # Find all images for this section
    image_files = sorted(images_dir.glob(f"scene_{i:02d}_*.jpg"))
    if not image_files:
        # Fallback to old naming
        image_files = [images_dir / f"scene_{i:02d}.jpg"]

    num_images = min(len([f for f in image_files if f.exists()]), 3)
    if num_images == 0:
        return

    img_gap = Inches(0.2)
    available_h = Inches(8.0)
    if num_images > 0:
        img_h_each = (available_h - img_gap * (num_images - 1)) / num_images
    else:
        img_h_each = available_h

    for img_file in image_files[:3]:
        _add_image_safe(slide, img_file, img_x, img_y, img_w, img_h_each)
        img_y += img_h_each + img_gap


def _make_quiz_slides(prs, quiz_questions: list[dict]):
    if not quiz_questions:
        return

    # Quiz title slide
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_slide_bg(slide, DARK_BG)

    _add_text(
        slide,
        Inches(1),
        Inches(3),
        Inches(14),
        Inches(2),
        "Knowledge Check",
        font_size=48,
        bold=True,
        color=WHITE,
        alignment=PP_ALIGN.CENTER,
        font_name="Calibri Light",
    )
    _add_text(
        slide,
        Inches(3),
        Inches(5.2),
        Inches(10),
        Inches(1),
        f"{len(quiz_questions)} questions to test your understanding",
        font_size=20,
        color=MUTED,
        alignment=PP_ALIGN.CENTER,
    )

    # One slide per question
    for qi, q in enumerate(quiz_questions):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        _set_slide_bg(slide, DARK_BG)

        # Question number
        _add_text(
            slide,
            Inches(0.8),
            Inches(0.5),
            Inches(2),
            Inches(0.6),
            f"Question {qi + 1} of {len(quiz_questions)}",
            font_size=14,
            color=INDIGO,
            bold=True,
        )

        # Question text
        _add_text(
            slide,
            Inches(0.8),
            Inches(1.5),
            Inches(14),
            Inches(1.5),
            q["question"],
            font_size=28,
            bold=True,
            color=WHITE,
        )

        # Options as cards
        option_y = Inches(3.5)
        for oi, opt in enumerate(q.get("options", [])):
            letter = chr(65 + oi)
            is_correct = oi == q.get("correct_index", -1)

            # Option background card
            card = slide.shapes.add_shape(1, Inches(1.5), option_y, Inches(13), Inches(0.9))
            card.fill.solid()
            card.fill.fore_color.rgb = CARD_BG
            card.line.color.rgb = GREEN if is_correct else RGBColor(0x2D, 0x2D, 0x4E)
            card.line.width = Pt(2) if is_correct else Pt(1)

            # Option text
            _add_text(
                slide,
                Inches(1.8),
                option_y + Inches(0.15),
                Inches(12.5),
                Inches(0.6),
                f"{letter})  {opt}",
                font_size=18,
                color=GREEN if is_correct else LIGHT_GRAY,
                bold=is_correct,
            )

            option_y += Inches(1.1)

        # Explanation at bottom
        explanation = q.get("explanation", "")
        if explanation:
            _add_text(
                slide,
                Inches(1.5),
                Inches(7.5),
                Inches(13),
                Inches(1),
                f"💡 {explanation}",
                font_size=14,
                color=MUTED,
            )


def _make_summary_slide(prs, content: dict):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_slide_bg(slide, DARK_BG)

    _add_text(
        slide,
        Inches(1),
        Inches(1),
        Inches(14),
        Inches(1.5),
        "Recap",
        font_size=42,
        bold=True,
        color=WHITE,
        alignment=PP_ALIGN.CENTER,
        font_name="Calibri Light",
    )

    # List all section titles as key takeaways
    sections = content.get("sections", [])
    y = Inches(3)
    for i, section in enumerate(sections):
        # Number circle
        _add_text(
            slide,
            Inches(2),
            y,
            Inches(0.8),
            Inches(0.6),
            str(i + 1),
            font_size=20,
            bold=True,
            color=INDIGO,
            alignment=PP_ALIGN.CENTER,
        )
        # Section title
        _add_text(
            slide,
            Inches(3),
            y,
            Inches(10),
            Inches(0.6),
            section["title"],
            font_size=22,
            color=LIGHT_GRAY,
        )
        y += Inches(1)

    # Bottom accent
    shape = slide.shapes.add_shape(1, Inches(6), Inches(7.8), Inches(4), Inches(0.05))
    shape.fill.solid()
    shape.fill.fore_color.rgb = INDIGO
    shape.line.fill.background()

    _add_text(
        slide,
        Inches(3),
        Inches(8),
        Inches(10),
        Inches(0.6),
        "Great job completing this lesson!",
        font_size=18,
        color=MUTED,
        alignment=PP_ALIGN.CENTER,
    )


async def agenerate_slides(
    session_id: int,
    content: dict,
    images_dir: Path,
    output_dir: Path,
) -> Path:
    """Generate a polished PPTX presentation from learning content."""
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    sections = content.get("sections", [])

    # 1. Title slide
    _make_title_slide(prs, content)

    # 2. Content slides (one per section)
    for i, section in enumerate(sections):
        _make_section_slide(prs, i, section, len(sections), images_dir)

    # 3. Summary/recap slide
    _make_summary_slide(prs, content)

    # 4. Quiz slides (title + one per question)
    _make_quiz_slides(prs, content.get("quiz_questions", []))

    output_path = output_dir / f"lesson_{session_id}.pptx"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(output_path))
    return output_path
