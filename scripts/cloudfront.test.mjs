import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const domain = 'tingting.thaotrinh.site';

test('CloudFront redirects preserve paths and already encoded repeated query values', () => {
  const redirect = handler(domain)({
    request: {
      headers: { host: { value: 'd3qvvq9jlekz0d.cloudfront.net' } },
      uri: '/g/shared-link',
      querystring: {
        tag: { multiValue: [{ value: 'a%20b' }, { value: 'x%26y' }] },
        'return%20to': { value: '%2Fg%2Fshared-link' },
      },
    },
  });
  const target = new URL(redirect.headers.location.value);
  assert.equal(redirect.statusCode, 302);
  assert.equal(target.origin, `https://${domain}`);
  assert.equal(target.pathname, '/g/shared-link');
  assert.deepEqual(target.searchParams.getAll('tag'), ['a b', 'x&y']);
  assert.equal(target.searchParams.get('return to'), '/g/shared-link');
});

test('CloudFront serves SPA routes on the canonical host without a redirect loop', () => {
  for (const canonical of [null, domain]) {
    for (const uri of ['/', '/g/shared-link', '/admin/access', '/design-system']) {
      const response = handler(canonical)({
        request: { headers: { host: { value: domain } }, uri, querystring: {} },
      });
      assert.equal(response.uri, '/index.html');
      assert.equal(response.statusCode, undefined);
    }
  }
});

function handler(canonical) {
  const template = readFileSync(
    new URL('../infra/terraform/cloudfront-spa.js.tftpl', import.meta.url),
    'utf8',
  );
  return vm.runInNewContext(
    template.replace('${canonical_domain}', JSON.stringify(canonical)) + ';handler',
  );
}
