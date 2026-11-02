import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../apps/web', import.meta.url));

test('Vite renders shared design-system components and initial screens without a global React', async () => {
  const server = await createServer({
    root,
    configFile: `${root}/vite.config.ts`,
    server: { middlewareMode: true, hmr: false, watch: null },
    logLevel: 'silent',
  });
  try {
    const components = await server.ssrLoadModule('../../packages/design-system/src/index.tsx');
    assert.match(renderToString(createElement(components.Logo)), /TingTing/);
    assert.match(renderToString(createElement(components.Button, {}, 'Ghi nhận')), /Ghi nhận/);
    const { default: LoginScreen } = await server.ssrLoadModule(
      '/src/features/admin/LoginScreen.tsx',
    );
    const html = renderToString(
      createElement(LoginScreen, { model: { error: '', busy: false, login: () => {} } }),
    );
    assert.match(html, /Nhẹ tiền, nhẹ lòng/);
    assert.match(html, /Đăng nhập bằng Google/);
    assert.match(html, /TingTing — Trang chủ/);
    assert.doesNotMatch(html, /<header/);
    const group = {
      id: 'g',
      name: 'Đà Lạt',
      token: 'short-link',
      version: 1,
      archived: false,
      description: '',
      viewerMemberId: null,
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      expenses: [],
      settlements: [],
      directDebts: [],
      simplifiedDebts: [],
    };
    const debt = { fromId: 'a', toId: 'b', amount: 20000 };
    const { default: PersonalBalances } = await server.ssrLoadModule(
      '/src/features/balances/PersonalBalances.tsx',
    );
    const readonly = renderToString(
      createElement(PersonalBalances, {
        group,
        outgoing: [debt],
        incoming: [],
        readOnly: true,
        onRecord: () => {},
      }),
    );
    assert.match(readonly, /Bạn cần trả/);
    assert.doesNotMatch(readonly, /Ghi nhận/);
    const { default: GroupModal } = await server.ssrLoadModule(
      '/src/features/groups/GroupModal.tsx',
    );
    const detail = renderToString(
      createElement(GroupModal, {
        model: {
          g: group,
          modal: 'detail',
          canEdit: false,
          expense: {
            title: 'Ăn sáng',
            amount: 20000,
            payerId: 'a',
            date: '2026-11-02',
            note: '',
            shares: [],
          },
          setModal: () => {},
        },
      }),
    );
    assert.match(detail, /Chi tiết khoản chi/);
    assert.doesNotMatch(detail, /Chỉnh sửa|Xóa khoản chi/);
    const { default: Dashboard } = await server.ssrLoadModule(
      '/src/features/admin/DashboardScreen.tsx',
    );
    const home = renderToString(
      createElement(Dashboard, {
        model: {
          groups: [group],
          dashboard: {
            payable: 20000,
            receivable: 0,
            outgoing: [
              {
                groupId: 'g',
                groupName: 'Đà Lạt',
                token: 'short-link',
                personId: 'b',
                personName: 'Bình',
                amount: 20000,
              },
            ],
            incoming: [],
            groups: [{ groupId: 'g', memberId: 'a', payable: 20000, receivable: 0 }],
          },
          search: '',
          admin: false,
          viewer: { name: 'An', email: 'an@example.com' },
          setSearch: () => {},
        },
      }),
    );
    assert.match(home, /Bạn cần trả/);
    assert.match(home, /Bạn được nhận/);
    assert.match(home, /Bình/);
    assert.doesNotMatch(home, /Tạo nhóm/);
    const { default: AppHeader } = await server.ssrLoadModule('/src/app/components/AppHeader.tsx');
    const header = renderToString(
      createElement(AppHeader, { model: { viewer: { name: 'Thảo Trịnh' }, logout: () => {} } }),
    );
    assert.match(header, /Thảo Trịnh/);
    assert.match(header, /Menu tài khoản/);
    assert.match(header, /aria-label="Đăng xuất"/);
    assert.match(header, /<span[^>]*>Đăng xuất<\/span>/);
    assert.doesNotMatch(header, /Chia sẻ|Cài đặt nhóm/);
    assert.match(header, /aria-hidden="true"/);
    const { default: GroupScreen } = await server.ssrLoadModule(
      '/src/features/groups/GroupScreen.tsx',
    );
    const groupModel = {
      viewer: { name: 'Thảo Trịnh' },
      identity: '',
      out: [],
      incoming: [],
      allDebts: [],
      tab: 'activity',
      canEdit: true,
    };
    const signedInGroup = renderToString(
      createElement(GroupScreen, { g: group, model: groupModel }),
    );
    assert.doesNotMatch(signedInGroup, /Bạn là ai|Chọn tên|Bạn đã thanh toán hết/);
    assert.match(signedInGroup, /Chia sẻ nhóm/);
    const adminGroup = renderToString(
      createElement(GroupScreen, { g: group, model: { ...groupModel, admin: true } }),
    );
    assert.match(adminGroup, /Cài đặt nhóm/);
    assert.match(adminGroup, /Chia sẻ nhóm/);
    assert.doesNotMatch(signedInGroup, /♧/);
    const guestGroup = renderToString(
      createElement(GroupScreen, {
        g: group,
        model: { ...groupModel, viewer: null, identity: 'a', canEdit: false },
      }),
    );
    assert.match(guestGroup, /Bạn là ai/);
    assert.doesNotMatch(home, /Chưa gắn email/);
    const creatorHome = renderToString(
      createElement(Dashboard, {
        model: {
          groups: [],
          search: '',
          admin: false,
          canCreate: true,
          viewer: { name: 'Creator', email: 'creator@example.com' },
          setSearch: () => {},
        },
      }),
    );
    assert.match(creatorHome, /Tạo nhóm/);
    assert.doesNotMatch(creatorHome, /Quản lý quyền/);
    const { default: Preview } = await server.ssrLoadModule(
      '/src/features/design-preview/DesignPreview.tsx',
    );
    assert.match(renderToString(createElement(Preview)), /DESIGN SYSTEM/);
  } finally {
    await server.close();
  }
});
