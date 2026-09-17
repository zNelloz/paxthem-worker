const crypto =
  require("crypto");

function unixToSql(
  timestamp
) {

  if (
    timestamp === null ||
    timestamp === undefined
  ) {
    return null;
  }

  const date =
    new Date(
      Number(timestamp) *
      1000
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;

}

function normalizePalimpsest(
  json
) {

  const sports = [];

  const categories = [];

  const tournaments = [];

  const events = [];

  function walk(
    node,
    inherited = {}
  ) {

    if (!node) {
      return;
    }

    if (
      Array.isArray(node)
    ) {

      for (
        const child
        of node
      ) {

        walk(
          child,
          inherited
        );

      }

      return;

    }

    if (
      typeof node !==
      "object"
    ) {
      return;
    }

    const type =
      node.type;

    const sportProviderId =

      node.sport_id != null

        ? Number(
            node.sport_id
          )

        : type === "s"

          ? Number(
              node.id
            )

          : inherited
              .sportProviderId ??
            null;

    const categoryProviderId =

      type === "c"

        ? Number(
            node.id
          )

        : node.category_id != null

          ? Number(
              node.category_id
            )

          : inherited
              .categoryProviderId ??
            null;

    const tournamentProviderId =

      type === "t"

        ? Number(
            node.id
          )

        : inherited
            .tournamentProviderId ??
          null;

    if (
      type === "s" &&
      node.id != null
    ) {

      sports.push({

        providerId:
          Number(node.id),

        name:
          node.label ||
          `Sport ${node.id}`,

        icon:
          node.icon ||
          null,

        sortOrder:
          node.order != null
            ? Number(node.order)
            : 1000

      });

    }

    if (
      type === "c" &&
      node.id != null
    ) {

      categories.push({

        providerId:
          Number(node.id),

        sportProviderId,

        name:
          node.label ||
          `Category ${node.id}`,

        icon:
          node.icon ||
          null,

        sortOrder:
          node.order != null
            ? Number(node.order)
            : 1000

      });

    }

    if (
      type === "t" &&
      node.id != null
    ) {

      tournaments.push({

        providerId:
          Number(node.id),

        sportProviderId,

        categoryProviderId,

        name:
          node.label ||
          `Tournament ${node.id}`,

        icon:
          node.icon ||
          null,

        sortOrder:
          node.order != null
            ? Number(node.order)
            : 1000

      });

    }

    if (
      type === "e" &&
      node.id != null
    ) {

      events.push({

        providerId:
          Number(node.id),

        sportProviderId,

        categoryProviderId,

        tournamentProviderId,

        shortCode:
          node.short != null
            ? String(node.short)
            : null,

        homeName:
          node.home ??
          null,

        homeProviderId:
          node.home_id != null
            ? String(node.home_id)
            : null,

        awayName:
          node.away ??
          null,

        awayProviderId:
          node.away_id != null
            ? String(node.away_id)
            : null,

        beginAt:
          unixToSql(
            node.begin
          ),

        bindingValue:
          node.binding != null
            ? Number(node.binding)
            : null,

        isLive:
          Boolean(
            node.started
          ),

        started:
          Boolean(
            node.started
          ),

        status:
          node.status ??
          null,

        phase:
          node.phase ??
          null,

        score:
          node.score ??
          null,

        gameScore:
          node.gamescore ??
          node.game_score ??
          null,

        timerValue:
          node.timer != null
            ? String(node.timer)
            : null,

        serverValue:
          node.server != null
            ? String(node.server)
            : null

      });

    }

    if (
      Array.isArray(
        node.children
      )
    ) {

      walk(
        node.children,
        {
          sportProviderId,
          categoryProviderId,
          tournamentProviderId
        }
      );

    }

  }

  walk(
    json?.data?.sports ??
    json?.sports ??
    []
  );

  return {

    sports,

    categories,

    tournaments,

    events

  };

}

function normalizeMarketCatalog(
  json
) {

  const rawGroups =
    json?.data?.marketgroups ??
    json?.marketgroups ??
    [];

  const rawMarkets =
    json?.data?.markets ??
    json?.markets ??
    [];

  const groupsArray =
    Array.isArray(rawGroups)

      ? rawGroups

      : Object.values(
          rawGroups
        );

  const marketsArray =
    Array.isArray(rawMarkets)

      ? rawMarkets

      : Object.values(
          rawMarkets
        );

  const groups = [];

  const markets = [];

  const selections = [];

  for (
    const group
    of groupsArray
  ) {

    if (
      !group ||
      group.id == null ||
      group.sport_id == null
    ) {
      continue;
    }

    groups.push({

      providerId:
        Number(group.id),

      sportProviderId:
        Number(
          group.sport_id
        ),

      name:
        group.label ||
        `Group ${group.id}`,

      hint:
        group.hint ||
        null,

      isMain:
        Boolean(
          group.main
        ),

      sortOrder:
        group.order != null
          ? Number(group.order)
          : 1000

    });

  }

  for (
    const market
    of marketsArray
  ) {

    if (
      !market ||
      market.id == null ||
      market.sport_id == null
    ) {
      continue;
    }

    const normalized = {

      providerId:
        Number(market.id),

      sportProviderId:
        Number(
          market.sport_id
        ),

      groupProviderId:

        market.group_id != null

          ? Number(
              market.group_id
            )

          : market.group != null

            ? Number(
                market.group
              )

            : null,

      name:
        market.label ||
        `Market ${market.id}`,

      hint:
        market.hint ||
        null,

      hasSpread:
        Boolean(
          market.spread
        ),

      spreadType:
        market.spread_type != null
          ? String(
              market.spread_type
            )
          : null,

      spreadDefault:
        market.spread_default != null
          ? String(
              market.spread_default
            )
          : null,

      isPlayer:
        Boolean(
          market.player
        ),

      isMain:
        Boolean(
          market.main
        )

    };

    markets.push(
      normalized
    );

    const odds =
      Array.isArray(
        market.odds
      )

        ? market.odds

        : [];

    for (
      const selection
      of odds
    ) {

      if (
        selection.id == null
      ) {
        continue;
      }

      selections.push({

        sportProviderId:
          normalized
            .sportProviderId,

        marketProviderId:
          normalized
            .providerId,

        providerId:
          Number(
            selection.id
          ),

        name:
          selection.label ||
          `Selection ${selection.id}`,

        hint:
          selection.hint ||
          null,

        quickCode:
          selection.quick != null
            ? String(
                selection.quick
              )
            : null

      });

    }

  }

  return {

    groups,

    markets,

    selections

  };

}

function buildCatalogLookups(
  catalog
) {

  const marketLookup =
    new Map();

  const selectionLookup =
    new Map();

  for (
    const market
    of catalog.markets
  ) {

    marketLookup.set(
      `${market.sportProviderId}:${market.providerId}`,
      market
    );

  }

  for (
    const selection
    of catalog.selections
  ) {

    selectionLookup.set(
      `${selection.sportProviderId}:${selection.marketProviderId}:${selection.providerId}`,
      selection
    );

  }

  return {

    marketLookup,

    selectionLookup

  };

}

function syntheticUnique(
  eventId,
  marketId,
  selectionId,
  spread
) {

  const raw =
    `${eventId}:${marketId}:${selectionId}:${spread}`;

  const hash =
    crypto
      .createHash("sha1")
      .update(raw)
      .digest("hex");

  return `http:${hash}`;

}

function normalizeTournamentResponse(
  json,
  marketLookup,
  selectionLookup
) {

  const rawEvents =
    json?.data?.events ??
    json?.events ??
    [];

  const events = [];

  const eventMarkets = [];

  const odds = [];

  if (
    !Array.isArray(
      rawEvents
    )
  ) {

    return {
      events,
      eventMarkets,
      odds
    };

  }

  for (
    const event
    of rawEvents
  ) {

    if (
      !event ||
      event.id == null
    ) {
      continue;
    }

    const eventId =
      Number(event.id);

    const sportId =
      event.sport_id != null
        ? Number(
            event.sport_id
          )
        : null;

    const categoryId =
      event.category_id != null
        ? Number(
            event.category_id
          )
        : null;

    const tournamentId =
      event.tournament_id != null
        ? Number(
            event.tournament_id
          )
        : null;

    events.push({

      providerId:
        eventId,

      sportProviderId:
        sportId,

      categoryProviderId:
        categoryId,

      tournamentProviderId:
        tournamentId,

      shortCode:
        event.short != null
          ? String(event.short)
          : null,

      homeName:
        event.home ??
        null,

      homeProviderId:
        event.home_id != null
          ? String(event.home_id)
          : null,

      awayName:
        event.away ??
        null,

      awayProviderId:
        event.away_id != null
          ? String(event.away_id)
          : null,

      beginAt:
        unixToSql(
          event.begin
        ),

      bindingValue:
        event.binding != null
          ? Number(event.binding)
          : null,

      isLive:
        Boolean(
          event.started
        ),

      started:
        Boolean(
          event.started
        ),

      status:
        event.status ??
        null,

      phase:
        event.phase ??
        null,

      score:
        event.score ??
        null,

      gameScore:
        event.gamescore ??
        null,

      timerValue:
        event.timer != null
          ? String(event.timer)
          : null,

      serverValue:
        event.server != null
          ? String(event.server)
          : null

    });

    const markets =
      Array.isArray(
        event.markets
      )

        ? event.markets

        : [];

    for (
      const market
      of markets
    ) {

      if (
        market.id == null
      ) {
        continue;
      }

      const marketId =
        Number(
          market.id
        );

      const marketDef =
        marketLookup.get(
          `${sportId}:${marketId}`
        );

      const groupId =

        market.group != null

          ? Number(
              market.group
            )

          : marketDef
              ?.groupProviderId ??
            null;

      eventMarkets.push({

        eventProviderId:
          eventId,

        sportProviderId:
          sportId,

        marketProviderId:
          marketId,

        groupProviderId:
          groupId

      });

      const rawOdds =
        Array.isArray(
          market.odds
        )

          ? market.odds

          : [];

      for (
        const odd
        of rawOdds
      ) {

        if (
          odd.id == null
        ) {
          continue;
        }

        const selectionId =
          Number(
            odd.id
          );

        const spreadKey =

          odd.spread === null ||
          odd.spread === undefined ||
          odd.spread === ""

            ? "_"

            : String(
                odd.spread
              );

        const selectionDef =
          selectionLookup.get(
            `${sportId}:${marketId}:${selectionId}`
          );

        const unique =

          odd.unique != null

            ? String(
                odd.unique
              )

            : syntheticUnique(
                eventId,
                marketId,
                selectionId,
                spreadKey
              );

        odds.push({

          providerUnique:
            unique,

          eventProviderId:
            eventId,

          sportProviderId:
            sportId,

          marketProviderId:
            marketId,

          groupProviderId:
            groupId,

          selectionProviderId:
            selectionId,

          spreadKey,

          spreadValue:
            odd.spread != null
              ? String(
                  odd.spread
                )
              : null,

          selectionLabel:
            selectionDef
              ?.name ??
            null,

          quickCode:
            odd.quick != null
              ? String(
                  odd.quick
                )
              : null,

          oddValue:
            odd.value != null
              ? Number(
                  odd.value
                )
              : null,

          active:
            true,

          source:
            "HTTP"

        });

      }

    }

  }

  return {

    events,

    eventMarkets,

    odds

  };

}

function parseLiveOddPatch(
  patch
) {

  if (
    !patch ||
    typeof patch.path !==
      "string"
  ) {
    return null;
  }

  const parts =
    patch.path
      .split("/")
      .filter(Boolean);

  /*
      osservato:

      /eventId/marketId/odds/spread/selectionId/value
  */

  if (
    parts.length >= 6 &&
    parts[2] === "odds" &&
    parts[5] === "value"
  ) {

    return {

      op:
        patch.op,

      eventProviderId:
        Number(parts[0]),

      marketProviderId:
        Number(parts[1]),

      spreadKey:
        parts[3],

      selectionProviderId:
        Number(parts[4]),

      oddValue:
        patch.value != null
          ? Number(
              patch.value
            )
          : null

    };

  }

  return null;

}

function parseLiveEventPatch(
  patch
) {

  if (
    !patch ||
    typeof patch.path !==
      "string"
  ) {
    return null;
  }

  const parts =
    patch.path
      .split("/")
      .filter(Boolean);

  if (
    parts.length < 2
  ) {
    return null;
  }

  return {

    op:
      patch.op,

    eventProviderId:
      Number(parts[0]),

    field:
      parts[1],

    value:
      patch.value

  };

}

module.exports = {

  normalizePalimpsest,

  normalizeMarketCatalog,

  buildCatalogLookups,

  normalizeTournamentResponse,

  parseLiveOddPatch,

  parseLiveEventPatch

};
