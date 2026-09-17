CREATE TABLE IF NOT EXISTS px_sports (
    provider_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 1000,
    active TINYINT(1) NOT NULL DEFAULT 1,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_categories (
    provider_id BIGINT NOT NULL,
    sport_provider_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 1000,
    active TINYINT(1) NOT NULL DEFAULT 1,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (provider_id),

    KEY idx_px_categories_sport (
        sport_provider_id
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_tournaments (
    provider_id BIGINT NOT NULL,
    sport_provider_id BIGINT NOT NULL,
    category_provider_id BIGINT NULL,

    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NULL,

    sort_order INT NOT NULL DEFAULT 1000,
    active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (provider_id),

    KEY idx_px_tournament_sport (
        sport_provider_id
    ),

    KEY idx_px_tournament_category (
        category_provider_id
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_events (
    provider_id BIGINT NOT NULL,

    sport_provider_id BIGINT NULL,
    category_provider_id BIGINT NULL,
    tournament_provider_id BIGINT NULL,

    short_code VARCHAR(128) NULL,

    home_name VARCHAR(255) NULL,
    home_provider_id VARCHAR(255) NULL,

    away_name VARCHAR(255) NULL,
    away_provider_id VARCHAR(255) NULL,

    begin_at DATETIME NULL,

    binding_value INT NULL,

    is_live TINYINT(1) NOT NULL DEFAULT 0,
    started TINYINT(1) NOT NULL DEFAULT 0,

    status VARCHAR(64) NULL,
    phase VARCHAR(64) NULL,

    score VARCHAR(64) NULL,
    game_score VARCHAR(64) NULL,

    timer_value VARCHAR(128) NULL,
    server_value VARCHAR(64) NULL,

    active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (provider_id),

    KEY idx_px_events_sport (
        sport_provider_id
    ),

    KEY idx_px_events_category (
        category_provider_id
    ),

    KEY idx_px_events_tournament (
        tournament_provider_id
    ),

    KEY idx_px_events_begin (
        begin_at
    ),

    KEY idx_px_events_live (
        is_live
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_market_groups (
    provider_id BIGINT NOT NULL,
    sport_provider_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,
    hint VARCHAR(255) NULL,

    is_main TINYINT(1) NOT NULL DEFAULT 0,

    sort_order INT NOT NULL DEFAULT 1000,
    active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (provider_id),

    KEY idx_px_market_group_sport (
        sport_provider_id
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_markets (
    sport_provider_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,

    group_provider_id BIGINT NULL,

    name VARCHAR(255) NOT NULL,
    hint VARCHAR(255) NULL,

    has_spread TINYINT(1) NOT NULL DEFAULT 0,

    spread_type VARCHAR(128) NULL,
    spread_default VARCHAR(128) NULL,

    is_player TINYINT(1) NOT NULL DEFAULT 0,
    is_main TINYINT(1) NOT NULL DEFAULT 0,

    active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (
        sport_provider_id,
        provider_id
    ),

    KEY idx_px_markets_group (
        group_provider_id
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_selections (
    sport_provider_id BIGINT NOT NULL,
    market_provider_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,

    hint VARCHAR(255) NULL,

    quick_code VARCHAR(128) NULL,

    active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (
        sport_provider_id,
        market_provider_id,
        provider_id
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_event_markets (
    event_provider_id BIGINT NOT NULL,

    sport_provider_id BIGINT NULL,

    market_provider_id BIGINT NOT NULL,

    group_provider_id BIGINT NULL,

    active TINYINT(1) NOT NULL DEFAULT 1,

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (
        event_provider_id,
        market_provider_id
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_odds (
    provider_unique VARCHAR(191) NOT NULL,

    event_provider_id BIGINT NOT NULL,

    sport_provider_id BIGINT NULL,

    market_provider_id BIGINT NOT NULL,

    group_provider_id BIGINT NULL,

    selection_provider_id BIGINT NOT NULL,

    spread_key VARCHAR(128) NOT NULL DEFAULT '_',

    spread_value VARCHAR(128) NULL,

    selection_label VARCHAR(255) NULL,

    quick_code VARCHAR(128) NULL,

    odd_value DECIMAL(18,6) NULL,

    active TINYINT(1) NOT NULL DEFAULT 1,

    source VARCHAR(16) NOT NULL DEFAULT 'HTTP',

    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (
        provider_unique
    ),

    KEY idx_px_odds_event (
        event_provider_id
    ),

    KEY idx_px_odds_market (
        market_provider_id
    ),

    KEY idx_px_odds_selection (
        selection_provider_id
    ),

    KEY idx_px_odds_event_market (
        event_provider_id,
        market_provider_id
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_live_raw_updates (
    id BIGINT NOT NULL AUTO_INCREMENT,

    channel_name VARCHAR(128) NULL,

    event_name VARCHAR(128) NOT NULL,

    payload_json LONGTEXT NOT NULL,

    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_px_live_raw_received (
        received_at
    )

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS px_worker_status (
    status_key VARCHAR(128) NOT NULL,

    status_value TEXT NULL,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (status_key)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
