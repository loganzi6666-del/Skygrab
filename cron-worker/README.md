# cron-worker

Wakes the ranking collector on `bskygrab.pages.dev`.

Pages Functions cannot run on a schedule, and the collector only sweeps when a
page is requested. With almost no traffic the daily board started empty every
midnight and stayed that way. This worker pokes `/api/trends` every ten minutes.

One request is enough: the collector sweeps every source and every locale on each
run, so a single poke refreshes Japanese, English, Korean and Portuguese together.

The schedule lives in `wrangler.toml`, so the code and the cron trigger deploy
together from this directory. Nothing needs to be pasted into the dashboard.

## Checking it

Opening the worker URL forces a sweep and reports the status it got back:

```
https://bskygrab-trends-cron.flyhong3.workers.dev/
```

`triggered: 200` means the collector ran.
