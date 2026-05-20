"""Tool definitions and execution functions for the Agent A ReAct loop."""

# ── Tool schemas (Anthropic Tool Use format) ──────────────────────────────────

SEARCH_LOCAL_ARCHIVES_DEF = {
    "name": "search_local_archives",
    "description": (
        "Searches local historical documents and archives for specific facts, "
        "names, or dates to ground trivia questions in accurate local history."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "search_query": {
                "type": "string",
                "description": "The specific semantic query to search in the local database.",
            }
        },
        "required": ["search_query"],
    },
}

ALL_TOOLS = [SEARCH_LOCAL_ARCHIVES_DEF]


# ── Execution functions ───────────────────────────────────────────────────────

def execute_search_local_archives(search_query: str) -> str:
    """Mock archive search — returns a hardcoded historical paragraph.

    TODO: Replace with real vector DB lookup (e.g. ChromaDB / pgvector).
    """
    print(f"[tools] search_local_archives({search_query!r})")
    # Hardcoded mock corpus — covers common Israeli/Jewish/general history topics
    return (
        "LOCAL ARCHIVE RESULT for query: " + repr(search_query) + "\n\n"
        "During the British Mandate period in Palestine (1920–1948), Tel Aviv was "
        "officially incorporated as a city in 1934, though it had been founded as a "
        "neighbourhood of Jaffa in 1909. The first Hebrew-language city in modern times "
        "grew from 2,000 residents in 1914 to over 150,000 by 1948. "
        "Notably, the same year Tel Aviv was founded (1909), the first kibbutz—Degania—"
        "was also established; both milestones occurred under Ottoman rule, five years "
        "before World War I would reshape the entire region. "
        "The Balfour Declaration (1917) was simultaneously a diplomatic coup and a source "
        "of deep ambivalence: Lord Balfour himself privately doubted that Zionism and Arab "
        "self-determination could be reconciled, yet he signed the declaration to secure "
        "Jewish support for the Allied war effort. "
        "Israel declared independence on 14 May 1948 — the same day the British Mandate "
        "formally expired and just 11 minutes before the United States extended recognition."
    )


# ── Dispatcher ────────────────────────────────────────────────────────────────

def dispatch_tool(tool_name: str, tool_input: dict) -> str:
    """Route a tool_use block to the correct Python executor."""
    if tool_name == "search_local_archives":
        return execute_search_local_archives(tool_input["search_query"])
    raise ValueError(f"Unknown tool: {tool_name!r}")
