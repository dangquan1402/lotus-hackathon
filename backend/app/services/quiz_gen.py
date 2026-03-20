async def aget_quiz(content: dict) -> list[dict]:
    """Extract quiz questions from generated content.

    Args:
        content: GeneratedContent dict containing quiz_questions.

    Returns:
        List of quiz question dicts.
    """
    return content.get("quiz_questions", [])


def score_quiz(questions: list[dict], answers: list[int]) -> dict:
    """Score submitted quiz answers against the correct answers.

    Args:
        questions: List of question dicts with correct_index and explanation fields.
        answers: List of submitted answer indices, one per question.

    Returns:
        Dict with keys: total, correct, score (0-100 float), results (per-question details).
    """
    results = []
    correct_count = 0

    for i, (q, a) in enumerate(zip(questions, answers)):
        is_correct = q.get("correct_index") == a
        if is_correct:
            correct_count += 1
        results.append(
            {
                "question_index": i,
                "question": q.get("question", ""),
                "submitted_index": a,
                "correct_index": q.get("correct_index"),
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            }
        )

    total = max(len(questions), 1)
    return {
        "total": len(questions),
        "correct": correct_count,
        "score": correct_count / total * 100,
        "results": results,
    }
