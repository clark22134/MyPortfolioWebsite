import base64
import json
from types import SimpleNamespace

import pytest


from scripts import aws_lifecycle as lifecycle


def state_fixture():
    environments = {
        "portfolio-backend": {"MAIL_USERNAME": "test-mail-user", "MAIL_PASSWORD": "test-mail-password",
                              "JWT_SECRET": "test-portfolio-jwt", "ADMIN_PASSWORD": "test-admin-password"},
        "ecommerce-backend": {"ECOMMERCE_JWT_SECRET": "test-ecommerce-jwt"},
        "ats-backend": {"JWT_SECRET": "test-ats-jwt"},
    }
    resources = []
    for name, values in environments.items():
        values.update(SPRING_DATASOURCE_URL="jdbc:aws-wrapper:postgresql://test", DB_USERNAME="test-app")
        resources.append({"type": "aws_lambda_function", "instances": [{"attributes": {
            "function_name": f"prod-{name}", "environment": [{"variables": values}],
        }}]})
    resources.append({"type": "aws_secretsmanager_secret_version", "name": "openai_api_key",
                      "instances": [{"attributes": {"secret_string": "test-only-openai-key"}}]})
    return {"resources": resources}


def change(address, actions, resource_type="aws_lambda_function", before=None, after=None):
    return {"address": address, "type": resource_type, "change": {
        "actions": actions, "before": before, "after": after,
    }}


def plan_fixture():
    return {"resource_changes": [
        change("module.portfolio_lambda[0].aws_lambda_function.main", ["delete"]),
        change("module.shared_aurora.aws_rds_cluster.aurora[0]", ["delete"], "aws_rds_cluster"),
        change("module.shared_aurora.aws_rds_cluster_instance.aurora[0]", ["delete"], "aws_rds_cluster_instance"),
        change("module.shared_aurora.aws_secretsmanager_secret_version.db_credentials", ["delete", "create"],
               "aws_secretsmanager_secret_version", {"secret_string": '{"host":"old","password":"test-only"}'},
               {"secret_string": '{"host":"","password":"test-only"}'}),
        change("aws_iam_role.github_actions", ["no-op"], "aws_iam_role"),
        change("data.aws_caller_identity.current", ["read"], "aws_caller_identity"),
    ]}


class FakeRunner:
    def __init__(self):
        self.commands = []
        self.plan = plan_fixture()
        self.state = state_fixture()
        self.account = lifecycle.ACCOUNT
        self.variables = []
        self.runs = []
        self.snapshot_status = "available"
        self.snapshot_exists = False
        self.workflow = "workflow_dispatch:\nif: vars.AWS_SITE_ENABLED == 'true'"
        self.fail = None

    def __call__(self, command, **kwargs):
        self.commands.append(command)
        if self.fail and self.fail(command):
            return SimpleNamespace(returncode=1, stdout="", stderr="test failure")
        output = ""
        if command[:4] == ("terraform", "-chdir=terraform", "state", "pull"):
            output = json.dumps(self.state)
        elif command[:4] == ("terraform", "-chdir=terraform", "show", "-json"):
            output = json.dumps(self.plan)
        elif command[:3] == ("git", "rev-parse", "HEAD"):
            output = "test-revision"
        elif command[:3] == ("aws", "sts", "get-caller-identity"):
            output = json.dumps({"Account": self.account})
        elif command[:3] == ("aws", "rds", "describe-db-cluster-snapshots"):
            snapshot = {"DBClusterSnapshotIdentifier": "test-snapshot", "DBClusterIdentifier": lifecycle.CLUSTER,
                        "Status": self.snapshot_status}
            if "--db-cluster-snapshot-identifier" in command:
                snapshot["DBClusterSnapshotIdentifier"] = command[command.index("--db-cluster-snapshot-identifier") + 1]
                output = json.dumps({"DBClusterSnapshots": [snapshot]})
            else:
                output = json.dumps({"DBClusterSnapshots": [snapshot] if self.snapshot_exists else []})
        elif command[:3] == ("aws", "rds", "describe-db-clusters"):
            output = json.dumps({"DBClusters": [{"DBClusterIdentifier": lifecycle.CLUSTER}]})
        elif command[:3] == ("gh", "run", "list"):
            output = json.dumps(self.runs)
        elif command[:2] == ("gh", "api") and command[2].endswith("/actions/variables"):
            output = json.dumps({"variables": self.variables})
        elif command[:2] == ("gh", "api") and "/contents/" in command[2]:
            output = json.dumps({"content": base64.b64encode(self.workflow.encode()).decode()})
        return SimpleNamespace(returncode=0, stdout=output, stderr="")


