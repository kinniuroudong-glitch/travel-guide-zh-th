import json
from urllib.parse import urlparse
import posixpath
from pathlib import Path
root = Path(__file__).resolve().parent.parent
collections = json.loads((root / 'content.json').read_text())
counts = {'jiangnan': 11, 'shanghai': 129, 'places': 31, 'library': 180}
for collection in collections:
    items = json.loads((root / collection['src']).read_text())
    assert len(items) == counts[collection['id']]
    assert len({item['id'] for item in items}) == len(items)
    assert all(item['title'] and item['body'] for item in items)
audio = json.loads((root / 'audio-map.json').read_text())
for clip in audio['files']:
    url = urlparse(clip['url'])
    assert url.scheme == 'https' and url.netloc == 'jiaxing-puyuan-thai-guide.pages.dev'
    assert posixpath.normpath(url.path).startswith('/audio/'), clip['url']
    assert clip['duration'] > 0
assert len(audio['files']) == 13
print('Passed: 351 chapter entries, unique per-collection IDs, 13 hosted audio references')
