# Preserve resource identities when adopting the suspension switch.

moved {
  from = module.cloudfront_waf
  to   = module.cloudfront_waf[0]
}

moved {
  from = module.portfolio_lambda
  to   = module.portfolio_lambda[0]
}

moved {
  from = module.portfolio_chatbot_lambda
  to   = module.portfolio_chatbot_lambda[0]
}

moved {
  from = module.portfolio_api_gateway
  to   = module.portfolio_api_gateway[0]
}

moved {
  from = module.portfolio_cloudfront
  to   = module.portfolio_cloudfront[0]
}

moved {
  from = module.ecommerce_lambda
  to   = module.ecommerce_lambda[0]
}

moved {
  from = module.ecommerce_api_gateway
  to   = module.ecommerce_api_gateway[0]
}

moved {
  from = module.ecommerce_cloudfront
  to   = module.ecommerce_cloudfront[0]
}

moved {
  from = module.ats_lambda
  to   = module.ats_lambda[0]
}

moved {
  from = module.ats_api_gateway
  to   = module.ats_api_gateway[0]
}

moved {
  from = module.ats_cloudfront
  to   = module.ats_cloudfront[0]
}

moved {
  from = aws_vpc_endpoint.ses_smtp
  to   = aws_vpc_endpoint.ses_smtp[0]
}

moved {
  from = aws_s3_bucket_policy.portfolio_cloudfront
  to   = aws_s3_bucket_policy.portfolio_cloudfront[0]
}

moved {
  from = aws_s3_bucket_policy.ecommerce_cloudfront
  to   = aws_s3_bucket_policy.ecommerce_cloudfront[0]
}

moved {
  from = aws_s3_bucket_policy.ats_cloudfront
  to   = aws_s3_bucket_policy.ats_cloudfront[0]
}

moved {
  from = aws_route53_record.portfolio
  to   = aws_route53_record.portfolio[0]
}

moved {
  from = aws_route53_record.portfolio_www
  to   = aws_route53_record.portfolio_www[0]
}

moved {
  from = aws_route53_record.ecommerce
  to   = aws_route53_record.ecommerce[0]
}

moved {
  from = aws_route53_record.ats
  to   = aws_route53_record.ats[0]
}
