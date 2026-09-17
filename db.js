const fs = require("fs");
const mysql = require("mysql2/promise");

const ssl =
  String(process.env.DB_SSL || "0") === "1"
    ? {
        rejectUnauthorized: true
      }
    : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST,

  port:
    Number(
      process.env.DB_PORT || 3306
    ),

  user:
    process.env.DB_USER,

  password:
    process.env.DB_PASSWORD,

  database:
    process.env.DB_NAME,

  charset:
    "utf8mb4",

  waitForConnections:
    true,

  connectionLimit:
    8,

  queueLimit:
    0,

  enableKeepAlive:
    true,

  keepAliveInitialDelay:
    10000,

  multipleStatements:
    true,

  ssl
});

async function initSchema() {

  const sql =
    fs.readFileSync(
      "./schema.sql",
      "utf8"
    );

  const conn =
    await pool.getConnection();

  try {

    await conn.query(sql);

  } finally {

    conn.release();

  }

}

async function ping() {

  await pool.query(
    "SELECT 1"
  );

}

async function setStatus(
  key,
  value
) {

  const data =
    typeof value === "string"
      ? value
      : JSON.stringify(value);

  await pool.execute(
    `
    INSERT INTO px_worker_status
    (
      status_key,
      status_value,
      updated_at
    )

    VALUES (?, ?, NOW())

    ON DUPLICATE KEY UPDATE

    status_value =
      VALUES(status_value),

    updated_at =
      NOW()
    `,
    [
      key,
      data
    ]
  );

}

async function bulkQuery(
  sql,
  rows
) {

  if (!rows.length) {
    return;
  }

  await pool.query(
    sql,
    [rows]
  );

}

async function upsertSports(rows) {

  await bulkQuery(
    `
    INSERT INTO px_sports
    (
      provider_id,
      name,
      icon,
      sort_order,
      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      name =
        VALUES(name),

      icon =
        VALUES(icon),

      sort_order =
        VALUES(sort_order),

      active = 1,

      last_seen_at =
        NOW()
    `,
    rows.map(
      x => [
        x.providerId,
        x.name,
        x.icon || null,
        x.sortOrder ?? 1000,
        1,
        new Date()
      ]
    )
  );

}

async function upsertCategories(rows) {

  await bulkQuery(
    `
    INSERT INTO px_categories
    (
      provider_id,
      sport_provider_id,
      name,
      icon,
      sort_order,
      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      sport_provider_id =
        VALUES(sport_provider_id),

      name =
        VALUES(name),

      icon =
        VALUES(icon),

      sort_order =
        VALUES(sort_order),

      active = 1,

      last_seen_at =
        NOW()
    `,
    rows.map(
      x => [
        x.providerId,
        x.sportProviderId,
        x.name,
        x.icon || null,
        x.sortOrder ?? 1000,
        1,
        new Date()
      ]
    )
  );

}

async function upsertTournaments(rows) {

  await bulkQuery(
    `
    INSERT INTO px_tournaments
    (
      provider_id,
      sport_provider_id,
      category_provider_id,
      name,
      icon,
      sort_order,
      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      sport_provider_id =
        VALUES(sport_provider_id),

      category_provider_id =
        VALUES(category_provider_id),

      name =
        VALUES(name),

      icon =
        VALUES(icon),

      sort_order =
        VALUES(sort_order),

      active = 1,

      last_seen_at =
        NOW()
    `,
    rows.map(
      x => [
        x.providerId,
        x.sportProviderId,
        x.categoryProviderId,
        x.name,
        x.icon || null,
        x.sortOrder ?? 1000,
        1,
        new Date()
      ]
    )
  );

}

async function upsertEvents(rows) {

  if (!rows.length) {
    return;
  }

  const values =
    rows.map(
      x => [
        x.providerId,

        x.sportProviderId ??
          null,

        x.categoryProviderId ??
          null,

        x.tournamentProviderId ??
          null,

        x.shortCode ??
          null,

        x.homeName ??
          null,

        x.homeProviderId ??
          null,

        x.awayName ??
          null,

        x.awayProviderId ??
          null,

        x.beginAt ??
          null,

        x.bindingValue ??
          null,

        x.isLive ? 1 : 0,

        x.started ? 1 : 0,

        x.status ??
          null,

        x.phase ??
          null,

        x.score ??
          null,

        x.gameScore ??
          null,

        x.timerValue ??
          null,

        x.serverValue ??
          null,

        1,

        new Date()
      ]
    );

  await pool.query(
    `
    INSERT INTO px_events
    (
      provider_id,
      sport_provider_id,
      category_provider_id,
      tournament_provider_id,

      short_code,

      home_name,
      home_provider_id,

      away_name,
      away_provider_id,

      begin_at,

      binding_value,

      is_live,
      started,

      status,
      phase,

      score,
      game_score,

      timer_value,
      server_value,

      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      sport_provider_id =
        COALESCE(
          VALUES(sport_provider_id),
          sport_provider_id
        ),

      category_provider_id =
        COALESCE(
          VALUES(category_provider_id),
          category_provider_id
        ),

      tournament_provider_id =
        COALESCE(
          VALUES(tournament_provider_id),
          tournament_provider_id
        ),

      home_name =
        COALESCE(
          VALUES(home_name),
          home_name
        ),

      away_name =
        COALESCE(
          VALUES(away_name),
          away_name
        ),

      begin_at =
        COALESCE(
          VALUES(begin_at),
          begin_at
        ),

      is_live =
        VALUES(is_live),

      started =
        VALUES(started),

      status =
        COALESCE(
          VALUES(status),
          status
        ),

      phase =
        COALESCE(
          VALUES(phase),
          phase
        ),

      score =
        COALESCE(
          VALUES(score),
          score
        ),

      game_score =
        COALESCE(
          VALUES(game_score),
          game_score
        ),

      timer_value =
        COALESCE(
          VALUES(timer_value),
          timer_value
        ),

      server_value =
        COALESCE(
          VALUES(server_value),
          server_value
        ),

      active = 1,

      last_seen_at =
        NOW()
    `,
    [values]
  );

}

