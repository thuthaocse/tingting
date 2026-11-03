import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Field,
  Input,
  Logo,
  Modal,
  Tabs,
  MoneyInput,
  SearchSelect,
} from '@tingting/design-system';
import { money } from '../../domain.mjs';
import s from './DesignPreview.module.css';
export default function DesignPreview() {
  const [amount, setAmount] = useState(1200000),
    [member, setMember] = useState('linh');
  const [tab, setTab] = useState('a'),
    [open, setOpen] = useState(false);
  return (
    <>
      <header className={s.topbar}>
        <Logo />
        <Badge>DESIGN SYSTEM · v0.1</Badge>
      </header>
      <main className={`${s.page} ${s.preview}`}>
        <div>
          <p className={s.eyebrow}>TingTing DESIGN SYSTEM</p>
          <h1>Nhẹ nhàng. Rõ ràng. Cùng nhau.</h1>
          <p className={s.muted}>React · CSS Modules · Mobile first · Tiếng Việt</p>
        </div>
        <section className={s.card}>
          <h2>Màu sắc</h2>
          <div className={s.swatches}>
            <div className={`${s.swatch} ${s.brandSwatch}`}>Brand #C4B5FD</div>
            <div className={`${s.swatch} ${s.actionSwatch}`}>Action #6941C6</div>
            <div className={`${s.swatch} ${s.positiveSwatch}`}>Được nhận</div>
          </div>
        </section>
        <section className={`${s.card} ${s.form}`}>
          <h2>Thao tác</h2>
          <div className={s.actions}>
            <Button onClick={() => setOpen(true)}>Mở hộp thoại</Button>
            <Button variant="secondary">Thứ cấp</Button>
            <Button variant="quiet">Thanh toán</Button>
            <Button variant="danger">Xóa</Button>
            <Button disabled>Đang lưu…</Button>
          </div>
        </section>
        <section className={`${s.card} ${s.form}`}>
          <h2>Biểu mẫu và thành viên</h2>
          <Field label="Tên khoản chi" help="Nhãn luôn hiển thị, không chỉ dùng placeholder.">
            <Input placeholder="Ví dụ: Ăn tối" />
          </Field>
          <Field label="Số tiền (₫)">
            <MoneyInput value={amount} onValueChange={setAmount} />
          </Field>
          <Field label="Thành viên">
            <SearchSelect
              options={[
                { id: 'linh', label: 'Linh Nguyễn' },
                { id: 'minh', label: 'Minh Trần' },
                { id: 'thao', label: 'Thảo Lê' },
              ]}
              value={member}
              onChange={setMember}
              label="Thành viên"
            />
          </Field>
          <div className={s.actions}>
            <Avatar name="Linh Nguyễn" />
            <Badge>Đã đơn giản hóa</Badge>
            <Badge positive>Đã thanh toán</Badge>
            <label>
              <input type="checkbox" defaultChecked /> Chia đều
            </label>
          </div>
        </section>
        <section className={s.card}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'a', label: 'Hoạt động' },
              { id: 'b', label: 'Khoản nợ' },
              { id: 'c', label: 'Tổng chi' },
            ]}
          />
          <div className={s.debtRow}>
            <span>Linh → Minh</span>
            <strong>{money(150000)}</strong>
            <Button variant="quiet" small onClick={() => setOpen(true)}>
              Thanh toán
            </Button>
          </div>
        </section>
        {open && (
          <Modal title="Thanh toán" onClose={() => setOpen(false)}>
            <p className={s.notice}>Hộp thoại hỗ trợ phím Escape và giữ focus bên trong.</p>
            <Button onClick={() => setOpen(false)}>Đóng</Button>
          </Modal>
        )}
      </main>
    </>
  );
}
