from devagent.api.errors import DevAgentError, NotFoundError, ValidationError


def test_not_found_error():
    err = NotFoundError("Task", "abc123")
    assert err.status_code == 404
    assert "abc123" in err.message


def test_validation_error():
    err = ValidationError("Invalid cron expression")
    assert err.status_code == 422
    assert "Invalid cron" in err.message


def test_devagent_error_default_status():
    err = DevAgentError("Something broke")
    assert err.status_code == 500
