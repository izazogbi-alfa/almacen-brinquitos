import { Suspense } from "react";
import LoginPage from "./page-client";

export default function Login() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
