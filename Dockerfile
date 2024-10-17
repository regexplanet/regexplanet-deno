FROM denoland/deno:debian AS builder

WORKDIR /app

COPY . .

RUN deno compile \
    --allow-env \
    --allow-net \
    --allow-read \
    src/server.ts


FROM gcr.io/distroless/cc

USER nonroot
WORKDIR /app
ARG COMMIT="(not set)"
ARG LASTMOD="(not set)"
ENV COMMIT=$COMMIT
ENV LASTMOD=$LASTMOD

COPY --from=builder /app/server /app/server
COPY ./static /app/static

ENV PORT=4000
ENV HOSTNAME=0.0.0.0

CMD ["/app/server"]
