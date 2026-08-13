import { useEffect, useState } from "react";

const STORAGE_KEY = "financier-hide-savings-in-total";

export function useHideSavingsInTotal(): [boolean, (value: boolean) => void] {
  const [hideSavings, setHideSavings] = useState(() => (
    window.localStorage.getItem(STORAGE_KEY) === "true"
  ));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(hideSavings));
  }, [hideSavings]);

  return [hideSavings, setHideSavings];
}

export function BalanceScopeToggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="balance-scope-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" />
      Без накопительных
    </label>
  );
}
