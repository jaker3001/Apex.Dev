"""
Title Generation Service

Uses Anthropic API (Haiku) to generate conversation titles.
"""

import logging
import os
import asyncio
from typing import Optional

logger = logging.getLogger("apex_assistant.titles")

# Import anthropic only if available
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


async def generate_conversation_title(
    first_user_message: str,
    first_assistant_response: str,
    max_length: int = 50,
) -> Optional[str]:
    """
    Generate a concise title for a conversation based on the first exchange.

    Uses Claude Haiku for speed and cost efficiency.

    Args:
        first_user_message: The user's first message
        first_assistant_response: The assistant's first response (truncated)
        max_length: Maximum title length

    Returns:
        Generated title, or None if generation fails
    """
    if not ANTHROPIC_AVAILABLE:
        # Fall back to truncating the first message
        return _fallback_title(first_user_message, max_length)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_title(first_user_message, max_length)

    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Truncate inputs to keep prompt short
        user_excerpt = first_user_message[:300]
        assistant_excerpt = first_assistant_response[:300]

        prompt = f"""Generate a concise, descriptive title (3-6 words) for this conversation.
The title should capture the main topic or intent.
Output ONLY the title, nothing else.

User: {user_excerpt}
Assistant: {assistant_excerpt}

Title:"""

        # Run in thread pool since anthropic client is sync
        response = await asyncio.to_thread(
            lambda: client.messages.create(
                model="claude-haiku-4-5-20241022",
                max_tokens=30,
                messages=[{"role": "user", "content": prompt}],
            )
        )

        if response.content and len(response.content) > 0:
            title = response.content[0].text.strip()
            # Clean up any quotes or extra formatting
            title = title.strip('"\'')
            # Ensure it's not too long
            if len(title) > max_length:
                title = title[:max_length-3] + "..."
            return title

    except Exception as e:
        logger.warning(f"Title generation failed: {e}")

    return _fallback_title(first_user_message, max_length)


def _fallback_title(message: str, max_length: int = 50) -> str:
    """Generate a fallback title by truncating the first message."""
    # Remove newlines and extra whitespace
    title = " ".join(message.split())

    if len(title) > max_length:
        # Find a good break point
        title = title[:max_length-3]
        # Try to break at a word boundary
        last_space = title.rfind(" ")
        if last_space > max_length // 2:
            title = title[:last_space]
        title += "..."

    return title or "New Conversation"