@pytest.fixture
def operation(tmp_path, monkeypatch):
    monkeypatch.setattr(lifecycle.time, "sleep", lambda duration: None)
    runner = FakeRunner()
    return lifecycle.Lifecycle(tmp_path, runner), runner


def prepared(operation, status="prepared"):
    tool, runner = operation
    tool.prepare()
    manifest = tool.latest()
    manifest["status"] = status
    lifecycle.write_json(tool.archive / "manifest.json", manifest)
    runner.commands.clear()
    return tool, runner


def test_inputs_preserve_production_credentials_and_auth_mode():
    state = state_fixture()
    values = lifecycle.inputs_from_state(state)
    assert values["ats_jwt_secret"] == "test-ats-jwt"
    assert values["portfolio_db_iam_auth"] is True
    assert values["portfolio_db_iam_user"] == "test-app"
    assert values["openai_api_key"] == "test-only-openai-key"
    state["resources"][0]["instances"][0]["attributes"]["environment"][0]["variables"]["SPRING_DATASOURCE_URL"] = "jdbc:postgresql://test"
    assert lifecycle.inputs_from_state(state)["portfolio_db_iam_auth"] is False


def test_inputs_fail_closed_without_recovery_credentials():
    with pytest.raises(lifecycle.LifecycleError, match="existing recovery archive"):
        lifecycle.inputs_from_state({})
    state = state_fixture()
    state["resources"].pop()
    with pytest.raises(lifecycle.LifecycleError, match="openai_api_key"):
        lifecycle.inputs_from_state(state)


def test_plan_allows_only_teardown_and_preserves_database_password():
    assert len(lifecycle.validate_suspend_plan(plan_fixture())) == 3
    plan = plan_fixture()
    plan["resource_changes"][3]["change"]["after"]["secret_string"] = '{"host":"","password":"different"}'
    with pytest.raises(lifecycle.LifecycleError, match="preserve"):
        lifecycle.validate_suspend_plan(plan)


@pytest.mark.parametrize("address,actions", [
    ("aws_iam_role.github_actions", ["delete"]),
    ("module.portfolio_s3.aws_s3_bucket.static_site", ["delete"]),
    ("aws_secretsmanager_secret.openai_api_key[0]", ["delete"]),
    ("module.networking.aws_vpc.main", ["delete"]),
    ("module.portfolio_lambda[0].aws_lambda_function.main", ["create"]),
    ("aws_vpc_endpoint.ses_smtp[0]", ["update"]),
])
def test_plan_rejects_unapproved_changes(address, actions):
    with pytest.raises(lifecycle.LifecycleError, match="Unapproved"):
        lifecycle.validate_suspend_plan({"resource_changes": [change(address, actions)]})


def test_plan_rejects_unexpected_secret_action():
    plan = plan_fixture()
    plan["resource_changes"][3]["change"]["actions"] = ["delete"]
    with pytest.raises(lifecycle.LifecycleError, match="credential action"):
        lifecycle.validate_suspend_plan(plan)


