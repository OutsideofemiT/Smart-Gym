import type { ReactNode } from "react";
import { createContext, useState, useEffect, useContext } from "react";
const ProfileContext = createContext<IProfile | null>(null);

interface IProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  gym_id: string;
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<IProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        // Expecting JWT token stored in localStorage under 'token' or 'accessToken'
        const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
        if (!token) {
          if (mounted) setProfile(null);
          return;
        }

        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;
        if (res.ok) {
          const data: IProfile = await res.json();
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        if (mounted) setProfile(null);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => useContext(ProfileContext);
