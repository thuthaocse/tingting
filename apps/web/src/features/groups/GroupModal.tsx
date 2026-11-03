import { t as translate } from '../../app/i18n/language';
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
  if (modal === 'settings' && (!model.admin || !model.canEdit)) return null;
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
  if (modal === 'settlement' && g) {
    return (
      <SettlementForm
        g={g}
        value={settlement}
        debts={model.allDebts}
        identity={identity}
        busy={busy}
        alert={alert}
        onClose={() => setModal(null)}
        onSave={(x) => mutate('saveSettlement', x)}
      />
    );
  }
  return (
    <Modal
      key={modal}
      title={
        {
          create: translate("Tạo sổ chi tiêu mới"),
          settings: translate("Cài đặt sổ chi tiêu"),
          detail: translate("Chi tiết khoản chi"),
          settlement: settlement?.id ? translate("Chỉnh sửa thanh toán") : translate("Thanh toán"),
          'settlement-detail': translate("Chi tiết thanh toán"),
        }[modal || ''] || ''
      }
      onClose={() => setModal(null)}
      footer={
        modal === 'create' ? (
          <Button loading={busy} type="submit" form={groupFormId} disabled={busy} className={s.createGroupButton}>
            {busy ? translate("Đang lưu…") : translate("Tạo sổ chi tiêu & lấy liên kết")}
          </Button>
        ) : modal === 'settings' ? (
          <div className={s.settingsActions}>
            <Button loading={busy} type="submit" form={groupFormId} disabled={busy}>
              {busy ? translate("Đang lưu…") : translate("Lưu thay đổi")}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => {
              if (confirm(translate("Đổi liên kết sẽ vô hiệu hóa liên kết cũ. Tiếp tục?")))
                void mutate('rotateLink');
            }}>
              {translate("Đổi liên kết")}
            </Button>
          </div>
        ) : modal === 'detail' && expense && model.canEdit && (
          <div className={s.expenseActions}>
            <Button onClick={() => setModal('expense')}>{translate("Chỉnh sửa")}</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (confirm(translate("Xóa khoản chi này? Số dư sẽ được tính lại.")))
                  void mutate('deleteExpense', expense.id);
              }}
            >
              {translate("Xóa khoản chi")}
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
          formId={groupFormId}
          teams={model.teams}
          busy={busy}
          onSave={(x) => mutate('updateGroup', x)}
          onCopy={() => copy(g.token)}
        />
      )}
      {g && modal === 'detail' && expense && (
        <div className={s.detail}>
          <div>
            <h2>{expense.title}</h2>
            <p className={s.detailAmount}>{money(expense.amount)}</p>
          </div>
          <section aria-label={translate("Thông tin khoản chi")}>
            <div className={s.detailRow}>
              <span>{translate("Người trả tiền")}</span>
              <strong>{name(g, expense.payerId)}</strong>
            </div>
            <div className={s.detailRow}>
              <span>{translate("Ngày")}</span>
              <strong>{expense.date}</strong>
            </div>
            <div className={s.detailRow}>
              <span>{translate("Ghi chú")}</span>
              <strong>{expense.note || '—'}</strong>
            </div>
          </section>
          <section className={s.detailSection}>
            <h3>{translate("Chia cho")} {expense.shares.length} {translate("người")}</h3>
            {expense.shares.map((x) => (
              <div className={s.detailRow} key={x.memberId}>
                <span>{name(g, x.memberId)}</span>
                <strong>{money(x.amount)}</strong>
              </div>
            ))}
          </section>
        </div>
      )}
      {g && modal === 'settlement-detail' && settlement?.id && (
        <>
          <Badge positive>{translate("Đã ghi nhận thanh toán")}</Badge>
          <p className={s.detailAmount}>{money(settlement.amount || 0)}</p>
          <div className={s.detailRow}>
            <span>{translate("Người trả")}</span>
            <strong>{name(g, settlement.fromId!)}</strong>
          </div>
          <div className={s.detailRow}>
            <span>{translate("Người nhận")}</span>
            <strong>{name(g, settlement.toId!)}</strong>
          </div>
          <div className={s.detailRow}>
            <span>{translate("Ngày")}</span>
            <strong>{settlement.date}</strong>
          </div>
          <p>{settlement.note}</p>
          {model.canEdit && (
            <div className={s.actions}>
              <Button onClick={() => setModal('settlement')}>
                {translate("Chỉnh sửa")}
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (confirm(translate("Xóa bản ghi thanh toán này?")))
                    void mutate('deleteSettlement', settlement.id);
                }}
              >
                {translate("Xóa bản ghi")}
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
