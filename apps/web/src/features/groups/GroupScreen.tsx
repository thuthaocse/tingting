import { Badge, Button, Tabs, GroupIcon, SettingsIcon, ShareIcon, PlusIcon } from '@tingting/design-system';
import { money } from '../../domain.mjs';
import { MemberSelect, name } from '../../shared/forms';
import type { Group } from '../../types';
import EmptyState from '../../shared/empty-state/EmptyState';
import Activity from '../activity/Activity';
import ActivityLog from '../activity/ActivityLog';
import PersonalBalances from '../balances/PersonalBalances';
import Totals from '../totals/Totals';
const tabs = [
  { id: 'activity', label: 'Khoản chi' },
  { id: 'balances', label: 'Khoản nợ' },
  { id: 'totals', label: 'Tổng chi' },
  { id: 'log', label: 'Hoạt động' },
];
import type { TingtingModel } from '../../app/hooks/useTingting';
import s from './GroupScreen.module.css';
export default function GroupScreen({ model, g }: { model: TingtingModel; g: Group }) {
  const {
    error,
    identity,
    choose,
    out,
    incoming,
    pay,
    tab,
    setTab,
    setExpense,
    setModal,
    setSettlement,
    simplified,
    setSimplified,
    allDebts,
  } = model;
  return (
    <main className={`${s.page} ${model.canEdit ? s.withComposer : ''}`}>
      <div className={s.heading}>
        <div className={s.groupHeading}>
          <div className={s.groupIcon}>
            <GroupIcon />
          </div>
          <div>
            <h1>{g.name}</h1>
            <p className={s.muted}>
              {g.members.length} thành viên · VND
            </p>
          </div>
        </div>
        <Badge>{model.viewer ? 'SỔ CHI TIÊU' : 'CHỈ XEM'}</Badge>
      </div>
      <div className={s.groupActions}>
        <Button variant="secondary" small onClick={() => void model.copy(g.token)}>
          <ShareIcon /> Chia sẻ sổ
        </Button>
        {model.admin && (
          <Button
            variant="secondary"
            small
            aria-label="Cài đặt sổ"
            onClick={() => setModal('settings')}
          >
            <SettingsIcon /> Cài đặt
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {!model.viewer && (
        <>
          <p className={s.loginNotice}>
            Đăng nhập để chỉnh sửa, tạo sổ chi tiêu và quản lý chi tiêu của bạn.
          </p>
          <div className={s.identity}>
            <span className={s.muted}>Bạn là ai?</span>
            <MemberSelect g={g} value={identity} onChange={choose} label="Bạn là ai?" />
          </div>
        </>
      )}
      {identity && (
        <PersonalBalances
          group={g}
          outgoing={out}
          incoming={incoming}
          onRecord={pay}
          readOnly={!model.canEdit}
        />
      )}
      <section className={s.content}>
        <div className={`${s.contentInner} ${tab === 'balances' || tab === 'totals' ? s.contentInnerBottomSpace : ''}`}>
          <div className={s.stickyTabs}>
            <Tabs value={tab} onChange={setTab} items={tabs} />
          </div>
          <div className={s.tabPanel}>
            {tab === 'activity' ? (
              <Activity
                g={g}
                identity={identity}
                addExpense={model.canEdit ? () => { setExpense(undefined); setModal('expense'); } : undefined}
                openExpense={(e) => {
                  setExpense(e);
                  setModal('detail');
                }}
                openSettlement={(x) => {
                  setSettlement(x);
                  setModal('settlement-detail');
                }}
              />
            ) : tab === 'log' ? (
              <ActivityLog events={model.activityEvents} />
            ) : tab === 'balances' ? (
              <>
                <div className={s.contentHeader}>
                  <h2>Ai cần trả cho ai</h2>
                  <label className={s.switch}>
                    <input
                      type="checkbox"
                      checked={simplified}
                      onChange={(e) => setSimplified(e.target.checked)}
                    />
                    Đơn giản hóa nợ
                  </label>
                </div>
                <p className={s.muted}>Giữ nguyên số dư, giảm số lần chuyển tiền.</p>
                {allDebts.map((d) => (
                  <div
                    key={d.fromId + d.toId}
                    className={`${s.debtRow} ${!model.canEdit ? s.readOnlyDebt : ''}`}
                  >
                    <div className={s.debtNames}>
                      <span title={name(g, d.fromId)}>{name(g, d.fromId)}</span>
                      <i>→</i>
                      <span title={name(g, d.toId)}>{name(g, d.toId)}</span>
                    </div>
                    <strong>{money(d.amount)}</strong>
                    {model.canEdit && (
                      <Button variant="quiet" small onClick={() => pay(d)}>
                        Thanh toán
                      </Button>
                    )}
                  </div>
                ))}
                {!allDebts.length && <EmptyState compact><p>🎉 Cả nhóm đã thanh toán hết.</p></EmptyState>}
                <div className={s.total}>
                  <span className={s.muted}>Còn cần thanh toán</span>
                  <strong>{money(allDebts.reduce((v, d) => v + d.amount, 0))}</strong>
                </div>
              </>
            ) : (
              <Totals g={g} />
            )}
          </div>
        </div>
      </section>
      {model.canEdit && (
        <button
          className={s.fab}
          aria-label="Thêm khoản chi"
          onClick={() => {
            setExpense(undefined);
            setModal('expense');
          }}
        >
          <PlusIcon />
        </button>
      )}
    </main>
  );
}
