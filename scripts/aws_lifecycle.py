"""Suspend AWS runtime resources while retaining a verifiable recovery archive."""

import argparse
import base64
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import time


ROOT = Path(__file__).resolve().parents[1]
ACCOUNT = "010438493245"
REGION = "us-east-1"
REPOSITORY = "clark22134/MyPortfolioWebsite"
CLUSTER = "prod-shared"
WORKFLOW = "deploy-production.yml"
RECOVERY_BUCKET = "clarkfoster-portfolio-tf-state-use1"
APPLICATIONS = ("portfolio-backend", "ecommerce-backend", "ats-backend", "portfolio-chatbot")
RUNTIME_MODULES = (
    "cloudfront_waf", "portfolio_lambda", "portfolio_chatbot_lambda",
    "ecommerce_lambda", "ats_lambda", "portfolio_api_gateway",
    "ecommerce_api_gateway", "ats_api_gateway", "portfolio_cloudfront",
    "ecommerce_cloudfront", "ats_cloudfront",
)
RUNTIME_ROOTS = {
    "aws_vpc_endpoint.ses_smtp[0]",
    *(f"aws_route53_record.{name}[0]" for name in ("portfolio", "portfolio_www", "ecommerce", "ats")),
    *(f"aws_s3_bucket_policy.{name}_cloudfront[0]" for name in ("portfolio", "ecommerce", "ats")),
    "module.shared_aurora.aws_rds_cluster.aurora[0]",
    "module.shared_aurora.aws_rds_cluster_instance.aurora[0]",
}


class LifecycleError(Exception):
    pass


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")
    path.chmod(0o600)


def inputs_from_state(state):
    resources = state.get("resources", [])
    functions = {
        instance["attributes"]["function_name"]: instance["attributes"]["environment"][0]["variables"]
        for resource in resources if resource["type"] == "aws_lambda_function"
        for instance in resource["instances"]
    }
    if not functions:
        raise LifecycleError("No running Lambdas found; use the existing recovery archive.")
    portfolio = functions["prod-portfolio-backend"]
    ats = functions["prod-ats-backend"]
    ecommerce = functions["prod-ecommerce-backend"]
    keys = [
        instance["attributes"]["secret_string"]
        for resource in resources
        if resource["type"] == "aws_secretsmanager_secret_version" and resource["name"] == "openai_api_key"
        for instance in resource["instances"]
    ]
    values = {
        "ses_smtp_username": portfolio["MAIL_USERNAME"],
        "ses_smtp_password": portfolio["MAIL_PASSWORD"],
        "portfolio_jwt_secret": portfolio["JWT_SECRET"],
        "ecommerce_jwt_secret": ecommerce["ECOMMERCE_JWT_SECRET"],
        "ats_jwt_secret": ats["JWT_SECRET"],
        "admin_password": portfolio["ADMIN_PASSWORD"],
        "openai_api_key": keys[0] if keys else "",
        "aws_region": REGION,
        "environment": "prod",
        "domain_name": "clarkfoster.com",
    }
    for app, environment in (("portfolio", portfolio), ("ecommerce", ecommerce), ("ats", ats)):
        values[f"{app}_db_iam_auth"] = environment["SPRING_DATASOURCE_URL"].startswith("jdbc:aws-wrapper:")
        if values[f"{app}_db_iam_auth"]:
            values[f"{app}_db_iam_user"] = environment["DB_USERNAME"]
    for name in ("ats_admin_password", "ats_recruiter_password", "ats_manager_password"):
        values[name] = ats.get(name.upper(), "")
    required = ("ses_smtp_username", "ses_smtp_password", "portfolio_jwt_secret",
                "ecommerce_jwt_secret", "ats_jwt_secret", "admin_password", "openai_api_key")
    missing = [name for name in required if not values[name]]
    if missing:
        raise LifecycleError("Missing recovery inputs: " + ", ".join(missing))
    return values


