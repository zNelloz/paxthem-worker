const fs =
  require("fs");

function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}

function loadLinks(
  path
) {

  const links =
    fs
      .readFileSync(
        path,
        "utf8"
      )
      .split(/\r?\n/)
      .map(
        x => x.trim()
      )
      .filter(Boolean);

  return [
    ...new Set(
      links
    )
  ];

}

function config() {

  return {

    language:
      process.env
        .PAXTHEM_LANGUAGE ||
      "it-IT",

    timezone:
      process.env
        .PAXTHEM_TIMEZONE ||
      "Europe/Rome",

    concurrency:
      Number(
        process.env
          .PAXTHEM_HTTP_CONCURRENCY ||
        4
      ),

    delay:
      Number(
        process.env
          .PAXTHEM_HTTP_DELAY_MS ||
        150
      ),

    timeout:
      Number(
        process.env
          .PAXTHEM_HTTP_TIMEOUT_MS ||
        15000
      ),

    retries:
      Number(
        process.env
          .PAXTHEM_HTTP_RETRIES ||
        2
      )

  };

}

async function requestJson(
  url,
  attempt = 0
) {

  const cfg =
    config();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      cfg.timeout
    );

  try {

    const response =
      await fetch(
        url,
        {

          method:
            "GET",

          headers: {

            accept:
              "application/json",

            "skin-language":
              cfg.language,

            "skin-tz":
              cfg.timezone

          },

          signal:
            controller.signal

        }
      );

    if (
      response.status === 429 &&
      attempt < cfg.retries
    ) {

      const retryAfter =
        Number(
          response.headers.get(
            "retry-after"
          )
        );

      const wait =

        Number.isFinite(
          retryAfter
        )

          ? retryAfter * 1000

          : 1000 *
            Math.pow(
              2,
              attempt
            );

      await sleep(wait);

      return requestJson(
        url,
        attempt + 1
      );

    }

    if (
      response.status >= 500 &&
      attempt < cfg.retries
    ) {

      await sleep(
        500 *
        Math.pow(
          2,
          attempt
        )
      );

      return requestJson(
        url,
        attempt + 1
      );

    }

    let data = null;

    try {

      data =
        await response.json();

    } catch {}

    return {

      ok:
        response.ok,

      status:
        response.status,

      data

    };

  } catch (
    error
  ) {

    if (
      attempt <
      cfg.retries
    ) {

      await sleep(
        500 *
        Math.pow(
          2,
          attempt
        )
      );

      return requestJson(
        url,
        attempt + 1
      );

    }

    return {

      ok:
        false,

      status:
        null,

      error:
        error.message,

      data:
        null

    };

  } finally {

    clearTimeout(
      timeout
    );

  }

}

async function processLinks(
  links,
  handler
) {

  const cfg =
    config();

  let index = 0;

  async function worker() {

    while (
      true
    ) {

      const i =
        index++;

      if (
        i >=
        links.length
      ) {
        return;
      }

      const url =
        links[i];

      const result =
        await requestJson(
          url
        );

      await handler({

        index:
          i,

        total:
          links.length,

        url,

        result

      });

      await sleep(
        cfg.delay
      );

    }

  }

  const workers =
    [];

  for (
    let i = 0;
    i < cfg.concurrency;
    i++
  ) {

    workers.push(
      worker()
    );

  }

  await Promise.all(
    workers
  );

}

module.exports = {

  loadLinks,

  requestJson,

  processLinks

};
