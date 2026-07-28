#!/usr/bin/env node
/**
 * Message-catalogue checks.
 *
 * Two failures, one root cause. The app Nagi replaces shipped a fully
 * translated set of dashboard keys that nothing referenced, sitting above 700
 * lines of hardcoded text — and, separately, two keys that existed in one
 * locale only, so those strings silently fell back for everyone else.
 *
 * Neither is visible in review. Both are trivial to see mechanically:
 *
 *   1. every locale defines exactly the keys `en` defines — no more, no fewer
 *   2. every key `en` defines is referenced somewhere in the source
 *
 * `en` is the source locale and the naming authority. The registry is a list,
 * not a pair: adding a language means dropping in a file, and this check then
 * holds it to the same key set as the rest.
 */
import { globSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'

const MESSAGES = 'src/i18n/messages/*.json'
const SOURCE_LOCALE = 'en'
const SOURCES = 'src/**/*.{ts,tsx}'

/** Flattens `{ app: { title: 'x' } }` to `['app.title']`. */
function leafKeys(value, prefix = '') {
  if (typeof value !== 'object' || value === null) return [prefix]

  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix ? `${prefix}.${key}` : key),
  )
}

function loadCatalogues(pattern) {
  return globSync(pattern).map((path) => ({
    locale: basename(path, '.json'),
    path,
    keys: new Set(leafKeys(JSON.parse(readFileSync(path, 'utf8')))),
  }))
}

/**
 * Which keys the source actually asks for.
 *
 * `useTranslations('app')` binds a namespace and `t('title')` names a key
 * inside it, so neither half is a full path on its own. Both halves are
 * collected and combined. The cross-product is deliberately permissive — two
 * namespaces sharing a key name will mark both as referenced — because a false
 * "used" leaves a dead key in the catalogue, while a false "unused" would fail
 * the build over a key that is fine.
 */
function referencedKeys(pattern) {
  const namespaces = new Set()
  const keys = new Set()

  for (const path of globSync(pattern)) {
    const source = readFileSync(path, 'utf8')

    for (const [, namespace] of source.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) {
      namespaces.add(namespace)
    }
    for (const [, key] of source.matchAll(/\bt(?:\.rich)?\(\s*['"]([^'"]+)['"]/g)) {
      keys.add(key)
    }
  }

  const referenced = new Set(keys)
  for (const namespace of namespaces) {
    for (const key of keys) referenced.add(`${namespace}.${key}`)
  }
  return referenced
}

/** Globs are parameters so the tests can point the same code at a fixture tree. */
export function check({ messages = MESSAGES, sources = SOURCES } = {}) {
  const catalogues = loadCatalogues(messages)
  const source = catalogues.find((c) => c.locale === SOURCE_LOCALE)
  const problems = []

  if (!source) {
    return [
      `No ${SOURCE_LOCALE}.json in ${messages}. It is the source locale; nothing can be checked against it.`,
    ]
  }

  for (const { locale, path, keys } of catalogues) {
    if (locale === SOURCE_LOCALE) continue

    for (const key of source.keys) {
      if (!keys.has(key)) {
        problems.push(`${path}: missing "${key}" — defined in ${SOURCE_LOCALE}.json`)
      }
    }
    for (const key of keys) {
      if (!source.keys.has(key)) {
        problems.push(
          `${path}: "${key}" is not in ${SOURCE_LOCALE}.json. ` +
            `Add it there first — ${SOURCE_LOCALE} is the naming authority.`,
        )
      }
    }
  }

  const referenced = referencedKeys(sources)
  for (const key of source.keys) {
    if (!referenced.has(key)) {
      problems.push(
        `${source.path}: "${key}" is defined but never referenced. Delete it, or use it.`,
      )
    }
  }

  return problems
}

function main() {
  const problems = check()

  for (const problem of problems) console.error(problem)

  if (problems.length > 0) {
    console.error(`\n${problems.length} message-catalogue problem(s).`)
    process.exit(1)
  }

  console.log('check-messages: catalogues agree, and every key is used')
}

if (import.meta.filename === process.argv[1]) main()