async function upsertMarketGroups(rows) {

  if (!rows.length) {
    return;
  }

  await pool.query(
    `
    INSERT INTO px_market_groups
    (
      provider_id,
      sport_provider_id,
      name,
      hint,
      is_main,
      sort_order,
      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      sport_provider_id =
        VALUES(sport_provider_id),

      name =
        VALUES(name),

      hint =
        VALUES(hint),

      is_main =
        VALUES(is_main),

      active = 1,

      last_seen_at =
        NOW()
    `,
    [
      rows.map(
        x => [
          x.providerId,
          x.sportProviderId,
          x.name,
          x.hint || null,
          x.isMain ? 1 : 0,
          x.sortOrder ?? 1000,
          1,
          new Date()
        ]
      )
    ]
  );

}

async function upsertMarkets(rows) {

  if (!rows.length) {
    return;
  }

  await pool.query(
    `
    INSERT INTO px_markets
    (
      sport_provider_id,
      provider_id,

      group_provider_id,

      name,
      hint,

      has_spread,

      spread_type,
      spread_default,

      is_player,
      is_main,

      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      group_provider_id =
        VALUES(group_provider_id),

      name =
        VALUES(name),

      hint =
        VALUES(hint),

      has_spread =
        VALUES(has_spread),

      spread_type =
        VALUES(spread_type),

      spread_default =
        VALUES(spread_default),

      is_player =
        VALUES(is_player),

      is_main =
        VALUES(is_main),

      active = 1,

      last_seen_at =
        NOW()
    `,
    [
      rows.map(
        x => [
          x.sportProviderId,
          x.providerId,
          x.groupProviderId ?? null,
          x.name,
          x.hint || null,
          x.hasSpread ? 1 : 0,
          x.spreadType ?? null,
          x.spreadDefault ?? null,
          x.isPlayer ? 1 : 0,
          x.isMain ? 1 : 0,
          1,
          new Date()
        ]
      )
    ]
  );

}

async function upsertSelections(rows) {

  if (!rows.length) {
    return;
  }

  await pool.query(
    `
    INSERT INTO px_selections
    (
      sport_provider_id,
      market_provider_id,
      provider_id,

      name,
      hint,
      quick_code,

      active,
      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      name =
        VALUES(name),

      hint =
        VALUES(hint),

      quick_code =
        VALUES(quick_code),

      active = 1,

      last_seen_at =
        NOW()
    `,
    [
      rows.map(
        x => [
          x.sportProviderId,
          x.marketProviderId,
          x.providerId,
          x.name,
          x.hint || null,
          x.quickCode ?? null,
          1,
          new Date()
        ]
      )
    ]
  );

}

async function upsertEventMarkets(rows) {

  if (!rows.length) {
    return;
  }

  await pool.query(
    `
    INSERT INTO px_event_markets
    (
      event_provider_id,

      sport_provider_id,

      market_provider_id,

      group_provider_id,

      active,

      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      sport_provider_id =
        COALESCE(
          VALUES(sport_provider_id),
          sport_provider_id
        ),

      group_provider_id =
        COALESCE(
          VALUES(group_provider_id),
          group_provider_id
        ),

      active = 1,

      last_seen_at =
        NOW()
    `,
    [
      rows.map(
        x => [
          x.eventProviderId,
          x.sportProviderId ?? null,
          x.marketProviderId,
          x.groupProviderId ?? null,
          1,
          new Date()
        ]
      )
    ]
  );

}

