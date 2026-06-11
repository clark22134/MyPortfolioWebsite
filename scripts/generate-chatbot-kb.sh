#!/usr/bin/env bash
set -euo pipefail

# Regenerate the chatbot's precomputed RAG embeddings.
#
# Run this whenever the KB markdown changes
# (portfolio-backend/src/main/resources/knowledge/*.md or repo /docs/*.md).
# Requires network + an OpenAI key. Provide the key one of two ways:
#   export OPENAI_API_KEY=sk-...
# or (uses Secrets Manager, needs AWS creds with GetSecretValue):
#   export OPENAI_SECRET_ARN=arn:aws:secretsmanager:...:secret:...
#
# Do NOT set CHATBOT_DOCS_PATH — the committed artifact must match what CI sees
# (classpath knowledge/ + docs/ only), and a local docs path would add extra
# chunks and break the freshness gate.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOD="$HERE/portfolio-chatbot-backend"
RES="$MOD/src/main/resources"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home}"

if [[ -z "${OPENAI_API_KEY:-}" && -z "${OPENAI_SECRET_ARN:-}" ]]; then
  echo "ERROR: set OPENAI_API_KEY or OPENAI_SECRET_ARN before running." >&2
  exit 1
fi

# Compile first so bundled knowledge/*.md + docs/*.md land on the runtime classpath,
# then run the generator profile. The app boots in its normal servlet mode: the
# spring-cloud-function-serverless-web autoconfig on the classpath registers a
# ServerlessServletWebServerFactory that requires a web ApplicationContext, so we
# must NOT force --spring.main.web-application-type=none (that triggers a
# ClassCastException at startup). The serverless factory is a no-op proxy server
# (no port binding), and the generator calls System.exit(0) when done, so this is
# still a clean one-shot.
mvn -q -f "$MOD/pom.xml" compile
mvn -q -f "$MOD/pom.xml" \
  org.springframework.boot:spring-boot-maven-plugin:3.5.14:run \
  -Dspring-boot.run.profiles=generate-kb \
  -Dspring-boot.run.arguments="--chatbot.kb.generate.out=$RES"

echo "Generated:"
echo "  $RES/knowledge-vectors.json"
echo "  $RES/knowledge-vectors.meta.json"