def validate_suspend_plan(plan):
    """Reject any change outside the approved runtime teardown and DB host update."""
    deletions = []
    for change in plan.get("resource_changes", []):
        actions = change["change"]["actions"]
        address = change["address"]
        if actions in (["no-op"], ["read"]):
            continue
        if address == "aws_iam_role_policy.github_actions" and actions == ["update"]:
            before = json.loads(change["change"]["before"]["policy"])
            after = json.loads(change["change"]["after"]["policy"])
            # The broad TerraformInfrastructure grant already covers invalidations.
            before["Statement"] = [s for s in before["Statement"] if s.get("Sid") != "CloudFrontInvalidation"]
            if before != after:
                raise LifecycleError("Suspension must not change deployment-role permissions.")
            continue
        if address == "module.shared_aurora.aws_secretsmanager_secret_version.db_credentials":
            if actions not in (["update"], ["delete", "create"], ["create", "delete"]):
                raise LifecycleError("Unexpected database credential action.")
            before = json.loads(change["change"]["before"]["secret_string"])
            after = json.loads(change["change"]["after"]["secret_string"])
            if {k: v for k, v in before.items() if k != "host"} != {k: v for k, v in after.items() if k != "host"}:
                raise LifecycleError("Suspension must preserve the database credentials.")
            continue
        allowed = address in RUNTIME_ROOTS or any(
            address.startswith(f"module.{module}[0].") for module in RUNTIME_MODULES
        )
        if not allowed or actions != ["delete"]:
            raise LifecycleError(f"Unapproved suspension change: {address} ({','.join(actions)})")
        deletions.append(change)
    return deletions


