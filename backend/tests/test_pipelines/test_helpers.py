from devagent.pipelines.helpers import (
    _heuristic_sufficiency,
    extract_repo_url,
    inject_claude_md,
    make_branch_name,
    render_coding_prompt,
    render_pr_body,
)


def test_heuristic_sufficiency_short_description():
    assert _heuristic_sufficiency({"description": "fix bug"}) is False


def test_heuristic_sufficiency_long_description():
    assert _heuristic_sufficiency({"description": "a" * 60}) is True


def test_heuristic_sufficiency_none_description():
    assert _heuristic_sufficiency({"description": None}) is False


def test_extract_repo_url_from_description():
    ctx = {"description": "See https://github.com/org/repo for code", "comments": []}
    assert extract_repo_url(ctx) == "https://github.com/org/repo"


def test_extract_repo_url_from_comments():
    ctx = {
        "description": "No url here",
        "comments": [{"body": "Repo: https://github.com/org/myrepo"}],
    }
    assert extract_repo_url(ctx) == "https://github.com/org/myrepo"


def test_extract_repo_url_none():
    ctx = {"description": "No urls", "comments": []}
    assert extract_repo_url(ctx) is None


def test_render_coding_prompt():
    ctx = {
        "ticket_id": "TEST-1",
        "summary": "Fix login",
        "type": "Bug",
        "priority": "High",
        "description": "Login is broken",
        "comments": [{"author": "Alice", "body": "Urgent"}],
    }
    prompt = render_coding_prompt(ctx)
    assert "TEST-1" in prompt
    assert "Fix login" in prompt
    assert "Alice" in prompt


def test_render_pr_body():
    ctx = {"summary": "Fix login", "type": "Bug", "priority": "High", "description": "Broken"}
    body = render_pr_body("TEST-1", ctx, {"cost_usd": 0.05})
    assert "TEST-1" in body
    assert "$0.0500" in body


def test_make_branch_name():
    name = make_branch_name("TEST-123", "Fix the login page")
    assert name.startswith("fix/test-123-")
    assert "fix-the-login" in name


def test_inject_claude_md_new_file(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    ctx = {
        "ticket_id": "T-1",
        "summary": "Fix",
        "type": "Bug",
        "priority": "High",
        "description": "Broken",
    }
    inject_claude_md(str(repo), ctx)
    assert (repo / "CLAUDE.md").exists()
    content = (repo / "CLAUDE.md").read_text()
    assert "T-1" in content


def test_inject_claude_md_appends_to_existing(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "CLAUDE.md").write_text("# Existing\n")
    ctx = {
        "ticket_id": "T-1",
        "summary": "Fix",
        "type": "Bug",
        "priority": "High",
        "description": "Broken",
    }
    inject_claude_md(str(repo), ctx)
    content = (repo / "CLAUDE.md").read_text()
    assert "Existing" in content
    assert "T-1" in content