def test_plan_can_remove_only_the_redundant_invalidation_grant():
    policy = {"Version": "2012-10-17", "Statement": [
        {"Sid": "CloudFrontInvalidation", "Action": ["cloudfront:CreateInvalidation"], "Resource": "test"},
        {"Sid": "TerraformInfrastructure", "Action": ["cloudfront:*"], "Resource": "*"},
    ]}
    reduced = {**policy, "Statement": policy["Statement"][1:]}
    item = change("aws_iam_role_policy.github_actions", ["update"], "aws_iam_role_policy",
                  {"policy": json.dumps(policy)}, {"policy": json.dumps(reduced)})
    assert lifecycle.validate_suspend_plan({"resource_changes": [item]}) == []
    item["change"]["after"]["policy"] = json.dumps({"Statement": []})
    with pytest.raises(lifecycle.LifecycleError, match="deployment-role permissions"):
        lifecycle.validate_suspend_plan({"resource_changes": [item]})


def test_prepare_is_read_only_and_private(operation):
    tool, runner = operation
    tool.prepare()
    assert tool.latest()["status"] == "prepared"
    assert (tool.archive / "before.tfstate").stat().st_mode & 0o777 == 0o600
    assert tool.archive.stat().st_mode & 0o777 == 0o700
    assert not any("apply" in command or "create-db-cluster-snapshot" in command for command in runner.commands)


def test_wrong_account_blocks_every_mutation(operation):
    tool, runner = operation
    runner.account = "different-account"
    with pytest.raises(lifecycle.LifecycleError, match="unexpected AWS account"):
        tool.prepare()
    assert len(runner.commands) == 1


def test_missing_or_invalid_archive_stops_operation(operation):
    tool, _ = operation
    with pytest.raises(lifecycle.LifecycleError, match="first"):
        tool.latest()
    (tool.archive_root / "latest").write_text("../outside")
    with pytest.raises(lifecycle.LifecycleError, match="Invalid"):
        tool.latest()


def test_suspend_freezes_writes_and_verifies_snapshot_before_apply(operation):
    tool, runner = prepared(operation)
    tool.suspend()
    commands = runner.commands
    snapshot = next(i for i, command in enumerate(commands) if "create-db-cluster-snapshot" in command)
    freeze = [i for i, command in enumerate(commands) if "put-function-concurrency" in command]
    apply = next(i for i, command in enumerate(commands) if "apply" in command)
    verified = next(i for i, command in enumerate(commands) if "describe-db-cluster-snapshots" in command and "--db-cluster-snapshot-identifier" in command)
    assert len(freeze) == 4 and max(freeze) < snapshot < verified < apply
    assert tool.latest()["status"] == "suspended"
    assert (tool.archive / "after.tfstate").exists()
    assert any(command[1:4] == ("api", "--method", "PUT") and command[-1].endswith("/disable") for command in commands)


def test_suspend_stops_before_production_changes_on_invalid_plan(operation):
    tool, runner = prepared(operation)
    runner.plan["resource_changes"].append(change("aws_iam_role.github_actions", ["delete"]))
    with pytest.raises(lifecycle.LifecycleError, match="Unapproved"):
        tool.suspend()
    assert not any("--method" in command or "put-function-concurrency" in command for command in runner.commands)


def test_failed_backup_never_deletes_database(operation):
    tool, runner = prepared(operation)
    runner.fail = lambda command: "create-db-cluster-snapshot" in command
    with pytest.raises(lifecycle.LifecycleError, match="failed"):
        tool.suspend()
    assert not any("--no-deletion-protection" in command or "apply" in command for command in runner.commands)
    assert "test failure" in (tool.archive / "operations.log").read_text()


def test_off_machine_backup_failure_blocks_database_deletion(operation):
    tool, runner = prepared(operation)
    runner.fail = lambda command: any(str(value).startswith(f"s3://{lifecycle.RECOVERY_BUCKET}/recovery/") for value in command)
    with pytest.raises(lifecycle.LifecycleError, match="failed"):
        tool.suspend()
    assert not any("--no-deletion-protection" in command or "apply" in command for command in runner.commands)


