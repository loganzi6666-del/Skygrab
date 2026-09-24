const TARGET = "https://bskygrab.pages.dev/api/trends?lang=ja";

/* One request is enough. The collector sweeps every source and every locale on
   each run, so hitting it once refreshes Japanese, English, Korean and
   Portuguese together. */
function poke() {
  return fetch(TARGET, { headers: { "user-agent": "bskygrab-trends-cron" } });
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(poke());
  },

  /* Opening the worker URL in a browser forces a sweep. Handy for checking the
     collector without waiting for the next tick. */
  async fetch() {
    let status;
    try {
      status = (await poke()).status;
    } catch (e) {
      return new Response("failed: " + e.message + "\n", { status: 502 });
    }
    return new Response("triggered: " + status + "\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
