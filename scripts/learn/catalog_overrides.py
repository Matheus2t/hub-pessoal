"""Apply versioned editorial decisions after deterministic catalog generation."""

import json
from pathlib import Path

_MANIFEST = Path(__file__).with_name('catalog-editorial-overrides.json')
_COLLECTIONS = {'words', 'phrases', 'readings', 'lessons', 'exercises'}
_IDENTITY_FIELDS = {'id', 'language'}


def apply_editorial_overrides(catalog, language):
    manifest = json.loads(_MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('format') != '2t-learn-editorial-overrides' or manifest.get('version') != 1:
        raise ValueError('Unsupported editorial override manifest.')
    if catalog.get('language') != language or language not in ('en', 'ru'):
        raise ValueError('Catalog language does not match the requested overrides.')

    language_overrides = manifest.get('languages', {}).get(language)
    if not isinstance(language_overrides, dict):
        raise ValueError(f'Missing editorial overrides for {language}.')

    for collection, patches in language_overrides.items():
        if collection not in _COLLECTIONS or not isinstance(patches, list):
            raise ValueError(f'Invalid editorial collection: {collection}.')
        items = catalog.get(collection)
        if not isinstance(items, list):
            raise ValueError(f'Generated catalog has no collection {collection}.')
        by_id = {item.get('id'): item for item in items}
        if len(by_id) != len(items):
            raise ValueError(f'Duplicate IDs in generated collection {language}/{collection}.')

        seen = set()
        for patch in patches:
            item_id = patch.get('id')
            if not isinstance(item_id, str) or item_id in seen:
                raise ValueError(f'Missing or duplicate override ID in {language}/{collection}.')
            seen.add(item_id)
            item = by_id.get(item_id)
            if item is None:
                raise ValueError(f'Editorial override target not found: {language}/{item_id}.')
            fields = patch.get('set', {})
            removals = patch.get('remove', [])
            if not isinstance(fields, dict) or not isinstance(removals, list):
                raise ValueError(f'Invalid field patch for {language}/{item_id}.')
            if _IDENTITY_FIELDS.intersection(fields) or _IDENTITY_FIELDS.intersection(removals):
                raise ValueError(f'Editorial patches cannot change identity: {language}/{item_id}.')
            if set(fields).intersection(removals) or not all(isinstance(key, str) for key in removals):
                raise ValueError(f'Conflicting field patch for {language}/{item_id}.')
            item.update(fields)
            for field in removals:
                item.pop(field, None)

    return catalog
