import { Button, Input } from '@tingting/design-system';
import type { TingtingModel } from '../../app/hooks/useTingting';
import { money } from '../../domain.mjs';
import EmptyState from '../../shared/empty-state/EmptyState';
import AccountSummary from './AccountSummary';
import s from './DashboardScreen.module.css';
export default function DashboardScreen({ model }: { model: TingtingModel }) {
  const { error, groups, dashboard, search, setSearch, setModal, viewer } = model;
  const filtered = groups.filter((x) =>
    x.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );
  return (
    <main className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>CHÀO {viewer?.name}</p>
          <h1>Sổ chi tiêu</h1>
        </div>
        {model.canCreate && <Button onClick={() => setModal('create')}>+ Tạo sổ chi tiêu</Button>}
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {dashboard && (
        <section className={s.account} aria-label="Tổng khoản nợ của bạn">
          <AccountSummary
            label="Bạn cần trả"
            total={dashboard.payable}
            items={dashboard.outgoing}
          />
          <AccountSummary
            label="Bạn được nhận"
            total={dashboard.receivable}
            items={dashboard.incoming}
            receive
          />
        </section>
      )}
      <p className={s.muted}>Tổng từ các sổ bạn tham gia · Theo email {viewer?.email}</p>
      <Input
        aria-label="Tìm sổ"
        placeholder="Tìm kiếm sổ…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={s.groupCards}>
        {filtered.map((group) => {
          const summary = dashboard?.groups.find((x) => x.groupId === group.id);
          const owedBy = dashboard?.incoming.filter((x) => x.groupId === group.id) || [];
          return (
            <article className={s.card} key={group.id}>
              <a className={s.groupLink} href={'/g/' + group.token}>
                <h2 title={group.name}>{group.name}</h2>
                <span aria-hidden="true">↗</span>
              </a>
              <p className={s.muted}>
                {group.members.length} thành viên
              </p>
              {summary?.memberId && (
                <>
                  {(summary.payable > 0 || summary.receivable > 0) && (
                    <div className={s.groupAmounts}>
                      {summary.payable > 0 && (
                        <span>
                          Cần trả <b>{money(summary.payable)}</b>
                        </span>
                      )}
                      {summary.receivable > 0 && (
                        <span>
                          Được nhận <b>{money(summary.receivable)}</b>
                        </span>
                      )}
                    </div>
                  )}
                  {owedBy.length > 0 && (
                    <details className={s.owedBy}>
                      <summary>
                        {owedBy
                          .slice(0, 2)
                          .map((x) => x.personName)
                          .join(', ')}
                        {owedBy.length > 2 ? ` và ${owedBy.length - 2} người` : ''} nợ bạn
                      </summary>
                      {owedBy.map((x) => (
                        <div className={s.personDebt} key={x.personId}>
                          <span>{x.personName}</span>
                          <b>{money(x.amount)}</b>
                        </div>
                      ))}
                    </details>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <EmptyState>
          <p>{groups.length ? 'Không tìm thấy sổ phù hợp.' : 'Chưa có sổ nào.'}</p>
        </EmptyState>
      )}
    </main>
  );
}
