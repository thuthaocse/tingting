import { Button, ChevronDownIcon, Input, Modal, SearchSelect, searchKey } from '@tingting/design-system';
import { createPortal } from 'react-dom';
import { useIsMobileViewport, useMemberPicker } from './hooks/useMemberPicker';
import s from './MemberPicker.module.css';

type MemberPickerProps = {
  options: { id: string; label: string }[];
  value: string;
  label: string;
  onChange: (id: string) => void;
};

export default function MemberPicker(props: MemberPickerProps) {
  const isMobile = useIsMobileViewport();
  return isMobile ? (
    <MemberDrawer {...props} />
  ) : (
    <SearchSelect {...props} placeholder="Chọn thành viên" searchPlaceholder="Tìm theo tên…" />
  );
}

function MemberDrawer({ options, value, label, onChange }: MemberPickerProps) {
  const picker = useMemberPicker();
  const selected = options.find((option) => option.id === value);
  const query = searchKey(picker.search);
  const visibleOptions = options.filter((option) => searchKey(option.label).includes(query));
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        className={s.trigger}
        aria-label={selected ? `${label}: ${selected.label}` : label}
        aria-haspopup="dialog"
        aria-expanded={picker.isOpen}
        onClick={picker.open}
      >
        <span>{selected?.label || 'Chọn thành viên'}</span>
        <ChevronDownIcon />
      </Button>
      {picker.isOpen && createPortal(
        <Modal title={label} onClose={picker.close} style={picker.viewport}>
          <Input
            type="search"
            aria-label="Tìm theo tên"
            placeholder="Tìm theo tên…"
            value={picker.search}
            onChange={(event) => picker.setSearch(event.target.value)}
          />
          <ul className={s.options}>
            {visibleOptions.map((option) => (
              <li key={option.id}>
                <Button
                  type="button"
                  variant="quiet"
                  className={s.option}
                  aria-pressed={option.id === value}
                  onClick={() => {
                    onChange(option.id);
                    picker.close();
                  }}
                >
                  <span>{option.label}</span>
                  {option.id === value && <span aria-hidden="true">✓</span>}
                </Button>
              </li>
            ))}
          </ul>
          {!visibleOptions.length && <p role="status">Không tìm thấy thành viên.</p>}
        </Modal>,
        document.body,
      )}
    </div>
  );
}
