require(
  "dotenv"
).config();

const fs =
  require("fs");

const db =
  require("./db");

const {

  normalizePalimpsest,

  normalizeMarketCatalog,

  buildCatalogLookups,

  normalizeTournamentResponse,

  parseLiveOddPatch,

  parseLiveEventPatch

} =
  require(
    "./normalizer"
  );

const {

  loadLinks,

  processLinks

} =
  require(
    "./paxthem-http"
  );

const {

  PaxthemWS

} =
  require(
    "./paxthem-ws"
  );


const PALIMPSEST_FILE =
  process.env
    .PAXTHEM_PALIMPSEST_FILE ||
  "./provider-data/palimpsest.json";


const MARKETGROUPS_FILE =
  process.env
    .PAXTHEM_MARKETGROUPS_FILE ||
  "./provider-data/marketgroups.json";


const LINKS_FILE =
  process.env
    .PAXTHEM_LINKS_FILE ||
  "./provider-data/paxthem-links.txt";


const SYNC_INTERVAL =
  Number(
    process.env
      .PAXTHEM_FULL_SYNC_INTERVAL_MS ||
    600000
  );


const BATCH_SIZE =
  Number(
    process.env
      .ODDS_DB_BATCH_SIZE ||
    500
  );


let catalog;

let lookups;

let syncRunning =
  false;

let ws;


function log(
  ...args
) {

  console.log(
    new Date()
      .toISOString(),
    ...args
  );

}


function loadJson(
  path
) {

  return JSON.parse(
    fs.readFileSync(
      path,
      "utf8"
    )
  );

}


function chunk(
  array,
  size
) {

  const result =
    [];

  for (
    let i = 0;
    i < array.length;
    i += size
  ) {

    result.push(
      array.slice(
        i,
        i + size
      )
    );

  }

  return result;

}


async function batch(
  fn,
  rows,
  size = BATCH_SIZE
) {

  for (
    const part
    of chunk(
      rows,
      size
    )
  ) {

    await fn(
      part
    );

  }

}


async function syncStatic() {

  log(
    "[PAXTHEM][SYNC] palimpsest"
  );

  const palimpsest =
    normalizePalimpsest(
      loadJson(
        PALIMPSEST_FILE
      )
    );

  await batch(
    db.upsertSports,
    palimpsest.sports
  );

  await batch(
    db.upsertCategories,
    palimpsest.categories
  );

  await batch(
    db.upsertTournaments,
    palimpsest.tournaments
  );

  await batch(
    db.upsertEvents,
    palimpsest.events
  );


  log(
    `[PAXTHEM][SYNC] ` +
    `sports=${palimpsest.sports.length} ` +
    `categories=${palimpsest.categories.length} ` +
    `tournaments=${palimpsest.tournaments.length} ` +
    `events=${palimpsest.events.length}`
  );


  catalog =
    normalizeMarketCatalog(
      loadJson(
        MARKETGROUPS_FILE
      )
    );


  lookups =
    buildCatalogLookups(
      catalog
    );


  await batch(
    db.upsertMarketGroups,
    catalog.groups
  );

  await batch(
    db.upsertMarkets,
    catalog.markets
  );

  await batch(
    db.upsertSelections,
    catalog.selections
  );


  log(
    `[PAXTHEM][SYNC] ` +
    `groups=${catalog.groups.length} ` +
    `markets=${catalog.markets.length} ` +
    `selections=${catalog.selections.length}`
  );

}


async function syncOdds() {

  const links =
    loadLinks(
      LINKS_FILE
    );

  log(
    `[PAXTHEM][HTTP] ` +
    `${links.length} endpoint`
  );


  let successful =
    0;

  let failed =
    0;

  let totalOdds =
    0;


  await processLinks(
  links,

  async ({
    index,
    total,
    url,
    result
  }) => {

    const current = index + 1;

    if (!result.ok) {

      failed++;

      if (
        current % 25 === 0 ||
        result.status === 429 ||
        result.status >= 500 ||
        result.status == null
      ) {

        log(
          `[PAXTHEM][HTTP] ${current}/${total} ` +
          `FAILED status=${result.status ?? "TIMEOUT"} ` +
          `success=${successful} failed=${failed} odds=${totalOdds}`
        );

      }

      return;
    }


    const normalized =
      normalizeTournamentResponse(
        result.data,
        lookups.marketLookup,
        lookups.selectionLookup
      );


    if (!normalized.events.length) {

      if (current % 25 === 0) {

        log(
          `[PAXTHEM][HTTP] ${current}/${total} ` +
          `EMPTY success=${successful} failed=${failed} odds=${totalOdds}`
        );

      }

      return;
    }


    successful++;

    totalOdds +=
      normalized.odds.length;


    await batch(
      db.upsertEvents,
      normalized.events
    );

    await batch(
      db.upsertEventMarkets,
      normalized.eventMarkets
    );

    await batch(
      db.upsertOdds,
      normalized.odds
    );


    if (current % 25 === 0) {

      log(
        `[PAXTHEM][HTTP] ${current}/${total} ` +
        `OK success=${successful} failed=${failed} odds=${totalOdds}`
      );

    }

  }
);


  await db.setStatus(

    "last_http_sync",

    {

      completedAt:
        new Date()
          .toISOString(),

      successful,

      failed,

      totalOdds

    }

  );


  log(

    `[PAXTHEM][HTTP] FINE ` +

    `success=${successful} ` +

    `failed=${failed} ` +

    `odds=${totalOdds}`

  );

}


