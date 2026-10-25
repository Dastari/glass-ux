import { createContext } from "react";

/** Internal adapter contract consumed by the existing bound fields. */
export interface FieldBinding<T> {
  name: string;
  state: {
    value: T;
    meta: {
      errors: readonly unknown[];
      isDirty: boolean;
      isTouched: boolean;
      isBlurred: boolean;
    };
  };
  handleChange: (value: T) => void;
  handleBlur: () => void;
}

/** Internal adapter binding; the core has no dependency on an optional form runtime. */
export const FieldBindingContext = createContext<FieldBinding<unknown> | null>(
  null,
);