class Lifecycle:
    def __init__(self, root=ROOT, runner=subprocess.run):
        self.root = Path(root)
        self.runner = runner
        self.archive_root = self.root / ".aws-recovery"
        self.archive_root.mkdir(mode=0o700, exist_ok=True)
        self.archive_root.chmod(0o700)
        self.archive = None

    def run(self, *command):
        result = self.runner(command, cwd=self.root, text=True, capture_output=True)
        if result.returncode:
            if self.archive:
                with (self.archive / "operations.log").open("a") as log:
                    log.write(f"{command[0]} {command[1]} failed\n{result.stderr}\n{result.stdout}\n")
            raise LifecycleError(f"{command[0]} {command[1]} failed; inspect the private recovery log.")
        return result.stdout

    def aws(self, *command):
        return json.loads(self.run("aws", *command, "--region", REGION, "--output", "json", "--no-cli-pager") or "{}")

    def check_account(self):
        if self.aws("sts", "get-caller-identity")["Account"] != ACCOUNT:
            raise LifecycleError("Refusing to operate on an unexpected AWS account.")

    def latest(self):
        marker = self.archive_root / "latest"
        if not marker.exists():
            raise LifecycleError("Run make aws-suspend-plan first to prepare a recovery archive.")
        self.archive = self.archive_root / marker.read_text().strip()
        if self.archive.parent != self.archive_root or not (self.archive / "manifest.json").is_file():
            raise LifecycleError("Invalid recovery archive.")
        return json.loads((self.archive / "manifest.json").read_text())

    def terraform_plan(self, enabled=False, snapshot=""):
        name = "restore" if enabled else "suspend"
        plan_path = self.archive / f"{name}.tfplan"
        self.run("terraform", "-chdir=terraform", "plan", "-input=false", "-no-color",
                 f"-var-file={self.archive / 'inputs.tfvars.json'}",
                 f"-var=website_enabled={str(enabled).lower()}",
                 f"-var=restore_snapshot_identifier={snapshot}", f"-out={plan_path}")
        plan = json.loads(self.run("terraform", "-chdir=terraform", "show", "-json", str(plan_path)))
        write_json(self.archive / f"{name}-plan.json", plan)
        changes = [c for c in plan.get("resource_changes", []) if c["change"]["actions"] not in (["no-op"], ["read"])]
        if not enabled:
            changes = validate_suspend_plan(plan)
        summary = Counter(f"{','.join(c['change']['actions'])} {c['type']}" for c in changes)
        write_json(self.archive / f"{name}-summary.json", dict(summary))
        print(json.dumps(dict(summary), indent=2), flush=True)
        return plan

    def prepare(self):
        self.check_account()
        self.run("terraform", "-chdir=terraform", "init", "-reconfigure", "-input=false", "-no-color")
        state = json.loads(self.run("terraform", "-chdir=terraform", "state", "pull"))
        inputs = inputs_from_state(state)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        self.archive = self.archive_root / timestamp
        self.archive.mkdir(mode=0o700)
        write_json(self.archive / "before.tfstate", state)
        write_json(self.archive / "inputs.tfvars.json", inputs)
        revision = self.run("git", "rev-parse", "HEAD").strip()
        manifest = {"account": ACCOUNT, "region": REGION, "revision": revision,
                    "snapshot": f"prod-shared-suspended-{timestamp}", "status": "prepared"}
        write_json(self.archive / "manifest.json", manifest)
        self.terraform_plan()
        (self.archive_root / "latest").write_text(timestamp + "\n")
        print(f"Recovery archive prepared: {self.archive}", flush=True)

    def set_variable(self, name, value):
        variables = json.loads(self.run("gh", "api", f"repos/{REPOSITORY}/actions/variables"))["variables"]
        if any(variable["name"] == name for variable in variables):
            self.run("gh", "api", "--method", "PATCH", f"repos/{REPOSITORY}/actions/variables/{name}", "-f", f"value={value}")
        else:
            self.run("gh", "api", "--method", "POST", f"repos/{REPOSITORY}/actions/variables", "-f", f"name={name}", "-f", f"value={value}")

    def pause_deployments(self):
        self.set_variable("AWS_SITE_ENABLED", "false")
        self.run("gh", "api", "--method", "PUT", f"repos/{REPOSITORY}/actions/workflows/{WORKFLOW}/disable")
        runs = json.loads(self.run("gh", "run", "list", "--repo", REPOSITORY, "--workflow", WORKFLOW,
                                  "--limit", "100", "--json", "databaseId,status"))
        for run in runs:
            if run["status"] != "completed":
                self.run("gh", "run", "cancel", str(run["databaseId"]), "--repo", REPOSITORY)
        remaining = json.loads(self.run("gh", "run", "list", "--repo", REPOSITORY, "--workflow", WORKFLOW,
                                       "--limit", "100", "--json", "databaseId,status"))
        if any(run["status"] != "completed" for run in remaining):
            raise LifecycleError("Deployment cancellation is pending; rerun after all runs finish.")

    def snapshot(self, identifier):
        snapshots = self.aws("rds", "describe-db-cluster-snapshots", "--db-cluster-identifier", CLUSTER)["DBClusterSnapshots"]
        if not any(snapshot["DBClusterSnapshotIdentifier"] == identifier for snapshot in snapshots):
            self.aws("rds", "create-db-cluster-snapshot", "--db-cluster-identifier", CLUSTER,
                     "--db-cluster-snapshot-identifier", identifier)
        print(f"Waiting for database snapshot: {identifier}", flush=True)
        self.run("aws", "rds", "wait", "db-cluster-snapshot-available", "--db-cluster-snapshot-identifier", identifier, "--region", REGION)
        self.verify_snapshot(identifier)

    def verify_snapshot(self, identifier):
        snapshot = self.aws("rds", "describe-db-cluster-snapshots", "--db-cluster-snapshot-identifier", identifier)["DBClusterSnapshots"][0]
        if snapshot["Status"] != "available" or snapshot["DBClusterIdentifier"] != CLUSTER:
            raise LifecycleError("The recovery snapshot is not available for the expected cluster.")
        write_json(self.archive / "snapshot.json", snapshot)

    def upload_archive(self):
        self.run("aws", "s3", "sync", str(self.archive),
                 f"s3://{RECOVERY_BUCKET}/recovery/{self.archive.name}/",
                 "--sse", "AES256", "--exclude", "*.tfplan", "--exclude", "*-plan.json",
                 "--region", REGION, "--only-show-errors")

    def suspend(self):
        self.check_account()
        manifest = self.latest()
        if manifest["status"] == "suspended":
            print("This recovery archive has already been suspended.")
            return
        if manifest["status"] not in ("prepared", "backed-up"):
            raise LifecycleError("Run make aws-suspend-plan to archive the current deployment.")
        self.terraform_plan()  # Validate scope before touching production.
        self.pause_deployments()
        if manifest["status"] == "prepared":
            print("Production deployment paused. Preserving application artifacts and freezing writes.", flush=True)
            artifacts = self.archive / "artifacts"
            artifacts.mkdir(exist_ok=True)
            for name in APPLICATIONS:
                self.run("aws", "s3", "cp", f"s3://prod-lambda-deployments-{ACCOUNT}/{name}.jar",
                         str(artifacts / f"{name}.jar"), "--region", REGION, "--only-show-errors")
                self.aws("events", "disable-rule", "--name", f"prod-{name}-warmer")
                self.aws("lambda", "put-function-concurrency", "--function-name", f"prod-{name}", "--reserved-concurrent-executions", "0")
            for app in ("portfolio", "ecommerce", "ats"):
                self.run("aws", "s3", "sync", f"s3://prod-{app}-frontend-{ACCOUNT}",
                         str(artifacts / f"{app}-frontend"), "--region", REGION, "--only-show-errors")
            time.sleep(35)  # Let requests admitted before the concurrency freeze finish.
            self.snapshot(manifest["snapshot"])
            manifest["status"] = "backed-up"
            manifest["recovery_revision"] = self.run("git", "rev-parse", "HEAD").strip()
            self.run("git", "archive", "--format=tar.gz", "-o", str(self.archive / "source.tar.gz"), "HEAD")
            write_json(self.archive / "manifest.json", manifest)
        else:
            self.verify_snapshot(manifest["snapshot"])
        self.upload_archive()  # Require an off-machine copy before database deletion.
        self.set_variable("AWS_RESTORE_SNAPSHOT", manifest["snapshot"])
        clusters = self.aws("rds", "describe-db-clusters")["DBClusters"]
        if any(cluster["DBClusterIdentifier"] == CLUSTER for cluster in clusters):
            self.aws("rds", "modify-db-cluster", "--db-cluster-identifier", CLUSTER,
                     "--no-deletion-protection", "--apply-immediately")
        self.terraform_plan()  # Refresh state after the explicit deletion-protection change.
        print("Backup verified. Applying the validated runtime teardown.", flush=True)
        self.run("terraform", "-chdir=terraform", "apply", "-input=false", "-no-color", str(self.archive / "suspend.tfplan"))
        state = json.loads(self.run("terraform", "-chdir=terraform", "state", "pull"))
        write_json(self.archive / "after.tfstate", state)
        manifest["status"] = "suspended"
        write_json(self.archive / "manifest.json", manifest)
        self.upload_archive()
        print(f"AWS suspension complete. Retained recovery snapshot: {manifest['snapshot']}", flush=True)

    def restore_plan(self):
        self.check_account()
        manifest = self.latest()
        if manifest["status"] not in ("suspended", "restoration-queued"):
            raise LifecycleError("A completed suspension is required before planning restoration.")
        self.verify_snapshot(manifest["snapshot"])
        self.terraform_plan(enabled=True, snapshot=manifest["snapshot"])

    def resume(self):
        self.restore_plan()
        manifest = self.latest()
        source = json.loads(self.run("gh", "api", f"repos/{REPOSITORY}/contents/.github/workflows/{WORKFLOW}?ref=main"))
        workflow = base64.b64decode(source["content"]).decode()
        if "workflow_dispatch:" not in workflow or "vars.AWS_SITE_ENABLED == 'true'" not in workflow:
            raise LifecycleError("Merge the AWS lifecycle pull request before reactivating production.")
        self.set_variable("AWS_RESTORE_SNAPSHOT", manifest["snapshot"])
        self.set_variable("AWS_SITE_ENABLED", "true")
        self.run("gh", "api", "--method", "PUT", f"repos/{REPOSITORY}/actions/workflows/{WORKFLOW}/enable")
        self.run("gh", "workflow", "run", WORKFLOW, "--repo", REPOSITORY, "--ref", "main")
        manifest["status"] = "restoration-queued"
        write_json(self.archive / "manifest.json", manifest)
        print(f"Restoration queued through GitHub Actions: https://github.com/{REPOSITORY}/actions/workflows/{WORKFLOW}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("plan", "suspend", "restore-plan", "resume"))
    args = parser.parse_args()
    os.umask(0o077)
    lifecycle = Lifecycle()
    try:
        {"plan": lifecycle.prepare, "suspend": lifecycle.suspend,
         "restore-plan": lifecycle.restore_plan, "resume": lifecycle.resume}[args.command]()
    except (LifecycleError, KeyError, ValueError) as error:
        parser.exit(1, f"AWS lifecycle operation stopped: {error}\n")


if __name__ == "__main__":
    main()
