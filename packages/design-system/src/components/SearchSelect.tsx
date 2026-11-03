import { useSearchSelect, type SelectOption } from '../hooks/useSearchSelect';
import { ChevronDownIcon } from './Icons';
import s from './SearchSelect.module.css';
export function SearchSelect({
  options,
  value,
  onChange,
  label = 'Chọn một mục',
  placeholder = 'Chọn một mục',
  searchPlaceholder = 'Tìm kiếm…',
  className = '',
}: {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const select = useSearchSelect(options, value, onChange);
  return (
    <div ref={select.root} className={`${s.root} ${className}`}>
      <div className={s.control} data-open={select.open}>
        <input
          ref={select.input}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={select.open}
          aria-controls={select.open ? select.listId : undefined}
          aria-activedescendant={
            select.open && select.filtered[select.active]
              ? `${select.listId}-${select.active}`
              : undefined
          }
          autoComplete="off"
          value={select.open ? select.query : select.selected?.label || ''}
          placeholder={select.open ? searchPlaceholder : placeholder}
          onFocus={select.show}
          onClick={() => {
            if (!select.open) select.show();
          }}
          onChange={(event) => {
            select.setQuery(event.target.value);
            select.setActive(0);
          }}
          onKeyDown={select.keyDown}
        />
        <span className={s.chevron}>
          <ChevronDownIcon />
        </span>
      </div>
      {select.open && (
        <div ref={select.popup} popover="manual" className={s.popup} style={select.position}>
          <div id={select.listId} role="listbox" aria-label={label}>
            {select.filtered.map((option, index) => (
              <div
                key={option.id}
                id={`${select.listId}-${index}`}
                role="option"
                aria-selected={option.id === value}
                data-active={index === select.active}
                className={s.option}
                onPointerMove={() => select.setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  select.choose(option.id);
                }}
              >
                <span>{option.label}</span>
                {option.id === value && (
                  <span aria-hidden="true" className={s.check}>
                    ✓
                  </span>
                )}
              </div>
            ))}
            {!select.filtered.length && <p className={s.empty}>Không tìm thấy thành viên</p>}
          </div>
        </div>
      )}
    </div>
  );
}
