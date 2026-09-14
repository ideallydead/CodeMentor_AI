FROM python:3.10-slim

# This sandbox container is intentionally minimal and should be audited before
# running untrusted code. It is configured to be network isolated by docker compose.

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /sandbox
COPY . /sandbox

CMD ["python", "-c", "print('sandbox ready')"]
