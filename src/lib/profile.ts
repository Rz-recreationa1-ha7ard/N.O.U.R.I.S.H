import { useCallback, useEffect, useState } from "react";
import type { Condition } from "./personalization";

const KEY = "nourish.profile.v1";

export interface Profile {
  conditions: Condition[];
  onboarded: boolean;
}

const EMPTY: Profile = { conditions: [], onboarded: false };

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Profile;
    return { conditions: parsed.conditions ?? [], onboarded: !!parsed.onboarded };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(read());
    sync();
    setHydrated(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const save = useCallback((next: Profile) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  }, []);

  return { profile, hydrated, save };
}
