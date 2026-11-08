import "server-only";
import { CallLog } from "./anthropic";

// one Google result from Serper
export type SearchHit = {
  title: string;
  link: string;
  snippet: string;
};

// runs one Google search through Serper (reads SERPER_API_KEY from .env.local)
export async function serperSearch(q: string, log?: CallLog) {
  let res = await sendSearch(q);
  // 429 = too many searches at once, so wait a bit and try again (up to 3 times)
  for(let tries = 0; tries < 3 && res.status == 429; tries++){
    await new Promise(r => setTimeout(r, 1000 * (tries + 1)));
    res = await sendSearch(q);
  }
  if(!res.ok){
    throw new Error("Serper search failed (" + res.status + ") for: " + q);
  }
  const data: any = await res.json();

  const hits: SearchHit[] = [];
  const organic = data.organic ?? [];
  for(const r of organic){
    hits.push({ title: r.title ?? "", link: r.link ?? "", snippet: r.snippet ?? "" });
  }

  if(log != null){
    log.searches.push(q);
    if(log.searchResults == null) log.searchResults = [];
    if(log.searchHits == null) log.searchHits = [];
    log.searchResults.push(hits.length);
    for(const h of hits){
      log.searchHits.push(h.title + "  |  " + h.link);
    }
  }
  return hits;
}

function sendSearch(q: string) {
  return fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ q: q, num: 10 }),
  });
}
