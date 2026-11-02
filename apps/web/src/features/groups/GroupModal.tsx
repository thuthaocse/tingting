import { Badge, Button, Modal } from '@tingting/design-system';
import { money } from '../../domain.mjs';
import { name } from '../../shared/forms';
import GroupForm from './GroupForm';
import Settings from './Settings';
import ExpenseForm from '../expenses/ExpenseForm';
import SettlementForm from '../settlements/SettlementForm';
import type { TingtingModel } from '../../app/hooks/useTingting';
import s from './GroupModal.module.css';
export default function GroupModal({ model }: { model: TingtingModel }) {
  const {
    modal,
    expense,
    settlement,
    busy,
    error,
    setModal,
    identity,
    mutate,
    copy,
    createGroup,
    g,
  } = model;
  if (!modal) return null;
  if (modal === 'create' && !model.canCreate) return null;
  if (modal === 'settings' && !model.admin) return null;
  if (['expense', 'settlement'].includes(modal) && !model.canEdit) return null;
  return (
    <Modal
      title={
        {
          create: 'Tạo nhóm mới',
          settings: 'Cài đặt nhóm',
          expense: expense ? 'Chỉnh sửa khoản chi' : 'Thêm khoản chi',
          detail: 'Chi tiết khoản chi',
          settlement: settlement?.id ? 'Chỉnh sửa thanh toán' : 'Thanh toán',
          'settlement-detail': 'Chi tiết thanh toán',
        }[modal || ''] || ''
      }
      onClose={() => setModal(null)}
    >
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {modal === 'create' && <GroupForm busy={busy} onSave={createGroup} />}
      {g && modal === 'settings' && (
        <Settings
          g={g}
          busy={busy}
          onSave={(x) => mutate('updateGroup', x)}
          onRotate={() => {
            if (confirm('Đổi liên kết sẽ vô hiệu hóa liên kết cũ. Tiếp tục?'))
              void mutate('rotateLink');
          }}
          onArchive={() => {
            if (
              confirm(g.archived ? 'Mở lại nhóm?' : 'Lưu trữ nhóm? Các khoản chi vẫn được giữ lại.')
            )
              void mutate('archiveGroup');
          }}
          onCopy={() => copy(g.token)}
        />
      )}
      {g && modal === 'expense' && (
        <ExpenseForm
          g={g}
          value={expense}
          identity={identity}
          busy={busy}
          onSave={(x) => mutate('saveExpense', x)}
        />
      )}
      {g && modal === 'detail' && expense && (
        <div className={s.detail}>
          <div>
            <h2>{expense.title}</h2>
            <p className={s.detailAmount}>{money(expense.amount)}</p>
          </div>
          <section aria-label="Thông tin khoản chi">
            <div className={s.detailRow}>
              <span>Người trả tiền</span>
              <strong>{name(g, expense.payerId)}</strong>
            </div>
            <div className={s.detailRow}>
              <span>Ngày</span>
              <strong>{expense.date}</strong>
            </div>
            <div className={s.detailRow}>
              <span>Ghi chú</span>
              <strong>{expense.note || '—'}</strong>
            </div>
          </section>
          <section className={s.detailSection}>
            <h3>Chia cho {expense.shares.length} người</h3>
            {expense.shares.map((x) => (
              <div className={s.detailRow} key={x.memberId}>
                <span>{name(g, x.memberId)}</span>
                <strong>{money(x.amount)}</strong>
              </div>
            ))}
          </section>
          {model.canEdit && (
            <div className={s.actions}>
              <Button disabled={g.archived} onClick={() => setModal('expense')}>
                Chỉnh sửa
              </Button>
              <Button
                variant="danger"
                disabled={busy || g.archived}
                onClick={() => {
                  if (confirm('Xóa khoản chi này? Số dư sẽ được tính lại.'))
                    void mutate('deleteExpense', expense.id);
                }}
              >
                Xóa khoản chi
              </Button>
            </div>
          )}
        </div>
      )}
      {g && modal === 'settlement' && (
        <SettlementForm
          g={g}
          value={settlement}
          identity={identity}
          busy={busy}
          onSave={(x) => mutate('saveSettlement', x)}
        />
      )}
      {g && modal === 'settlement-detail' && settlement?.id && (
        <>
          <Badge positive>Đã ghi nhận thanh toán</Badge>
          <p className={s.detailAmount}>{money(settlement.amount || 0)}</p>
          <div className={s.detailRow}>
            <span>Người trả</span>
            <strong>{name(g, settlement.fromId!)}</strong>
          </div>
          <div className={s.detailRow}>
            <span>Người nhận</span>
            <strong>{name(g, settlement.toId!)}</strong>
          </div>
          <div className={s.detailRow}>
            <span>Ngày</span>
            <strong>{settlement.date}</strong>
          </div>
          <p>{settlement.note}</p>
          {model.canEdit && (
            <div className={s.actions}>
              <Button disabled={g.archived} onClick={() => setModal('settlement')}>
                Chỉnh sửa
              </Button>
              <Button
                variant="danger"
                disabled={busy || g.archived}
                onClick={() => {
                  if (confirm('Xóa bản ghi thanh toán này?'))
                    void mutate('deleteSettlement', settlement.id);
                }}
              >
                Xóa bản ghi
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