async function upsertOdds(rows) {

  if (!rows.length) {
    return;
  }

  await pool.query(
    `
    INSERT INTO px_odds
    (
      provider_unique,

      event_provider_id,

      sport_provider_id,

      market_provider_id,

      group_provider_id,

      selection_provider_id,

      spread_key,

      spread_value,

      selection_label,

      quick_code,

      odd_value,

      active,

      source,

      last_seen_at
    )

    VALUES ?

    ON DUPLICATE KEY UPDATE

      sport_provider_id =
        COALESCE(
          VALUES(sport_provider_id),
          sport_provider_id
        ),

      group_provider_id =
        COALESCE(
          VALUES(group_provider_id),
          group_provider_id
        ),

      selection_label =
        COALESCE(
          VALUES(selection_label),
          selection_label
        ),

      quick_code =
        COALESCE(
          VALUES(quick_code),
          quick_code
        ),

      odd_value =
        VALUES(odd_value),

      active =
        VALUES(active),

      source =
        VALUES(source),

      last_seen_at =
        NOW()
    `,
    [
      rows.map(
        x => [
          String(
            x.providerUnique
          ),

          x.eventProviderId,

          x.sportProviderId ??
            null,

          x.marketProviderId,

          x.groupProviderId ??
            null,

          x.selectionProviderId,

          x.spreadKey ??
            "_",

          x.spreadValue ??
            null,

          x.selectionLabel ??
            null,

          x.quickCode ??
            null,

          x.oddValue ??
            null,

          x.active === false
            ? 0
            : 1,

          x.source ||
            "HTTP",

          new Date()
        ]
      )
    ]
  );

}

async function applyLiveOddValue(
  update
) {

  const {
    eventProviderId,
    marketProviderId,
    selectionProviderId,
    spreadKey,
    oddValue
  } = update;

  const [rows] =
    await pool.execute(
      `
      SELECT provider_unique

      FROM px_odds

      WHERE
        event_provider_id = ?

      AND
        market_provider_id = ?

      AND
        selection_provider_id = ?

      AND
        spread_key = ?

      ORDER BY
        updated_at DESC

      LIMIT 1
      `,
      [
        eventProviderId,
        marketProviderId,
        selectionProviderId,
        spreadKey
      ]
    );

  if (rows.length) {

    await pool.execute(
      `
      UPDATE px_odds

      SET
        odd_value = ?,
        source = 'WS',
        active = 1,
        last_seen_at = NOW()

      WHERE
        provider_unique = ?
      `,
      [
        oddValue,
        rows[0].provider_unique
      ]
    );

    return;
  }

  const unique =
    `ws:${eventProviderId}:${marketProviderId}:${spreadKey}:${selectionProviderId}`;

  await pool.execute(
    `
    INSERT INTO px_odds
    (
      provider_unique,
      event_provider_id,
      market_provider_id,
      selection_provider_id,
      spread_key,
      odd_value,
      active,
      source,
      last_seen_at
    )

    VALUES
    (?, ?, ?, ?, ?, ?, 1, 'WS', NOW())

    ON DUPLICATE KEY UPDATE

      odd_value =
        VALUES(odd_value),

      active = 1,

      source = 'WS',

      last_seen_at =
        NOW()
    `,
    [
      unique,
      eventProviderId,
      marketProviderId,
      selectionProviderId,
      spreadKey,
      oddValue
    ]
  );

}

async function deactivateLiveOdd(
  update
) {

  await pool.execute(
    `
    UPDATE px_odds

    SET
      active = 0,
      source = 'WS',
      last_seen_at = NOW()

    WHERE
      event_provider_id = ?

    AND
      market_provider_id = ?

    AND
      selection_provider_id = ?

    AND
      spread_key = ?
    `,
    [
      update.eventProviderId,
      update.marketProviderId,
      update.selectionProviderId,
      update.spreadKey
    ]
  );

}

const EVENT_FIELDS = {

  score:
    "score",

  gamescore:
    "game_score",

  game_score:
    "game_score",

  timer:
    "timer_value",

  phase:
    "phase",

  started:
    "started",

  server:
    "server_value",

  status:
    "status"

};

async function applyLiveEventField(
  eventId,
  field,
  value
) {

  const column =
    EVENT_FIELDS[field];

  if (!column) {
    return false;
  }

  const dbValue =
    column === "started"
      ? value
        ? 1
        : 0
      : value;

  await pool.execute(
    `
    UPDATE px_events

    SET
      ${column} = ?,

      is_live = 1,

      active = 1,

      last_seen_at = NOW()

    WHERE
      provider_id = ?
    `,
    [
      dbValue,
      eventId
    ]
  );

  return true;

}

async function saveRawLiveUpdate(
  channel,
  event,
  payload
) {

  await pool.execute(
    `
    INSERT INTO px_live_raw_updates
    (
      channel_name,
      event_name,
      payload_json,
      received_at
    )

    VALUES
    (?, ?, ?, NOW())
    `,
    [
      channel || null,
      event,
      JSON.stringify(payload)
    ]
  );

}

async function close() {

  await pool.end();

}

module.exports = {

  pool,

  initSchema,

  ping,

  setStatus,

  upsertSports,

  upsertCategories,

  upsertTournaments,

  upsertEvents,

  upsertMarketGroups,

  upsertMarkets,

  upsertSelections,

  upsertEventMarkets,

  upsertOdds,

  applyLiveOddValue,

  deactivateLiveOdd,

  applyLiveEventField,

  saveRawLiveUpdate,

  close

};
