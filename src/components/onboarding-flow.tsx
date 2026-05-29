"use client";
import React, { useState, useEffect } from "react";
import { isAuthenticated, getServerUrl, checkServerHealth, setServerUrl } from "../actions";
import { ServerSetup } from "../components/server-setup";
import { LoginForm, ServerHealthStatus } from "../components/login-form";
import { useRouter } from "next/navigation";
import axios from "axios";

type OnboardingStep = "server" | "login";

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("server");
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const authenticated = await isAuthenticated();
      const existingServerUrl = await getServerUrl();

      if (authenticated && existingServerUrl) {
        router.push("/");
        return;
      }

      // Check if DEFAULT_SERVER_URL env var is set
      try {
        const { data } = await axios("/api/config");
        const defaultUrl = data.defaultServerUrl as string;

        if (defaultUrl) {
          setServerHealth({ status: "checking", url: defaultUrl });

          const result = await checkServerHealth(defaultUrl);
          if (result.success && result.finalUrl) {
            await setServerUrl(result.finalUrl);
            setServerHealth({ status: "connected", url: result.finalUrl });
          } else {
            setServerHealth({
              status: "error",
              url: defaultUrl,
              error: result.error,
            });
          }

          setCurrentStep("login");
          return;
        }
      } catch {
        // Config endpoint unreachable — proceed with normal flow
      }

      // Normal flow: no default server URL
      if (existingServerUrl && !authenticated) {
        setCurrentStep("login");
      } else {
        setCurrentStep("server");
      }
    };

    init();
  }, [router]);

  const handleServerSetup = () => {
    setServerHealth(null);
    setCurrentStep("login");
  };

  const handleLoginSuccess = () => {
    router.push("/");
  };

  const handleBackToServer = () => {
    setServerHealth(null);
    setCurrentStep("server");
  };

  if (currentStep === null) {
    return null;
  }

  if (currentStep === "server") {
    return <ServerSetup onNext={handleServerSetup} />;
  }

  if (currentStep === "login") {
    return (
      <LoginForm
        onSuccess={handleLoginSuccess}
        onBack={handleBackToServer}
        serverHealth={serverHealth}
      />
    );
  }

  return null;
}