def test_partial_teardown_can_resume_from_verified_backup(operation):
    tool, runner = prepared(operation, "backed-up")
    tool.suspend()
    assert tool.latest()["status"] == "suspended"
    assert not any("put-function-concurrency" in command or "create-db-cluster-snapshot" in command for command in runner.commands)
    assert any("apply" in command for command in runner.commands)


def test_stale_archive_cannot_suspend_a_newly_restored_database(operation):
    tool, runner = prepared(operation, "restoration-queued")
    with pytest.raises(lifecycle.LifecycleError, match="current deployment"):
        tool.suspend()
    assert not any("apply" in command for command in runner.commands)


def test_suspend_is_idempotent_after_success(operation):
    tool, runner = prepared(operation, "suspended")
    tool.suspend()
    assert len(runner.commands) == 1


def test_pending_deployment_cancellation_blocks_shutdown(operation):
    tool, runner = prepared(operation)
    runner.runs = [{"status": "in_progress", "databaseId": 1}]
    with pytest.raises(lifecycle.LifecycleError, match="cancellation is pending"):
        tool.pause_deployments()
    assert any(command[:3] == ("gh", "run", "cancel") for command in runner.commands)


def test_existing_github_variable_is_updated(operation):
    tool, runner = operation
    runner.variables = [{"name": "AWS_SITE_ENABLED"}]
    tool.set_variable("AWS_SITE_ENABLED", "false")
    assert "PATCH" in runner.commands[-1]


def test_bad_snapshot_blocks_restore(operation):
    tool, runner = prepared(operation, "suspended")
    runner.snapshot_status = "creating"
    with pytest.raises(lifecycle.LifecycleError, match="not available"):
        tool.restore_plan()
    assert not any("plan" in command for command in runner.commands)


def test_restore_requires_completed_suspension(operation):
    tool, runner = prepared(operation)
    with pytest.raises(lifecycle.LifecycleError, match="completed suspension"):
        tool.restore_plan()


def test_restore_plan_is_read_only_with_retained_snapshot(operation):
    tool, runner = prepared(operation, "suspended")
    runner.snapshot_exists = True
    # A recovery plan may create runtime resources; the teardown-only guard is not used.
    runner.plan = {"resource_changes": [change("module.portfolio_lambda[0].aws_lambda_function.main", ["create"])]}
    tool.restore_plan()
    assert (tool.archive / "restore-plan.json").exists()
    assert any("-var=website_enabled=true" in command for command in runner.commands)
    assert not any("apply" in command or "--method" in command for command in runner.commands)


def test_resume_uses_ci_and_keeps_snapshot_variable(operation):
    tool, runner = prepared(operation, "suspended")
    runner.snapshot_exists = True
    tool.resume()
    assert any(command[:3] == ("gh", "workflow", "run") for command in runner.commands)
    assert not any("apply" in command for command in runner.commands)
    assert any("name=AWS_RESTORE_SNAPSHOT" in command for command in runner.commands)


def test_resume_requires_merged_workflow_before_reenabling_aws(operation):
    tool, runner = prepared(operation, "suspended")
    runner.workflow = "old-workflow"
    with pytest.raises(lifecycle.LifecycleError, match="Merge"):
        tool.resume()
    assert not any("--method" in command for command in runner.commands)


def test_cli_help_and_error_path(operation, monkeypatch):
    tool, runner = operation
    monkeypatch.setattr(lifecycle, "Lifecycle", lambda: tool)
    monkeypatch.setattr("sys.argv", ["aws_lifecycle.py", "restore-plan"])
    with pytest.raises(SystemExit) as error:
        lifecycle.main()
    assert error.value.code == 1
    monkeypatch.setattr("sys.argv", ["aws_lifecycle.py", "plan"])
    lifecycle.main()
    assert tool.latest()["status"] == "prepared"