async function fullSync(
  reason
) {

  if (
    syncRunning
  ) {
    return;
  }


  syncRunning =
    true;


  try {

    log(
      `[PAXTHEM][SYNC] START ${reason}`
    );


    await syncStatic();


    await syncOdds();


    log(
      `[PAXTHEM][SYNC] END ${reason}`
    );


  } catch (
    error
  ) {

    log(
      "[PAXTHEM][SYNC] ERROR",
      error
    );


  } finally {

    syncRunning =
      false;

  }

}


async function handleMarkets(
  payload,
  channel
) {

  if (
    !payload ||
    !Array.isArray(
      payload.update
    )
  ) {
    return;
  }


  for (
    const patch
    of payload.update
  ) {

    const update =
      parseLiveOddPatch(
        patch
      );


    if (!update) {

      continue;

    }


    if (
      update.op ===
      "remove"
    ) {

      await db
        .deactivateLiveOdd(
          update
        );

      continue;

    }


    if (
      update.op ===
        "add" ||
      update.op ===
        "replace"
    ) {

      await db
        .applyLiveOddValue(
          update
        );


      log(

        "[PAXTHEM][ODD]",

        `event=${update.eventProviderId}`,

        `market=${update.marketProviderId}`,

        `selection=${update.selectionProviderId}`,

        `spread=${update.spreadKey}`,

        `value=${update.oddValue}`

      );

    }

  }


  await db.setStatus(

    "last_market_ws",

    {

      channel,

      at:
        new Date()
          .toISOString()

    }

  );

}


async function handleEvents(
  payload,
  channel
) {

  if (
    !payload ||
    !Array.isArray(
      payload.update
    )
  ) {
    return;
  }


  for (
    const patch
    of payload.update
  ) {

    const update =
      parseLiveEventPatch(
        patch
      );


    if (
      !update
    ) {
      continue;
    }


    const success =
      await db
        .applyLiveEventField(

          update.eventProviderId,

          update.field,

          update.value

        );


    if (
      success
    ) {

      log(

        "[PAXTHEM][EVENT]",

        `event=${update.eventProviderId}`,

        `${update.field}=${JSON.stringify(update.value)}`

      );

    }

  }


  await db.setStatus(

    "last_event_ws",

    {

      channel,

      at:
        new Date()
          .toISOString()

    }

  );

}


function startWebSocket() {

  ws =
    new PaxthemWS({

      onMarkets:
        handleMarkets,

      onEvents:
        handleEvents,


      onRaw:
        async (
          channel,
          event,
          payload
        ) => {

          if (
            event ===
              "live.markets.update" ||
            event ===
              "live.events.update"
          ) {

            await db
              .saveRawLiveUpdate(

                channel,

                event,

                payload

              );

          }


          await db.setStatus(

            "last_ws_message",

            new Date()
              .toISOString()

          );

        },


      onStatus:
        async status => {

          log(
            "[PAXTHEM][WS]",
            status
          );


          await db
            .setStatus(
              "ws_status",
              status
            );

        }

    });


  ws.connect();

}


async function main() {

  log(
    "[WORKER] START"
  );


  await db.ping();


  log(
    "[DB] Connessione OK"
  );


  await db.initSchema();


  log(
    "[DB] Tabelle px_* pronte"
  );


  /*
    PRIMA HTTP BASELINE
  */

  await fullSync(
    "startup"
  );


  /*
    POI WEBSOCKET
  */

  startWebSocket();


  /*
    RESYNC PERIODICO
  */

  setInterval(
    () => {

      fullSync(
        "scheduled"
      );

    },

    SYNC_INTERVAL
  );


  /*
    HEARTBEAT
  */

  setInterval(
    async () => {

      await db.setStatus(

        "worker_heartbeat",

        new Date()
          .toISOString()

      );

    },

    60000
  );


  log(
    "[WORKER] ATTIVO 24/7"
  );

}


async function shutdown(
  signal
) {

  log(
    `[WORKER] STOP ${signal}`
  );


  try {

    ws?.close();

  } catch {}


  try {

    await db.close();

  } catch {}


  process.exit(
    0
  );

}


process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM"
    )
);


process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT"
    )
);


main()
  .catch(
    error => {

      console.error(
        "[WORKER][FATAL]",
        error
      );

      process.exit(
        1
      );

    }
  );
