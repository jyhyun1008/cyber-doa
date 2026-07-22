"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushSubscription() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    navigator.serviceWorker?.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("이 브라우저는 알림을 지원하지 않아요.");
      return;
    }

    const permissionResult = await Notification.requestPermission();
    setPermission(permissionResult);
    if (permissionResult !== "granted") {
      setError("알림 권한이 허용되지 않았어요.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      setError("서버에 알림 설정이 안 돼있어요(관리자에게 문의해주세요).");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error(`subscribe request failed: ${res.status}`);

      setSubscribed(true);
    } catch (err) {
      console.error("[push] subscribe failed", err);
      setError("알림 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }, []);

  return { permission, subscribed, subscribe, error };
}
