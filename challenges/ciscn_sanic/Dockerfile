FROM python:slim AS builder

ENV PDM_CHECK_UPDATE=false
RUN --mount=type=cache,id=python,target=/root/.cache \
    pip install -U pdm

COPY pyproject.toml pdm.lock README.md /project/
COPY src/ /project/src

WORKDIR /project
RUN pdm install --check --prod --no-editable

FROM python:slim

COPY --from=builder /project/.venv/ /project/.venv
ENV PATH="/project/.venv/bin:$PATH"

COPY src /project/src
COPY static /project/static

ARG FLAG=flag{test}
RUN echo -n "${FLAG}" > /flag-$(cat /dev/urandom | tr -cd 'a-f0-9' | head -c 32)

EXPOSE 8000
ENTRYPOINT ["python", "-m", "sanic"]
CMD ["ciscn_sanic:app"]