FROM python:slim AS builder

ENV PDM_CHECK_UPDATE=false
RUN --mount=type=cache,id=python,target=/root/.cache \
    pip install -U pdm

COPY pyproject.toml pdm.lock README.md /project/
COPY src/ /project/src

WORKDIR /project
RUN --mount=type=cache,id=python,target=/root/.cache \
    pdm install --check --prod --no-editable

FROM python:slim

RUN apt-get update && \
    apt-get install -y tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /project/.venv/ /project/.venv
ENV PATH="/project/.venv/bin:$PATH"

WORKDIR /project

ARG FLAG=flag{test_flag}
ENV FLAG=${FLAG}
EXPOSE 8000
ENTRYPOINT ["tini", "--", "python", "-m", "ezflask"]