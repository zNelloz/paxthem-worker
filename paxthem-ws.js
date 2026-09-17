const WebSocket =
  require("ws");

function parsePossibleJson(
  value
) {

  if (
    typeof value !==
    "string"
  ) {
    return value;
  }

  try {

    return JSON.parse(
      value
    );

  } catch {

    return value;

  }

}

class PaxthemWS {

  constructor(
    handlers
  ) {

    this.handlers =
      handlers;

    this.ws =
      null;

    this.closed =
      false;

    this.reconnectAttempt =
      0;

    this.timer =
      null;

  }

  buildUrl() {

    const base =
      (
        process.env
          .PAXTHEM_WS_BASE ||
        "wss://ws.paxthem.com"
      ).replace(
        /\/+$/,
        ""
      );

    const key =
      process.env
        .PAXTHEM_WS_APP_KEY;

    if (!key) {

      throw new Error(
        "PAXTHEM_WS_APP_KEY mancante"
      );

    }

    return (
      `${base}/app/` +
      `${encodeURIComponent(key)}` +
      `?protocol=7` +
      `&client=js` +
      `&version=7.4.0` +
      `&flash=false`
    );

  }

  connect() {

    this.closed =
      false;

    this.open();

  }

  open() {

    const url =
      this.buildUrl();

    this.handlers
      .onStatus?.({
        type:
          "connecting"
      });

    this.ws =
      new WebSocket(
        url
      );

    this.ws.on(
      "open",
      () => {

        this.reconnectAttempt =
          0;

        this.handlers
          .onStatus?.({
            type:
              "open"
          });

      }
    );

    this.ws.on(
      "message",
      async raw => {

        let msg;

        try {

          msg =
            JSON.parse(
              raw.toString()
            );

        } catch {

          return;

        }

        const payload =
          parsePossibleJson(
            msg.data
          );

        const channel =
          msg.channel ||
          null;

        await this.handlers
          .onRaw?.(
            channel,
            msg.event,
            payload
          );

        if (
          msg.event ===
          "pusher:connection_established"
        ) {

          const connection =
            parsePossibleJson(
              msg.data
            );

          this.handlers
            .onStatus?.({

              type:
                "connected",

              socketId:
                connection
                  ?.socket_id

            });

          this.subscribe(
            "live.update.it-IT"
          );

          this.subscribe(
            "live.update"
          );

          return;

        }

        if (
          msg.event ===
          "pusher_internal:subscription_succeeded"
        ) {

          this.handlers
            .onStatus?.({

              type:
                "subscribed",

              channel

            });

          return;

        }

        if (
          msg.event ===
          "pusher:ping"
        ) {

          this.send({

            event:
              "pusher:pong",

            data:
              {}

          });

          return;

        }

        if (
          msg.event ===
          "live.markets.update"
        ) {

          await this.handlers
            .onMarkets?.(
              payload,
              channel
            );

          return;

        }

        if (
          msg.event ===
          "live.events.update"
        ) {

          await this.handlers
            .onEvents?.(
              payload,
              channel
            );

        }

      }
    );

    this.ws.on(
      "close",
      (
        code,
        reason
      ) => {

        this.handlers
          .onStatus?.({

            type:
              "closed",

            code,

            reason:
              reason.toString()

          });

        if (
          !this.closed
        ) {

          this.reconnect();

        }

      }
    );

    this.ws.on(
      "error",
      error => {

        this.handlers
          .onStatus?.({

            type:
              "error",

            message:
              error.message

          });

      }
    );

  }

  subscribe(
    channel
  ) {

    this.send({

      event:
        "pusher:subscribe",

      data: {

        auth:
          "",

        channel

      }

    });

  }

  send(
    payload
  ) {

    if (
      !this.ws ||
      this.ws.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    this.ws.send(
      JSON.stringify(
        payload
      )
    );

  }

  reconnect() {

    const min =
      Number(
        process.env
          .PAXTHEM_WS_RECONNECT_MIN_MS ||
        1000
      );

    const max =
      Number(
        process.env
          .PAXTHEM_WS_RECONNECT_MAX_MS ||
        30000
      );

    const wait =
      Math.min(
        max,
        min *
        Math.pow(
          2,
          this.reconnectAttempt
        )
      );

    this.reconnectAttempt++;

    this.timer =
      setTimeout(
        () => {

          if (
            !this.closed
          ) {

            this.open();

          }

        },
        wait
      );

  }

  close() {

    this.closed =
      true;

    if (
      this.timer
    ) {

      clearTimeout(
        this.timer
      );

    }

    try {

      this.ws?.close();

    } catch {}

  }

}

module.exports = {

  PaxthemWS

};
