import { useId } from 'react';
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
  const groupFormId = useId();
  if (!modal) return null;
  if (modal === 'create' && !model.canCreate) return null;
  if (modal === 'settings' && !model.admin) return null;
  if (['expense', 'settlement'].includes(modal) && !model.canEdit) return null;
  const alert = error && (
    <p className={s.error} role="alert">
      {error}
    </p>
  );
  if (modal === 'expense' && g) {
    return (
      <ExpenseForm
        g={g}
        value={expense}
        identity={identity}
        busy={busy}
        alert={alert}
        onClose={() => setModal(null)}
        onSave={(input) => mutate('saveExpense', input)}
      />
    );
  }
  return (
    <Modal
      key={modal}
      title={
        {
          create: 'Tạo nhóm mới',
          settings: 'Cài đặt nhóm',
          detail: 'Chi tiết khoản chi',
          settlement: settlement?.id ? 'Chỉnh sửa thanh toán' : 'Thanh toán',
          'settlement-detail': 'Chi tiết thanh toán',
        }[modal || ''] || ''
      }
      onClose={() => setModal(null)}
      footer={
        modal === 'create' ? (
          <Button type="submit" form={groupFormId} disabled={busy} className={s.createGroupButton}>
            {busy ? 'Đang lưu…' : 'Tạo nhóm & lấy liên kết'}
          </Button>
        ) : modal === 'detail' && expense && model.canEdit && (
          <div className={s.expenseActions}>
            <Button onClick={() => setModal('expense')}>Chỉnh sửa</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (confirm('Xóa khoản chi này? Số dư sẽ được tính lại.'))
                  void mutate('deleteExpense', expense.id);
              }}
            >
              Xóa khoản chi
            </Button>
          </div>
        )
      }
    >
      {alert}
      {modal === 'create' && (
        <GroupForm
          formId={groupFormId}
          viewer={model.viewer!}
          teams={model.teams}
          busy={busy}
          onSave={createGroup}
        />
      )}
      {g && modal === 'settings' && (
        <Settings
          g={g}
          teams={model.teams}
          busy={busy}
          onSave={(x) => mutate('updateGroup', x)}
          onRotate={() => {
            if (confirm('Đổi liên kết sẽ vô hiệu hóa liên kết cũ. Tiếp tục?'))
              void mutate('rotateLink');
          }}
          onCopy={() => copy(g.token)}
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
              <Button onClick={() => setModal('settlement')}>
                Chỉnh sửa
              </Button>
              <Button
                variant="danger"
                disabled={busy}
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
