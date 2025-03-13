"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { pingAction } from "@/app/server/ping";

export default function FetchForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(
    (_: unknown, payload: FormData) =>
      pingAction(JSON.stringify(Object.fromEntries(payload.entries()))),
    null,
  );

  return (
    <form ref={formRef} action={formAction}>
      <input
        className="px-3 py-1.5 rounded border mb-2 w-full bg-transparent border-white/50 placeholder:text-white/50 focus:outline-none focus:ring-[3px]"
        placeholder="IP to ping"
        name="ip"
        id="ip"
        type="text"
        required
      />

      {state && (
        <pre className="bg-gray-800 bg-opacity-50 rounded whitespace-pre-wrap p-2 my-2">
          {state}
        </pre>
      )}

      <button
        type="submit"
        className="bg-blue-500 hover:shadow-lg transition duration-200 text-white font-semibold px-4 py-2 rounded"
      >
        Submit ping request
      </button>
    </form>
  );
}
