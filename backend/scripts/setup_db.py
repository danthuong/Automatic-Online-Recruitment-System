#!/usr/bin/env python3
"""
Data preparation script: Process train.csv into problems.json with difficulty filtering.

Input: train.csv with columns: problem_id, question, solutions, input_output, difficulty, url, starter_code
Output: backend/data/problems.json

Difficulty mapping:
- "introductory" -> EASY
- "interview" -> MEDIUM
- "competition" -> HARD (not used in current interview flow)
"""
import json
import os
import sys
import pandas as pd


def parse_input_output(io_str: str) -> list:
    """Parse input_output JSON string into test cases."""
    try:
        data = json.loads(io_str)
        inputs = data.get("inputs", [])
        outputs = data.get("outputs", [])

        test_cases = []
        for inp, out in zip(inputs, outputs):
            test_cases.append({
                "input": inp.strip(),
                "expected_output": out.strip()
            })
        return test_cases
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Warning: Failed to parse input_output: {e}")
        return []


def process_csv_to_problems(csv_path: str, output_path: str, max_problems: int = 50):
    """
    Process train.csv into problems.json.

    Args:
        csv_path: Path to train.csv
        output_path: Path to output problems.json
        max_problems: Maximum number of problems to extract
    """
    print(f"Reading CSV from: {csv_path}")

    # Read CSV
    df = pd.read_csv(csv_path)
    print(f"Total rows in CSV: {len(df)}")

    # Group by difficulty and sample proportionally
    difficulty_map = {
        "introductory": "easy",
        "interview": "medium",
        "competition": "hard"
    }

    # Filter rows with valid JSON in input_output column, group by difficulty
    easy_rows = []
    medium_rows = []
    hard_rows = []

    for idx, row in df.iterrows():
        try:
            io_str = row.get('input_output')
            if pd.isna(io_str):
                continue

            # Try to parse to verify it's valid JSON
            test_cases = parse_input_output(io_str)
            if not test_cases:
                continue

            difficulty_raw = str(row.get('difficulty', '')).lower()
            difficulty = difficulty_map.get(difficulty_raw, "medium")

            if difficulty == "easy":
                easy_rows.append((idx, row, test_cases))
            elif difficulty == "medium":
                medium_rows.append((idx, row, test_cases))
            else:
                hard_rows.append((idx, row, test_cases))
        except Exception as e:
            continue

    print(f"Valid rows with parseable input_output: EASY={len(easy_rows)}, MEDIUM={len(medium_rows)}, HARD={len(hard_rows)}")

    # Sample proportionally: roughly 1/3 EASY, 1/3 MEDIUM, 1/3 HARD
    # For 50 problems: ~17 EASY, ~17 MEDIUM, ~16 HARD
    samples_per_difficulty = max_problems // 3

    import random
    random.seed(42)  # For reproducibility

    selected_easy = random.sample(easy_rows, min(samples_per_difficulty, len(easy_rows)))
    selected_medium = random.sample(medium_rows, min(samples_per_difficulty, len(medium_rows)))
    selected_hard = random.sample(hard_rows, min(samples_per_difficulty + (max_problems % 3), len(hard_rows)))

    valid_rows = selected_easy + selected_medium + selected_hard
    random.shuffle(valid_rows)

    # Extract problem data
    problems = []
    for idx, row, test_cases in valid_rows[:max_problems]:
        difficulty_raw = str(row.get('difficulty', '')).lower()
        difficulty = difficulty_map.get(difficulty_raw, "medium")

        problem = {
            "id": int(row.get('problem_id', idx)),
            "title": f"Problem {int(row.get('problem_id', idx))}",
            "difficulty": difficulty,
            "description": str(row.get('question', ''))[:5000],  # Truncate very long descriptions
            "test_cases": test_cases,
            "url": str(row.get('url', '')),
            "starter_code": str(row.get('starter_code', '')) if pd.notna(row.get('starter_code')) else ""
        }
        problems.append(problem)

    # Create output directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(problems, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved {len(problems)} problems to: {output_path}")

    # Print distribution by difficulty
    easy_count = sum(1 for p in problems if p['difficulty'] == 'easy')
    medium_count = sum(1 for p in problems if p['difficulty'] == 'medium')
    hard_count = sum(1 for p in problems if p['difficulty'] == 'hard')

    print(f"Difficulty distribution:")
    print(f"  - EASY (introductory): {easy_count}")
    print(f"  - MEDIUM (interview): {medium_count}")
    print(f"  - HARD (competition): {hard_count}")

    return problems


if __name__ == "__main__":
    # Determine paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "..", "train.csv")
    output_path = os.path.join(base_dir, "data", "problems.json")

    # Handle relative path if running from project root
    if not os.path.exists(csv_path):
        csv_path = "train.csv"
    if not os.path.exists(csv_path):
        csv_path = os.path.join(os.getcwd(), "train.csv")

    print(f"Base directory: {base_dir}")
    print(f"CSV path: {csv_path}")
    print(f"Output path: {output_path}")

    # Run processing
    problems = process_csv_to_problems(csv_path, output_path)
    print("\nDone!")