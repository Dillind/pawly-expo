# Breed data sources for a pet picker

Research dated 2026-08-27. Two questions. What does Lyka use for its breed dropdown, and what
should Crumpet use for a dog and cat breed picker.

Every claim below is cited. Where I could not see something, I say so.

## The short version

Lyka does not use a public breed API. They serve their own list of **510 dog breeds** from their own
backend, in one bootstrap call, with integer ids and weight data attached. It is their own dataset,
not a licensed one.

For Crumpet, the answer is to seed a static table in Postgres. The only source with a licence that
plainly allows that is **Wikidata (CC0)**. The commercial breed APIs forbid exactly what we want to
do, and the kennel clubs publish no licence at all.

---

## 1. Lyka

### What I actually did

I fetched `https://lyka.com.au/get-started` with curl. It is an Astro page whose body is one empty
`<div id="app" class="bab">` plus a single module script:

```html
<script
  src="https://build-a-box.d2c.lyka.com.au/index.js"
  type="module"
  crossorigin="anonymous"></script>
```

So the whole sign-up flow is a client-side app ("build-a-box"), and the HTML contains no breed
markup at all. I downloaded that bundle (1.34 MB) and read it.

### What the bundle shows

The bundle is a Vue app with a Pinia store called `dataStore`. It exposes `breeds`, `bodyShapes`,
`activityLevels`, `allergies`, `illnesses`, `foodTypes` and `howDidYouHear`, and it fills all of them
from **one** request:

```js
const S = await k.get('marketing/buildabox/initiate', {}, Nne);
e.value = S.data;
```

The base URL is baked into the bundle as `VITE_LYKA_API_URL: "https://production.api.lyka.com.au/api/v1/"`.

Breeds are looked up by integer id (`findRecord("breeds", n.primary)`), and the app reads a breed id
straight off the query string with `parseInt`, which only works if the ids are stable.

### The response

I called that endpoint directly, unauthenticated:

```
GET https://production.api.lyka.com.au/api/v1/marketing/buildabox/initiate
→ 200, 160 KB of JSON
```

- **510 breed records**, of which **497** have `active: true`. The app filters on `active`.
- Each record looks like this:

```json
{
  "id": 1,
  "name": "Affenpinscher",
  "adult_weight_male_min": 3,
  "adult_weight_male_max": 6,
  "male_size_classification": "teacup",
  "adult_weight_female_min": 3,
  "adult_weight_female_max": 6,
  "female_size_classification": "teacup",
  "adult_age_months_max": 9,
  "breed_examples": "",
  "active": true
}
```

- The list is dogs only. It includes Australian designer crosses that no kennel club recognises —
  `Affenpoo (Affenpinscher/ Poodle)`, Cavoodle, Groodle, Spoodle, Moodle. The bundle even ships
  hand-made photos for them under `/src/assets/images/breed-bottom-sheet/`.
- It includes seven deliberate fallbacks: `Unknown (Teacup Mix)`, `Unknown (Toy Mix)`,
  `Unknown (Small Mix)`, `Unknown (Medium Mix)`, `Unknown (Large Mix)`, `Unknown (Giant Mix)` and a
  plain `Unknown (Mix)`. The app sorts these into a separate group by adult weight.

### What this means

The evidence is strong that this is **Lyka's own dataset, not a third-party API**. Three reasons:

1. The fields are commercial, not taxonomic. Weight ranges by sex, a size classification, and the
   month at which the breed counts as adult. Those exist to size a food portion. No general breed API
   ships that shape of data.
2. The list contains Australian crossbreeds that the FCI and the AKC do not recognise (see below).
   Those cannot have come from a kennel-club-derived source.
3. There is no third-party breed host anywhere in the bundle. The only external services referenced
   are Stripe, Segment, Flagsmith, Sentry, Google Maps, reCAPTCHA, Zendesk, Trustpilot and
   addressfinder.io. No breed vendor.

**What I cannot tell you**: where Lyka originally got the 510 names, and whether they licensed a
seed list from someone before curating it. Nothing in the bundle or the response says.

The pattern is still the useful finding: **one list, their own ids, delivered in a single bootstrap
call, cached client-side.** Not a live per-keystroke lookup.

---

## 2. The candidate sources

