import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
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
    const loading = renderToString(createElement(components.LoadingIndicator));
    assert.match(loading, /role="status"/);
    assert.match(loading, /Đang tải/);
    const saving = renderToString(createElement(components.Button, { loading: true, disabled: true }, 'Đang lưu…'));
    assert.match(saving, /aria-busy="true"/);
    assert.match(saving, /aria-hidden="true"/);
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
    assert.doesNotMatch(home, /Tạo sổ chi tiêu/);
    const { default: AppHeader } = await server.ssrLoadModule('/src/app/components/AppHeader.tsx');
    const header = renderToString(
      createElement(AppHeader, { model: { viewer: { name: 'Thảo Trịnh' }, logout: () => {} } }),
    );
    assert.match(header, /Thảo Trịnh/);
    assert.match(header, /href="\/"[^>]*>Sổ chi tiêu/);
    assert.match(header, /href="\/teams"[^>]*>Hội nhóm/);
    const { default: TeamsScreen } = await server.ssrLoadModule('/src/features/teams/TeamsScreen.tsx');
    const { default: TeamForm } = await server.ssrLoadModule('/src/features/teams/TeamForm.tsx');
    const viewer = { id: 'member', name: 'An', email: 'an@example.com' };
    const team = { id: 'team', name: 'Bạn bè', version: 1, ownerEmail: 'owner@example.com', members: [viewer, { id: 'owner', name: 'Bình', email: 'owner@example.com' }] };
    const teamsScreen = renderToString(createElement(TeamsScreen, {
      model: { viewer, teams: [team], teamsError: '', teamModal: false },
    }));
    assert.match(teamsScreen, /Quản lý/);
    const memberForm = renderToString(createElement(TeamForm, { viewer, team, onSave: () => {}, onDelete: () => {}, onCancel: () => {} }));
    assert.match(memberForm, /Lưu thay đổi/);
    assert.doesNotMatch(memberForm, /Xóa hội nhóm/);
    const { default: GroupForm } = await server.ssrLoadModule('/src/features/groups/GroupForm.tsx');
    const createGroupForm = renderToString(createElement(GroupForm, {
      viewer, teams: [team], busy: false, onSave: () => {},
    }));
    assert.match(createGroupForm, /Tìm hội nhóm hoặc thành viên/);
    assert.match(createGroupForm, /Bạn bè/);
    assert.match(createGroupForm, /Bình/);
    assert.doesNotMatch(header, /href="\/admin\/access"/);
    const adminHeader = renderToString(
      createElement(AppHeader, { model: { viewer: { name: 'Thảo Trịnh' }, admin: true, path: '/admin/access', logout: () => {} } }),
    );
    assert.match(adminHeader, /href="\/admin\/access" aria-current="page">Tài khoản/);
    assert.match(header, /aria-label="Menu"/);
    assert.match(header, /aria-label="Chuyển sang giao diện tối"/);
    assert.match(header, /Giao diện tối/);
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
    assert.match(signedInGroup, /<img[^>]+alt=""/);
    assert.match(signedInGroup, /Chưa có khoản chi nào[\s\S]*>Thêm khoản chi<\/button>/);
    assert.match(signedInGroup, /Chia sẻ sổ/);
    const adminGroup = renderToString(
      createElement(GroupScreen, { g: group, model: { ...groupModel, admin: true } }),
    );
    assert.match(adminGroup, /Cài đặt sổ/);
    assert.match(adminGroup, /Chia sẻ sổ/);
    assert.match(adminGroup, /Cài đặt[\s\S]*>Thanh toán<\/button>/);
    const emptyDebts = renderToString(
      createElement(GroupScreen, { g: group, model: { ...groupModel, tab: 'balances' } }),
    );
    assert.match(emptyDebts, /Không có khoản nợ/);
    assert.doesNotMatch(emptyDebts, /Cả nhóm đã thanh toán hết/);
    const settledDebts = renderToString(
      createElement(GroupScreen, {
        g: { ...group, expenses: [{ id: 'e' }] },
        model: { ...groupModel, tab: 'balances' },
      }),
    );
    assert.match(settledDebts, /Cả nhóm đã thanh toán hết/);
    assert.doesNotMatch(signedInGroup, /♧/);
    const guestGroup = renderToString(
      createElement(GroupScreen, {
        g: group,
        model: { ...groupModel, viewer: null, identity: 'a', canEdit: false },
      }),
    );
    assert.match(guestGroup, /Bạn là ai/);
    assert.doesNotMatch(guestGroup, />Thanh toán<\/button>/);
    assert.doesNotMatch(guestGroup, /Chia sẻ sổ|Cài đặt sổ/);
    const outsiderGroup = renderToString(createElement(GroupScreen, {
      g: group,
      model: { ...groupModel, admin: true, canEdit: false, tab: 'balances', allDebts: [debt] },
    }));
    assert.match(outsiderGroup, /CHỈ XEM/);
    assert.match(outsiderGroup, /Bạn là ai/);
    assert.doesNotMatch(outsiderGroup, /Chia sẻ sổ|Cài đặt sổ|>Thanh toán<\/button>|Thêm khoản chi/);
    const { default: Activity } = await server.ssrLoadModule('/src/features/activity/Activity.tsx');
    const settlementOnly = renderToString(createElement(Activity, {
      g: { ...group, settlements: [{ id: 's', date: '2026-11-02', fromId: 'a', toId: 'b', amount: 1000 }] },
      identity: '', addExpense: () => {}, openExpense: () => {}, openSettlement: () => {},
    }));
    assert.match(settlementOnly, /Chưa có khoản chi nào[\s\S]*>Thêm khoản chi<\/button>/);
    assert.match(settlementOnly, /An đã trả Bình/);
    assert.match(settlementOnly, /02\/11\/2026/);
    assert.doesNotMatch(settlementOnly, /ngày 2 tháng 11/);
    assert.doesNotMatch(guestGroup, />Thêm khoản chi<\/button>/);
    const payment = renderToString(createElement(GroupModal, {
      model: {
        g: group, modal: 'settlement', canEdit: true, busy: false, identity: 'a', allDebts: [debt],
        settlement: { fromId: 'a', toId: 'b', amount: 1000 }, setModal: () => {},
      },
    }));
    const paymentFormId = payment.match(/<form id="([^"]+)"/)[1];
    assert.match(payment, new RegExp(`form="${paymentFormId}"`));
    assert.match(payment, /Chỉ ghi nhận khoản trả[\s\S]*Thanh toán<\/button>/);
    assert.match(payment, /Toàn bộ nợ/);
    const settings = renderToString(createElement(GroupModal, {
      model: { g: group, modal: 'settings', admin: true, canEdit: true, teams: [], busy: false, setModal: () => {} },
    }));
    const formId = settings.match(/<form id="([^"]+)"/)[1];
    assert.ok(settings.includes(`form="${formId}"`));
    assert.match(settings, /Lưu thay đổi[\s\S]*Đổi liên kết/);
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
    assert.match(creatorHome, /Tạo sổ chi tiêu/);
    assert.doesNotMatch(creatorHome, /Quản lý quyền/);
    const { default: Preview } = await server.ssrLoadModule(
      '/src/features/design-preview/DesignPreview.tsx',
    );
    assert.match(renderToString(createElement(Preview)), /DESIGN SYSTEM/);
  } finally {
    await server.close();
  }
});


test('installed app metadata points to TingTing icons and opens the home page', async () => {
  const html = await readFile(`${root}/index.html`, 'utf8');
  const manifest = JSON.parse(await readFile(`${root}/public/manifest.webmanifest`, 'utf8'));
  assert.match(html, /<title>TingTing<\/title>/);
  assert.match(html, /apple-touch-icon\.png/);
  assert.equal(manifest.name, 'TingTing');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.background_color, '#c4b5fd');
  for (const icon of manifest.icons) {
    const png = await readFile(`${root}/public${icon.src.split('?')[0]}`);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
  }
});
