import { useState } from 'react';
import type { ClinicalService } from '../model/types';
import { searchText } from '../../clinic/model/validation';

export function useServicePickerViewModel(
  services: ClinicalService[],
  selectedId: string,
  onSelect: (id: string) => void,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const selected = services.find((s) => s.id === selectedId);
  const filtered = services.filter(
    (s) => s.active && searchText(s.name).includes(searchText(query)),
  );
  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
    setHighlight(0);
  };
  return {
    open,
    filtered,
    highlight,
    selected,
    display: open ? query : (selected?.name ?? ''),
    focus: () => {
      setOpen(true);
      setQuery('');
      setHighlight(0);
    },
    close: () => {
      setOpen(false);
      setQuery('');
    },
    search: (value: string) => {
      setQuery(value);
      setOpen(true);
      setHighlight(0);
    },
    choose,
    keyDown: (key: string): boolean => {
      if (key === 'Escape') {
        setOpen(false);
        return true;
      }
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        setOpen(true);
        setHighlight((previous) =>
          filtered.length
            ? (previous + (key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length
            : 0,
        );
        return true;
      }
      if (key === 'Enter' && open) {
        const item = filtered[highlight];
        if (item) choose(item.id);
        return true;
      }
      return false;
    },
  };
}
