from typing import List

from src.code_reviewer import CodeIssue


def apply_penalty(score: float, amount: float) -> float:
    if amount <= 0:
        raise ValueError("Penalty amount must be positive")
    return max(0.0, score - amount)


def calculate_final_score(issues: List[CodeIssue], base_score: float = 100.0) -> float:
    score = base_score
    for issue in issues:
        if issue.severity == "error":
            penalty = 10.0
        elif issue.severity == "warning":
            penalty = 5.0
        else:
            penalty = 1.0

        if penalty > 0:
            score = apply_penalty(score, penalty)

    return score


def adjust_score_for_complexity(score: float, complexity: float) -> float:
    penalty = complexity * 20
    if penalty > 0:
        score = apply_penalty(score, penalty)
    return score
