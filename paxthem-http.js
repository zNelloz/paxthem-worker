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
        1
      ),

    delay:
      Number(
        process.env
          .PAXTHEM_HTTP_DELAY_MS ||
        300
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
      ),

    /*
      Ogni quante richieste
      fare una pausa globale.
    */
    batchSize:
      Number(
        process.env
          .PAXTHEM_HTTP_BATCH_SIZE ||
        100
      ),

    /*
      Durata pausa:
      10000 ms = 10 secondi.
    */
    batchPause:
      Number(
        process.env
          .PAXTHEM_HTTP_BATCH_PAUSE_MS ||
        30000
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

            origin:
              "https://new.direttabet365.net",

            referer:
              "https://new.direttabet365.net/",

            "skin-language":
              cfg.language,

            "skin-tz":
              cfg.timezone

          },

          signal:
            controller.signal

        }
      );


    /*
      RATE LIMIT
    */
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
        ) &&
        retryAfter > 0

          ? retryAfter * 1000

          : 10000 *
            Math.pow(
              2,
              attempt
            );


      console.log(
        new Date().toISOString(),
        `[PAXTHEM][HTTP] 429 -> pausa ${Math.round(wait / 1000)}s`
      );


      await sleep(
        wait
      );


      return requestJson(
        url,
        attempt + 1
      );

    }


    /*
      ERRORI SERVER
    */
    if (
      response.status >= 500 &&
      attempt < cfg.retries
    ) {

      const wait =
        1000 *
        Math.pow(
          2,
          attempt
        );


      await sleep(
        wait
      );


      return requestJson(
        url,
        attempt + 1
      );

    }


    let data =
      null;


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

      const wait =
        1000 *
        Math.pow(
          2,
          attempt
        );


      await sleep(
        wait
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


  let index =
    0;


  /*
    Prossimo punto in cui
    effettuare la pausa globale.
  */
  let nextPauseAt =
    cfg.batchSize;


  /*
    Promise condivisa fra tutti
    i worker.

    Serve per evitare che i 4
    worker facciano 4 pause diverse.
  */
  let pausePromise =
    null;


  async function waitForBatchPause() {

    /*
      Non siamo ancora arrivati
      alla prossima soglia.
    */
    if (
      index <
      nextPauseAt
    ) {

      return;

    }


    /*
      Il primo worker che arriva
      alla soglia crea la pausa.

      Gli altri worker attendono
      la stessa Promise.
    */
    if (
      !pausePromise
    ) {

      console.log(
        new Date().toISOString(),
        `[PAXTHEM][HTTP] ${nextPauseAt} richieste raggiunte -> pausa ${cfg.batchPause / 1000}s`
      );


      pausePromise =
        sleep(
          cfg.batchPause
        )
          .then(
            () => {

              nextPauseAt +=
                cfg.batchSize;


              console.log(
                new Date().toISOString(),
                `[PAXTHEM][HTTP] pausa terminata -> riprendo`
              );

            }
          )
          .finally(
            () => {

              pausePromise =
                null;

            }
          );

    }


    await pausePromise;

  }


  async function worker() {

    while (
      true
    ) {

      /*
        Prima di prendere una nuova URL,
        controlliamo se siamo arrivati
        a 100 / 200 / 300 / ...
      */
      await waitForBatchPause();


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


      /*
        Delay normale fra una richiesta
        e la successiva dello stesso worker.
      */
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
