const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || "/api";
if (!import.meta.env.VITE_API_URL) console.info("[Api] VITE_API_URL not set — using default '/api'");

type HeadersMap = { [key: string]: string };

const getStoredToken = () =>
  localStorage.getItem("authToken") || localStorage.getItem("token");

const getAuthHeader = (): HeadersMap => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const join = (base: string, endpoint: string) =>
  `${base}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

const handleResponse = async (res: Response) => {
  if (res.status === 204) return { ok: true };
  const contentType = res.headers.get("content-type") || "";
  const parseBody = async () => {
    if (contentType.includes("application/json")) return res.json();
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  };
  const body = await parseBody();
  if (!res.ok) {
    if (body && typeof body === "object") {
      throw new Error((body as any).error || (body as any).message || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}: ${String(body)}`);
  }
  return body ?? { ok: true };
};

const ApiHandler = {
  async get(endpoint: string) {
    const res = await fetch(join(API_BASE_URL, endpoint), {
      method: "GET",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      credentials: "include",
    });
    return handleResponse(res);
  },

  async post(endpoint: string, body: any) {
    const res = await fetch(join(API_BASE_URL, endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put(endpoint: string, body: any) {
    const res = await fetch(join(API_BASE_URL, endpoint), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(endpoint: string) {
    const res = await fetch(join(API_BASE_URL, endpoint), {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      credentials: "include",
    });
    return handleResponse(res);
  },

  // ---- Auth ----
  async signup(name: string, email: string, password: string, gym_id?: string) {
    const res = await fetch(join(API_BASE_URL, "/users/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, ...(gym_id ? { gym_id } : {}) }),
    });
    const payload = await handleResponse(res);
    const authToken = (payload as any)?.authToken ?? (payload as any)?.token ?? null;
    const emailOut = (payload as any)?.user?.email ?? (payload as any)?.email ?? "";
    const roleOut =
      ((payload as any)?.user?.role ?? (payload as any)?.role ?? "")?.toLowerCase?.() || "";
    const gymIdOut = (payload as any)?.user?.gym_id ?? (payload as any)?.gym_id ?? "";
    if (!authToken) throw new Error("Sign up succeeded but no authToken returned.");
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("token", authToken);
    if (emailOut) localStorage.setItem("email", emailOut);
    if (roleOut) localStorage.setItem("role", roleOut);
    if (gymIdOut) localStorage.setItem("gym_id", String(gymIdOut));
    return payload;
  },

  async login(email: string, password: string) {
    const res = await fetch(join(API_BASE_URL, "/users/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const payload = await handleResponse(res);
    const authToken =
      (payload as any)?.authToken ?? (payload as any)?.token ?? null;
    const emailOut = (payload as any)?.email ?? (payload as any)?.user?.email ?? "";
    const roleRaw = (payload as any)?.role ?? (payload as any)?.user?.role ?? "";
    const roleOut = typeof roleRaw === "string" ? roleRaw.toLowerCase() : "";
    const gymIdOut = (payload as any)?.gym_id ?? (payload as any)?.user?.gym_id ?? "";
    if (!authToken) throw new Error("Login succeeded but no authToken returned.");
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("token", authToken);
    if (emailOut) localStorage.setItem("email", emailOut);
    if (roleOut) localStorage.setItem("role", roleOut);
    if (gymIdOut) localStorage.setItem("gym_id", String(gymIdOut));
    return payload;
  },

  // ---- Profile ----
  async getMyProfile() {
    return this.get("users/profile");
  },

  async updateMyProfile(payload: any) {
    const me = await this.get("users/profile");
    const id = me?._id || me?.id;
    if (!id) throw new Error("Could not determine your user id");
    return this.put(`/users/${encodeURIComponent(id)}`, payload);
  },

  async uploadMyAvatar(file: File) {
    const me = await this.get("users/profile");
    const id = me?._id || me?.id;
    if (!id) throw new Error("Could not determine your user id");
    const fd = new FormData();
    fd.append("avatar", file);
    // Backend implements avatar upload at POST /users/profile/avatar (requires auth)
    const res = await fetch(join(API_BASE_URL, `/users/profile/avatar`), {
      method: "POST",
      headers: { ...getAuthHeader() }, // no manual Content-Type for FormData
      credentials: "include",
      body: fd,
    });
    return handleResponse(res) as Promise<{ avatar_url: string }>;
  },

  /** Upload avatar with a progress callback (0-100). Uses XHR to surface upload progress. */
  async uploadMyAvatarWithProgress(file: File, onProgress: (pct: number) => void) {
    const token = getStoredToken();
    if (!token) throw new Error("Not authenticated");

    const fd = new FormData();
    fd.append("avatar", file);

    return new Promise<{ avatar_url: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", join(API_BASE_URL, `/users/profile/avatar`), true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          try { onProgress(pct); } catch (_) { /* ignore */ }
        }
      };

      xhr.onload = () => {
        const ct = xhr.getResponseHeader("content-type") || "";
        let body: any = null;
        try {
          if (ct.includes("application/json")) body = JSON.parse(xhr.responseText);
          else body = xhr.responseText;
        } catch (e) {
          body = xhr.responseText;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          const errMsg = (body && body.error) || (body && body.message) || `HTTP ${xhr.status}`;
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload aborted"));

      xhr.send(fd);
    });
  },

    /** Remove current avatar (clears avatar_url). Returns { avatar_url: null } */
    async deleteMyAvatar() {
      return this.delete(`/users/profile/avatar`);
    },

  // ---- Classes (Admin/Trainer) ----

  // Create a scheduled class (session)
  async createSession(payload:any) {
  return this.post("classes/session", payload);
},

  // Admin list (calendar/table)
  async getAdminClasses() {
    const gym_id = localStorage.getItem("gym_id") || "";
    const res = await this.get(`/classes?gym_id=${encodeURIComponent(gym_id)}`);
    return Array.isArray(res) ? res : res?.data ?? res?.allClasses ?? [];
  },

  // Optional: edit an existing session (only if the server exposes PUT /classes/:id)
  async updateClass(id: string, payload: any) {
    return this.put(`/classes/${id}`, payload);
  },

  async cancelClass(id: string, reason?: string) {
    return this.put(`/classes/${id}/cancel`, { reason: reason ?? "" });
  },

  async uncancelClass(id: string) {
    return this.put(`/classes/${id}/uncancel`, {});
  },

  async deleteClass(id: string) {
    return this.delete(`/classes/${id}`);
  },

};

export default ApiHandler;
