mock_provider "aws" {}
mock_provider "random" {}

variables {
  environment             = "prod"
  cluster_identifier      = "shared"
  database_name           = "portfolio"
  vpc_id                  = "vpc-test"
  subnet_ids              = ["subnet-test-a", "subnet-test-b"]
  allowed_security_groups = ["sg-test"]
}

run "restore_snapshot_and_protect_database" {
  command = plan
  variables {
    snapshot_identifier = "prod-shared-suspended-test"
  }
  assert {
    condition     = aws_rds_cluster.aurora[0].snapshot_identifier == "prod-shared-suspended-test"
    error_message = "Restoration must use the archived snapshot rather than create an empty database."
  }
  assert {
    condition     = aws_rds_cluster.aurora[0].deletion_protection && !aws_rds_cluster.aurora[0].skip_final_snapshot
    error_message = "A restored cluster must retain deletion protection and final backups."
  }
}

run "remove_database_but_keep_credentials" {
  command = apply
  variables {
    enabled = false
  }
  assert {
    condition     = length(aws_rds_cluster.aurora) == 0 && length(aws_rds_cluster_instance.aurora) == 0
    error_message = "Both the cluster and billed instance must be absent."
  }
  assert {
    condition     = aws_secretsmanager_secret.db_credentials.name == "prod-shared-credentials" && random_password.master.length == 32
    error_message = "Suspension must retain the database secret and generated password."
  }
}
