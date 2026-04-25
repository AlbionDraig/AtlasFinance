def classify_transaction(description: str, user_categories: list[tuple[str, str | None]]) -> str | None:
    """Return the name of the first matching user category or None if no keywords match.

    Each element in *user_categories* is a ``(name, keywords_csv)`` tuple where
    *keywords_csv* is a comma-separated string of terms to look for in the
    transaction description (case-insensitive substring match).
    """
    text = description.lower().strip()
    for name, keywords_csv in user_categories:
        if not keywords_csv:
            continue
        keywords = [kw.strip().lower() for kw in keywords_csv.split(",") if kw.strip()]
        if any(kw in text for kw in keywords):
            return name
    return None