### TheDogAPI and TheCatAPI

[thedogapi.com](https://thedogapi.com/) advertises "Medical, nutritional and behavioural data on
over 650 breeds and mixes". [thecatapi.com](https://thecatapi.com/) advertises "60k+ Images. Breeds.
Facts."

**Coverage:** dogs and cats, as two separate products.

**Free access:** thecatapi.com lists three tiers — Free at $0/month with "10,000 requests a month",
Startup at $99/month with "100,000 requests a month" plus commercial licensing, and Enterprise at
custom pricing. thedogapi.com's own page names a Startup package and "custom pricing for your
Enterprise needs" but publishes **no numbers**. I could not find a numeric price on the dog side.

**A key is now mandatory.** Both breed endpoints used to answer without one. As of this research
they do not:

```
GET https://api.thedogapi.com/v1/breeds  → 403
GET https://api.thecatapi.com/v1/breeds  → 403
{"statusCode":403,"message":"The AI analysis service is temporarily unavailable. Please try again later.","error":"Forbidden"}
```

**The licence rules this out.** From
[Data Licensing Conditions](https://thedogapi.com/data-licensing-conditions), the terms are:

- Data may be stored "only for as long as you hold an active, paid subscription".
- On termination you must "permanently and irreversibly delete all copies" within 30 days, including
  backups and caches.
- You "may not resell, redistribute, sublicense, or publish the Licensed Data, in whole or in part"
  without written permission.
- Attribution notices must not be removed or altered.

Seeding a permanent `breeds` table in our own Postgres is precisely the thing this licence forbids.
It also means the value stored on a Pet would be tied to a subscription we might not keep. That is
the opposite of stable.

**Verdict: no.** Good data, wrong licence for a seeded table.

### Dog CEO

[dog.ceo](https://dog.ceo/dog-api/documentation/) is an image API. It has a breed list endpoint
because the images are filed by breed.

```
GET https://dog.ceo/api/breeds/list/all  → 200
```

**108 top-level breeds, 165 breed/sub-breed pairs.** That is small, and the naming is
image-folder naming, not display naming — `affenpinscher`, `african` with a sub-breed `wild`. It has
no ids, only slugs, and no cats.

The code repo [ElliottLandsborough/dog-ceo-api](https://github.com/ElliottLandsborough/dog-ceo-api)
carries an **MIT** licence badge. That covers the API code. The repo page does not state a licence
for the breed data or the images, which live in a separate repo
(`jigsawpieces/dog-api-images`).

**Verdict: no.** Too small, no ids, dogs only, and the data licence is unstated.

### AKC (American Kennel Club)

[akc.org/dog-breeds](https://www.akc.org/dog-breeds/) says the AKC recognises **200 breeds**, and
notes "there are over 340 dog breeds known throughout the world".

The page carries "© The American Kennel Club, Inc. 2026. All rights reserved." and links a "Material
Reproduction Policy". **There is no public API and no data licensing offer anywhere on the page.**

**Verdict: no.** No API, no licence, and an American list for an Australian audience.

### ANKC / Dogs Australia

The ANKC has rebranded. `ankc.org.au` and `www.ankc.org.au` **do not resolve at all** — curl fails
to connect to both. The organisation is now at
[dogsaustralia.org.au](https://www.dogsaustralia.org.au/).

Its breed browser is at `/BrowseBreed/browse-a-breed/`. I fetched it. The page is 36 KB of shell —
the breed list is loaded client-side and no breed names appear in the HTML. Their groups follow the
Australian convention (the page references a "Utility group", which the FCI does not have).

There is no download, no API, and no stated licence.

**Verdict: no as a source, but relevant as a check.** If we ship a list to Australians, Dogs
Australia's group names are the vocabulary an Australian owner expects.

### FCI (Fédération Cynologique Internationale)

The [FCI nomenclature](https://www.fci.be/en/nomenclature/) is the international standard. It is
organised into 10 groups. I scraped the ten group pages and counted the unique breed pages in each:

| Group                                                              | Breeds  |
| ------------------------------------------------------------------ | ------- |
| 1 Sheepdogs and Cattledogs                                         | 43      |
| 2 Pinscher and Schnauzer, Molossoid, Swiss Mountain and Cattledogs | 53      |
| 3 Terriers                                                         | 34      |
| 4 Dachshunds                                                       | 1       |
| 5 Spitz and primitive types                                        | 46      |
| 6 Scent hounds and related breeds                                  | 70      |
| 7 Pointing Dogs                                                    | 36      |
| 8 Retrievers, Flushing Dogs, Water Dogs                            | 22      |
| 9 Companion and Toy Dogs                                           | 26      |
| 10 Sighthounds                                                     | 13      |
| **Total**                                                          | **344** |

Every breed carries a stable FCI number in its own URL — for example
`AUSTRALIAN-STUMPY-TAIL-CATTLE-DOG-351.html` is breed 351. That is a genuine stable identifier.

**Format:** HTML pages plus one PDF standard per breed. There is a
`nomenclature/docs/STD-LIS-CTR-RNS.pdf` listing standards by country, but **no CSV, Excel or JSON
export of the breed list**. Getting it means scraping.

**Licence:** I could not find one. The nomenclature page links a "Legal notice"; that page
(`/en/Legal-notice-97.html`) gives the FCI office address, the editorial director and the hosting
firm, and **states no copyright or reproduction terms at all**. Absence of a licence is not
permission.

**Verdict: no as a bulk source.** Dogs only, no export, no licence, and 344 breeds that exclude
every Australian designer cross a Crumpet user will actually own.

### Wikidata

The [Wikidata Query Service](https://query.wikidata.org/) answers SPARQL over HTTP. I ran both
queries.

**Dogs** — `?item wdt:P31 wd:Q39367` (instance of "dog breed") returns **1,143 items**.

**Cats** — `?item wdt:P31 wd:Q43577` (instance of "cat breed") returns **141 items**.

```sparql
SELECT ?item ?itemLabel WHERE {
  ?item wdt:P31 wd:Q39367 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

Each result carries a Q-id (`Q38280` and so on). A Q-id is a permanent identifier — that is exactly
the stable value we want on the Pet row.

**Licence.** [Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing) states that "All
structured data in the main, property and lexeme namespaces is made available under the Creative
Commons CC0 License (Public domain)". CC0 requires **no attribution** and places no restriction on
storing, redistributing or bundling the data.

**Caveat.** 1,143 is too many and too loose. The set includes extinct breeds, landraces and
population types, not just breeds a person owns. It needs curating down. That is a one-off job, not
a recurring cost.

Note the Wikipedia _articles_ are CC BY-SA 4.0, not CC0 — only the structured Wikidata namespaces are
CC0. Scraping the prose tables from
[List of dog breeds](https://en.wikipedia.org/wiki/List_of_dog_breeds) drags a share-alike obligation
along with it. Querying Wikidata does not.

**Verdict: yes.** This is the only source whose licence plainly permits a seeded table.

### npm and GitHub datasets

**`dog-breeds`** ([chrisvogt/dog-breeds](https://github.com/chrisvogt/dog-breeds), v2.1.0, published
2026-02-11, last pushed 2026-05-09, MIT). Its README says "A list of 554 dog breeds, including breed
origin and a link to an image of the breed on Wikimedia. Data is sourced from
[Wikipedia](https://en.wikipedia.org/wiki/List_of_dog_breeds) and
[Wikidata](https://www.wikidata.org/)."

I downloaded `dog-breeds.json` and confirmed it: **554 entries**, each shaped like

```json
{
  "name": "Affenpinscher",
  "origin": "Germany",
  "imageURL": "https://commons.wikimedia.org/wiki/Special:FilePath/Affenpinscher.jpg"
}
```

**There is no id field.** The name is the only key. That fails our stability requirement on its own —
if the package renames a breed, every stored value breaks. It is also worth noting the MIT licence
covers the package, while the underlying data is drawn partly from Wikipedia, which is CC BY-SA.

**`cat-breeds`** (`ncamaa/cat-breeds`, v1.2.0, published 2025-08-03, MIT per the npm manifest). The
GitHub API returns nothing for that repo — it appears to be private or removed — so I could not
inspect the data, only the package metadata.

**Verdict: useful as a starting file, not as a dependency.** Take the shape, not the runtime package.

---

## 3. Side by side

| Source                | Dogs | Cats | Size                      | Stable id  | Licence                                   | Cost                                           | Offline          |
| --------------------- | ---- | ---- | ------------------------- | ---------- | ----------------------------------------- | ---------------------------------------------- | ---------------- |
| Lyka's own API        | yes  | no   | 510 (497 active)          | integer    | none granted to us                        | n/a                                            | n/a              |
| TheDogAPI / TheCatAPI | yes  | yes  | "650+" dogs               | yes        | paid, delete-on-cancel, no redistribution | free tier 10k/mo; $99/mo Startup (cat pricing) | no, key required |
| Dog CEO               | yes  | no   | 108 / 165 with sub-breeds | slug only  | code MIT, data unstated                   | free                                           | could be bundled |
| AKC                   | yes  | no   | 200                       | no         | all rights reserved                       | n/a                                            | no API           |
| Dogs Australia (ANKC) | yes  | no   | not published as data     | no         | unstated                                  | n/a                                            | no API           |
| FCI                   | yes  | no   | 344                       | FCI number | unstated                                  | free to read                                   | scrape only      |
| Wikidata              | yes  | yes  | 1,143 / 141               | Q-id       | CC0                                       | free                                           | yes, seed once   |
| `dog-breeds` npm      | yes  | no   | 554                       | none       | MIT package, mixed data                   | free                                           | yes              |

---

## 4. Recommendation for Crumpet

**Seed a `breeds` table in Supabase Postgres from Wikidata. Do not call a breed API at runtime.**

The constraints decide this almost on their own.

**The picker must work offline.** That removes every live API. TheDogAPI and TheCatAPI both now
require a key and both return 403 without one, so neither can even be used as an unauthenticated
fallback.

**The stored value must be stable.** So the Pet row stores an id we control, not a display string.
A `breeds` table with our own surrogate primary key, plus a nullable `wikidata_qid` column for
provenance, means renaming "Labrador" to "Labrador Retriever" is a one-row update and no Pet breaks.
This is what Lyka does — integer ids, names free to change behind them.

**The licence has to allow it.** Wikidata is CC0, which requires no attribution and no permission.
The Dog API licence forbids it outright: storage only while subscribed, full deletion within 30 days
of cancelling, and no redistribution. Everything else — AKC, FCI, Dogs Australia — publishes no
licence at all, which is not the same as permission.

**The audience is Australian.** The FCI's 344 and the AKC's 200 are both pedigree registries. They
contain no Cavoodle, no Groodle, no Spoodle, no Moodle. Those are among the most common dogs in
Australia, and Lyka ships bespoke photography for exactly those breeds — they clearly know their
market. A registry list alone would be wrong here.

### Concretely

1. Query Wikidata for `wdt:P31 wd:Q39367` (1,143 dogs) and `wdt:P31 wd:Q43577` (141 cats). Keep the
   Q-ids.
2. Curate down. Drop extinct breeds and landraces. Aim for something near Lyka's 510 for dogs.
3. Hand-add the Australian crosses Wikidata is thin on, and the ANKC/Dogs Australia display names
   where they differ from the international ones. These rows simply have a null `wikidata_qid`.
4. Add "Unknown" fallbacks. Lyka has seven, split by size. Crumpet probably needs fewer, but it needs
   at least one per species — a user with a rescue mutt must be able to finish the form.
5. Write it as a Supabase migration seeding `breeds (id, species, name, wikidata_qid, is_active)`.
   Query it through a service, cache it with TanStack Query, and it is available offline after the
   first load.
6. Store `pet.breed_id` as a foreign key.

### What is deliberately not recommended

- **No runtime breed API.** It breaks offline, adds a key to manage, and buys nothing a seeded table
  does not already give us.
- **No npm breed package as a dependency.** `dog-breeds` has no ids. Lift its JSON as a starting
  point if it helps, but the list belongs in a migration, not in `package.json`.
- **No scraping the FCI or Dogs Australia.** Neither states a licence. Use them to sanity-check
  names and groups, which is reading a website, not copying a database.

### One thing to confirm before building

I could not establish where Lyka's 510 names originally came from. If it turns out they licensed a
seed list commercially, that would be worth knowing — but it does not change the recommendation,
because the CC0 route is available and free either way.
