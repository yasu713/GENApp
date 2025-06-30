# IAM role for Bedrock Knowledge Base
resource "aws_iam_role" "bedrock_kb_role" {
  name = "${local.name_prefix}-bedrock-kb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Bedrock Knowledge Base
resource "aws_iam_role_policy" "bedrock_kb_policy" {
  name = "${local.name_prefix}-bedrock-kb-policy"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:${local.region}::foundation-model/amazon.titan-embed-text-v1"
      }
    ]
  })
}

# OpenSearch Serverless encryption policy
resource "aws_opensearchserverless_security_policy" "kb_encryption" {
  name = "${local.name_prefix}-kb-encryption"
  type = "encryption"
  
  policy = jsonencode({
    Rules = [
      {
        Resource = [
          "collection/${local.name_prefix}-vector-db"
        ]
        ResourceType = "collection"
      }
    ]
    AWSOwnedKey = true
  })
}

# OpenSearch Serverless network policy
resource "aws_opensearchserverless_security_policy" "kb_network" {
  name = "${local.name_prefix}-kb-network"
  type = "network"
  
  policy = jsonencode([
    {
      Rules = [
        {
          Resource = [
            "collection/${local.name_prefix}-vector-db"
          ]
          ResourceType = "collection"
        }
      ]
      AllowFromPublic = true
    }
  ])
}

# OpenSearch Serverless data access policy
resource "aws_opensearchserverless_access_policy" "kb_data_access" {
  name = "${local.name_prefix}-kb-data-access"
  type = "data"
  
  policy = jsonencode([
    {
      Rules = [
        {
          Resource = [
            "collection/${local.name_prefix}-vector-db"
          ]
          Permission = [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems", 
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ]
          ResourceType = "collection"
        },
        {
          Resource = [
            "index/${local.name_prefix}-vector-db/*"
          ]
          Permission = [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ]
          ResourceType = "index"
        }
      ]
      Principal = [
        aws_iam_role.bedrock_kb_role.arn,
        data.aws_caller_identity.current.arn
      ]
    }
  ])
}

# OpenSearch Serverless collection
resource "aws_opensearchserverless_collection" "kb_vector_db" {
  name = "${local.name_prefix}-vector-db"
  type = "VECTORSEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.kb_encryption,
    aws_opensearchserverless_security_policy.kb_network,
    aws_opensearchserverless_access_policy.kb_data_access
  ]

  tags = {
    Name = "${local.name_prefix}-vector-db"
  }
}

# Bedrock Knowledge Base
resource "aws_bedrockagent_knowledge_base" "main" {
  name     = "${local.name_prefix}-knowledge-base"
  role_arn = aws_iam_role.bedrock_kb_role.arn
  
  knowledge_base_configuration {
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${local.region}::foundation-model/amazon.titan-embed-text-v1"
    }
    type = "VECTOR"
  }
  
  storage_configuration {
    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.kb_vector_db.arn
      vector_index_name = "${local.name_prefix}-index"
      field_mapping {
        vector_field   = "vector"
        text_field     = "text"
        metadata_field = "metadata"
      }
    }
    type = "OPENSEARCH_SERVERLESS"
  }

  tags = {
    Name = "${local.name_prefix}-knowledge-base"
  }
}

# Bedrock Knowledge Base Data Source
resource "aws_bedrockagent_data_source" "main" {
  knowledge_base_id = aws_bedrockagent_knowledge_base.main.id
  name             = "${local.name_prefix}-data-source"
  
  data_source_configuration {
    s3_configuration {
      bucket_arn = aws_s3_bucket.main.arn
      inclusion_prefixes = ["knowledge-base/"]
    }
    type = "S3"
  }

}