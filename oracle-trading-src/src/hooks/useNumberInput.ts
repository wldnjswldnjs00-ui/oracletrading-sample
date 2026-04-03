import { useRef, useState, useCallback } from 'react';

export function useNumberInput(initial: number) {
  const [value, setValue] = useState<number>(initial);
  const ref = useRef<HTMLInputElement>(null);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setValue(v);
    else if (e.target.value === '' || e.target.value === '-') setValue(0);
  }, []);

  const onInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const v = parseFloat(target.value);
    if (!isNaN(v)) setValue(v);
  }, []);

  return { ref, value, onChange, onInput, setValue };
}
