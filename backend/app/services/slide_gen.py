from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Pt


async def agenerate_slides(
    session_id: int,
    content: dict,
    images_dir: Path,
    output_dir: Path,
) -> Path:
    """Generate a PPTX presentation from learning content and section images.

    Creates a title slide followed by one slide per content section. If a
    matching scene image exists in images_dir it is placed on the right half
    of the slide.

    Args:
        session_id: Unique session ID used in the output filename.
        content: GeneratedContent dict with title, overview, and sections.
        images_dir: Directory containing scene images named scene_XX.jpg.
        output_dir: Directory where the PPTX file will be saved.

    Returns:
        Path to the generated PPTX file.
    """
    prs = Presentation()
    prs.slide_width = Inches(16)
    prs.slide_height = Inches(9)

    # --- Title slide ---
    title_slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_slide.shapes.title.text = content["title"]
    subtitle_ph = title_slide.placeholders[1]
    subtitle_ph.text = content.get("overview", "")

    # --- Content slides ---
    for i, section in enumerate(content.get("sections", [])):
        slide = prs.slides.add_slide(prs.slide_layouts[5])  # blank layout

        # Section title text box
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(9), Inches(1))
        tf_title = title_box.text_frame
        tf_title.text = section["title"]
        para = tf_title.paragraphs[0]
        para.font.size = Pt(32)
        para.font.bold = True

        # Narration text box
        body_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(6))
        tf_body = body_box.text_frame
        tf_body.word_wrap = True
        tf_body.text = section["narration_text"]
        tf_body.paragraphs[0].font.size = Pt(18)

        # Optional section image on the right
        img_path = images_dir / f"scene_{str(i).zfill(2)}.jpg"
        if img_path.exists():
            slide.shapes.add_picture(
                str(img_path),
                Inches(10),
                Inches(1),
                Inches(5.5),
                Inches(7),
            )

    output_path = output_dir / f"lesson_{session_id}.pptx"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(output_path))
    return output_path
