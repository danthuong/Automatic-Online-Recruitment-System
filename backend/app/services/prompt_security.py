"""
Prompt Security Module - Anti-Prompt Injection

Provides functions to detect and sanitize potential prompt injection attempts
before they reach the LLM.
"""
import logging
import re
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

# Maximum input/output lengths
MAX_INPUT_LENGTH = 500  # characters
MAX_OUTPUT_LENGTH = 1500  # characters
MAX_HISTORY_LENGTH = 5  # messages to keep

# High-risk patterns that indicate prompt injection attempts
HIGH_RISK_PATTERNS = [
    r"(?i)^ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"(?i)^forget\s+(everything|all|your\s+instructions)",
    r"(?i)^you\s+are\s+(now\s+)?(a\s+)?(different|new|evil)",
    r"(?i)^system\s*:\s*",
    r"(?i)^human\s*:\s*",
    r"(?i)^assistant\s*:\s*",
    r"(?i)^roleplay\s+as",
    r"(?i)^new\s+system\s+(prompt|instructions)",
    r"(?i)^delimit.*[\[{]",
    r"```system|```xml|```json",
]

# Medium-risk patterns - sanitize but don't block
MEDIUM_RISK_PATTERNS = [
    r"(?i)ignore\s+previous",
    r"(?i)forget\s+everything",
    r"(?i)system\s+prompt",
    r"(?i)your\s+instructions\s+are",
]


def detect_injection(message: str) -> Tuple[bool, str]:
    """Detect potential prompt injection attempts.

    Args:
        message: The user input to check

    Returns:
        Tuple of (is_blocked, reason). If is_blocked is True, the message should be rejected.
    """
    message_lower = message.lower().strip()

    # Check high-risk patterns
    for pattern in HIGH_RISK_PATTERNS:
        if re.search(pattern, message):
            return True, f"High-risk pattern detected: {pattern}"

    # Check for excessive length (potential injection)
    if len(message) > MAX_INPUT_LENGTH:
        return True, "Input exceeds maximum length"

    return False, ""


def sanitize_input(message: str) -> str:
    """Sanitize user input before embedding in prompt.

    Args:
        message: The raw user input

    Returns:
        Sanitized string safe for embedding in prompts
    """
    # Remove null bytes and control characters
    message = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', message)

    # Escape markdown code blocks to prevent delimiter injection
    message = message.replace("```", "\\`\\`\\`")

    # Remove potential delimiter injection at start of lines
    message = re.sub(r'^```\w*', '', message, flags=re.MULTILINE)

    # Truncate to max length
    if len(message) > MAX_INPUT_LENGTH:
        message = message[:MAX_INPUT_LENGTH]

    return message.strip()


def sanitize_history(history: Optional[List[dict]]) -> str:
    """Sanitize conversation history.

    Args:
        history: List of message dicts with 'role' and 'content' keys

    Returns:
        Sanitized history string
    """
    if not history:
        return ""

    sanitized = []
    for msg in history[-MAX_HISTORY_LENGTH:]:  # Only keep last N messages
        role = msg.get("role", "user")
        content = sanitize_input(msg.get("content", ""))
        sanitized.append(f"{role}: {content}")

    return "\n".join(sanitized)


# Patterns that indicate solution leakage
SOLUTION_LEAK_PATTERNS = [
    r"here(?:'s| is) (the |a )?solution",
    r"here(?:'s| is) (the |a )?code",
    r"here(?:'s| is) (the |a )?answer",
    r"def\s+\w+\s*\([^)]*\)\s*:",  # Full function definition
    r"class\s+\w+:",  # Full class definition
    r"```python\n[\s\S]{50,}```",  # Long Python code block (likely full solution)
    r"```[\s\S]{50,}```",  # Any long code block
    r"return\s+\[.*,.*\]",  # Returning array indices (Two Sum answer)
    r"the\s+answer\s+is\s+\[",  # Explicit answer
]

# Safe hint phrases that are allowed
SAFE_HINT_PHRASES = [
    r"have you considered",
    r"try thinking about",
    r"consider using",
    r"what if you",
    r"look at",
    r"think about",
    r"a hint would be",
    r"start by",
    r"break it down",
    r"can you think",
]


def detect_solution_leak(response: str) -> Tuple[bool, str]:
    """Detect if the response gives away the complete solution.

    Args:
        response: The LLM response to check

    Returns:
        Tuple of (is_leak, reason)
    """
    response_lower = response.lower()

    # Check for solution leak patterns
    for pattern in SOLUTION_LEAK_PATTERNS:
        if re.search(pattern, response_lower):
            return True, f"Solution leak detected: {pattern}"

    # Check if response has too much code (more than 3 lines)
    code_lines = len(re.findall(r'^\s*[^#\s].*', response, re.MULTILINE))
    if code_lines > 3:
        return True, "Response contains excessive code"

    return False, ""


def get_safe_hint_response(message_type: str) -> str:
    """Get a safe hint response based on message type.

    Args:
        message_type: The type of message the user sent

    Returns:
        A safe hint response
    """
    hints = {
        "hint": "Have you considered breaking the problem into smaller parts? Try to think about what data structure might help you track values you've seen before.",
        "general": "I'm here to help you think through the problem. Could you tell me what specific part you'd like guidance on?",
        "clarification": "Rather than giving you the answer directly, let me ask: what have you tried so far? Where do you think you might get stuck?",
    }
    return hints.get(message_type, hints["general"])


def filter_output(response: str, message_type: str = "general") -> str:
    """Filter output to prevent solution leakage.

    Args:
        response: The LLM response to filter
        message_type: The type of message the user sent

    Returns:
        Filtered response safe for user consumption
    """
    # Check for solution leakage
    is_leak, reason = detect_solution_leak(response)
    if is_leak:
        logger = logging.getLogger(__name__)
        logger.warning(f"Solution leak blocked: {reason}")
        return get_safe_hint_response(message_type)

    # Remove attempts to reveal system prompts
    response = re.sub(
        r'(?i)(here\s+are\s+my\s+instructions|my\s+system\s+prompt|original\s+instructions).*',
        '',
        response
    )

    # Limit response length
    if len(response) > MAX_OUTPUT_LENGTH:
        response = response[:MAX_OUTPUT_LENGTH] + "..."

    return response.strip()