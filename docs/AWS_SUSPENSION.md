# AWS suspension and restoration

The AWS website is suspended to eliminate its recurring runtime costs. The
portfolio, shop, ATS, and chatbot are unavailable publicly. Local development
continues through `make preview-all` or Docker Compose.

## What remains

- The `clarkfoster.com` registration and DNS hosted zone, including email,
  SPF, DKIM, DMARC, nameserver, and certificate-validation records.
- Terraform's state bucket and DynamoDB locking table.
- The three private frontend buckets and the Lambda deployment artifact bucket.
- The OpenAI and database credentials, existing legacy portfolio mail secrets,
  generated database password, and GitHub repository/environment secrets.
- The GitHub OIDC deployment role, certificate, VPC, subnets, and security groups.
- A manual Aurora snapshot containing all three databases, plus the final
  snapshot created during cluster deletion.

The retained resources permit restoration without rebuilding account access or
losing application data. The paid Aurora instance and cluster, SES SMTP interface
endpoint, WAF, CloudFront distributions, API Gateways, Lambda functions and execution
roles, scheduled warmers, runtime log groups, website alias records, and CloudFront
bucket policies are removed. Frontend buckets remain private.

September 2026's observed AWS bill was $88.84, including $16 for the domain and
$7.86 tax. Aurora was $45.16, WAF $10.04, and the SMTP endpoint $7.20. Retained
secrets cost approximately $2/month; the hosted zone is approximately $0.50/month.
S3 and manual snapshot storage add usage-based charges. Expect a few dollars per
month before tax, plus domain renewal; shutdown does not erase charges already
incurred. Verify actual costs in Cost Explorer after billing data catches up.

Stopping Aurora alone is insufficient: AWS restarts stopped clusters after seven
days. Do not destroy the bootstrap stack, hosted zone, domain registration, or
recovery snapshots.

## Suspend

Run from the repository root with authenticated AWS CLI and GitHub CLI, Terraform
1.15.5, and uv. The command verifies AWS account `010438493245`, operates in
`us-east-1`, and reconstructs Terraform inputs privately from the deployed state.
It does not print secret values or source `.env`.

```bash
make test-aws-lifecycle
terraform -chdir=terraform init -reconfigure -input=false
terraform -chdir=terraform validate
terraform -chdir=terraform test
make aws-suspend-plan
make aws-suspend
```

`aws-suspend-plan` only reads AWS resources and prepares the private recovery
archive. Its guard rejects changes outside the runtime teardown, a database
secret-version update that clears the inactive hostname while preserving every
other credential field, and removal of a redundant deployment-role grant already
covered by its infrastructure permissions. It never empties a bucket.

`aws-suspend` validates the plan again, sets repository variable `AWS_SITE_ENABLED`
to `false`, disables the production workflow, and requires all queued/in-progress
production deployments to finish cancellation. It archives all four backend JARs,
the three frontend builds, source revision, configuration, and state. It disables
warmers and sets all four Lambdas' reserved concurrency to zero, then waits for
in-flight requests to finish before taking a manual snapshot.

Only after that snapshot is available and the archive has been uploaded to the
private state bucket does the command disable database deletion protection and
apply the refreshed, validated Terraform plan. The cluster deletion additionally
requires its configured final snapshot. A failed snapshot or archive upload blocks
database deletion. If a deployment cancellation is pending, wait for it to finish
and rerun `make aws-suspend`. If Terraform stops partway through teardown, the same
command resumes using the verified backup and remaining state.

Each operation uses `.aws-recovery/<UTC timestamp>/`; `.aws-recovery/latest` names
the active archive. Directory permissions are `0700`, input/state/manifest files
are `0600`, and the entire directory is gitignored. Treat these files as secrets.
The off-machine copy is encrypted with S3-managed keys at:

```text
s3://clarkfoster-portfolio-tf-state-use1/recovery/<UTC timestamp>/
```

The manifest records the recovery snapshot ID and source revisions. Saved plan
binaries and detailed plan JSON stay local; the S3 copy includes artifacts,
inputs, snapshots' metadata, and before/after state. Do not commit the archive,
post its contents in a PR, or expose it through a frontend bucket.

## Restore

Merge the lifecycle changes before restoration. Keep both repository variables
`AWS_SITE_ENABLED=false` and `AWS_RESTORE_SNAPSHOT=<manifest snapshot ID>` while
suspended. Production deployments require `AWS_SITE_ENABLED` to equal `true`;
ordinary Terraform runs default to `website_enabled=false`.

```bash
make aws-restore-plan
make aws-resume
```

The first command is read-only and verifies the saved snapshot before planning
reactivation. The second checks that the lifecycle workflow is present on `main`,
sets the restoration snapshot and enable flag, re-enables the production workflow,
and dispatches it on `main`. Production restoration runs through GitHub Actions,
not local `terraform apply`. Monitor the entire workflow to completion before
declaring the site restored:

```bash
gh run list --workflow deploy-production.yml
gh run watch <run-id> --exit-status
```

Terraform creates Aurora from the saved snapshot, preserving all databases and
PostgreSQL application roles. It recreates IAM policies using the new cluster
resource ID and updates the retained database secret's hostname. Database
deletion protection is restored. New Lambdas use real JARs from the retained
deployment bucket and publish a version for their SnapStart aliases; the three
database-backed Lambdas wait for the Aurora module to finish. CI then builds and
deploys all applications and performs the existing smoke tests.

Keep `AWS_RESTORE_SNAPSHOT` unchanged after restoration: changing or clearing an
existing cluster's snapshot identifier can propose database replacement. Keep the
snapshot and archive until a separate retention decision is made. Restoration
takes provisioning/build time and has not been timed; it is not an instant restart.
For another suspension after restoration, run `make aws-suspend-plan` again to
capture a new snapshot and current credentials.

On a replacement computer, download the archive into the same relative location,
restrict its permissions, and restore the local `latest` marker before running
the commands:

```bash
mkdir -p .aws-recovery/<UTC-timestamp>
aws s3 sync s3://clarkfoster-portfolio-tf-state-use1/recovery/<UTC-timestamp>/ .aws-recovery/<UTC-timestamp>/
chmod -R go-rwx .aws-recovery
# Write the chosen timestamp, followed by a newline, to .aws-recovery/latest.
terraform -chdir=terraform init -reconfigure -input=false
```

## Verify shutdown

Confirm that `prod-shared` and its instance are absent, all four Lambdas and
warmers are absent, no distributions carry the three website domains, and
`prod-cloudfront-waf` and the SES endpoint are gone. Verify the manual and final
snapshots are available, both archive copies exist, and the production workflow
is disabled with `AWS_SITE_ENABLED=false`. Confirm that the domain's email and
validation records remain while its website A aliases are removed. Run the
suspension plan again against the completed state and require no resource changes.

## Automated checks

PR validation runs the Python orchestration tests with at least 80% coverage and
Terraform tests using mocked AWS providers. These tests create no AWS resources.
Aurora module tests additionally check snapshot selection, deletion protection,
and retained credentials:

```bash
cp terraform/.terraform.lock.hcl terraform/modules/aurora/.terraform.lock.hcl
terraform -chdir=terraform/modules/aurora init -backend=false -input=false -lockfile=readonly
terraform -chdir=terraform/modules/aurora test
```

References: [AWS cluster stopping rules](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-cluster-stop-start.html)
and [restoring Aurora snapshots](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-restore-snapshot.html).
