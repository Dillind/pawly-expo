/**
 * Rebuilds `data/breeds.json` from Wikidata.
 *
 * Run with `bun run scripts/build-breeds.ts`. Not part of the build — the JSON
 * is checked in, and this exists so a refresh is a re-run rather than a
 * thousand names matched by hand.
 *
 * Wikidata is CC0, so copying it is permitted. TheDogAPI forbids exactly this,
 * and AKC, FCI and Dogs Australia publish no licence at all, which is not
 * permission. See docs/research/breed-data-sources.md.
 */

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

type Species = 'dog' | 'cat';

type Breed = {
  id: string;
  species: Species;
  name: string;
  // Settles two Q-ids sharing one English label. Stripped from the shipped
  // JSON, which the app bundles; kept in `data/breeds.wikidata.json`.
  wikidataQid: string | null;
};

const SPECIES_QID: Record<Species, string> = { dog: 'Q39367', cat: 'Q43577' };

// Not breeds: an extinct animal, a disambiguation page, a list article, a
// duplicated page. Wikidata marks all four, so this is a filter and not a
// judgement about which breeds are worth having.
const NOT_A_BREED = ['Q77870393', 'Q4167410', 'Q13406463', 'Q17362920'];

// Wikidata is thin on the Australian crosses, and they are among the most
// common dogs here. No Q-id, so a refresh leaves them alone.
const HAND_ADDED: Record<Species, string[]> = {
  dog: ['Cavoodle', 'Groodle', 'Spoodle', 'Moodle'],
  cat: []
};

const query = (species: Species) => `
SELECT ?item ?itemLabel WHERE {
  ?item wdt:P31 wd:${SPECIES_QID[species]} .
${NOT_A_BREED.map((qid) => `  FILTER NOT EXISTS { ?item wdt:P31 wd:${qid} }`).join('\n')}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}`;

/**
 * A surrogate id, so renaming "Labrador" to "Labrador Retriever" is a one-row
 * change and no Pet breaks. Derived rather than random, so re-running this
 * script produces the same file.
 */
const idFor = (species: Species, key: string): string => {
  const hex = createHash('sha1').update(`crumpet:breed:${species}:${key}`).digest('hex');
  const version = `4${hex.slice(13, 16)}`;
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);

  return [hex.slice(0, 8), hex.slice(8, 12), version, variant, hex.slice(20, 32)].join('-');
};

const isUnnamed = (label: string) => /^Q\d+$/.test(label);

async function fetchSpecies(species: Species): Promise<Breed[]> {
  const url = new URL('https://query.wikidata.org/sparql');
  url.searchParams.set('query', query(species));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'crumpet-breed-seed/1.0 (github.com/Dillind/pawly-expo)'
    }
  });

  if (!response.ok) throw new Error(`Wikidata returned ${response.status}`);

  const body = (await response.json()) as {
    results: { bindings: { item: { value: string }; itemLabel: { value: string } }[] };
  };

  const breeds: Breed[] = [];
  let unnamed = 0;
  let duplicates = 0;

  for (const row of body.results.bindings) {
    const name = row.itemLabel.value;

    // An item with no English or multilingual label has no name to show. It
    // cannot go in a picker, so it is dropped and counted.
    if (isUnnamed(name)) {
      unnamed += 1;
      continue;
    }

    const qid = row.item.value.split('/').pop() as string;

    // Two Q-ids sometimes carry the same English label. One name is one row in
    // a picker, so the lower Q-id wins and the other is dropped.
    const existing = breeds.find((breed) => breed.name === name);

    if (existing) {
      if (Number(qid.slice(1)) < Number(existing.wikidataQid?.slice(1) ?? Infinity)) {
        existing.id = idFor(species, qid);
        existing.wikidataQid = qid;
      }
      duplicates += 1;
      continue;
    }

    breeds.push({ id: idFor(species, qid), species, name, wikidataQid: qid });
  }

  console.log(
    `${species}: ${body.results.bindings.length} from Wikidata, ${unnamed} unnamed, ${duplicates} duplicate names`
  );

  for (const name of HAND_ADDED[species]) {
    breeds.push({ id: idFor(species, `hand:${name}`), species, name, wikidataQid: null });
  }

  breeds.push({
    id: idFor(species, 'hand:Unknown'),
    species,
    name: 'Unknown',
    wikidataQid: null
  });

  return breeds.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

const dogs = await fetchSpecies('dog');
const cats = await fetchSpecies('cat');
const breeds = [...dogs, ...cats];

// Stripped here, not earlier: the duplicate-label rule above needs the Q-id.
const shipped = breeds.map(({ id, species, name }) => ({ id, species, name }));
const qidById = Object.fromEntries(breeds.map((breed) => [breed.id, breed.wikidataQid]));

writeFileSync('data/breeds.json', `${JSON.stringify(shipped, null, 2)}\n`);
writeFileSync('data/breeds.wikidata.json', `${JSON.stringify(qidById, null, 2)}\n`);

console.log(`wrote ${breeds.length} breeds to data/breeds.json`);
