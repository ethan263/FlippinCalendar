"use client";

import { useEffect, useRef } from "react";

type PayfastCheckoutFormProps = {
  actionUrl: string;
  fields: Record<string, string>;
  /** Only submit after the user confirms checkout in-app. */
  submitOnMount?: boolean;
};

export function PayfastCheckoutForm({
  actionUrl,
  fields,
  submitOnMount = false,
}: PayfastCheckoutFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!submitOnMount) return;
    formRef.current?.submit();
  }, [actionUrl, fields, submitOnMount]);

  return (
    <form ref={formRef} method="POST" action={actionUrl} className="hidden">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </form>
  );
}
