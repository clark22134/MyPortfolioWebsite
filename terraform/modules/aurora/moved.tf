moved {
  from = aws_rds_cluster.aurora
  to   = aws_rds_cluster.aurora[0]
}

moved {
  from = aws_rds_cluster_instance.aurora
  to   = aws_rds_cluster_instance.aurora[0]
}
