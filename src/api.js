// Simple API client for the KamX FastAPI backend.
// Set VITE_API_URL in your .env file (see .env.example) once deployed.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("kamx_token");
}
function setToken(token) {
  if (token) localStorage.setItem("kamx_token", token);
  else localStorage.removeItem("kamx_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  return data;
}

function normalizeBooking(b) {
  if (!b) return b;
  return {
    id: b.id,
    customerId: b.customer_id,
    partnerId: b.partner_id,
    serviceKey: b.service_key,
    price: b.price,
    commissionPct: b.commission_pct,
    commissionAmt: b.commission_amt,
    workerAmt: b.worker_amt,
    status: b.status,
  };
}
function normalizeUser(u) {
  if (!u) return u;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isPartner: u.is_partner,
    partnerCommission: u.partner_commission,
    wallet: u.wallet,
  };
}

export const api = {
  // ---- auth ----
  async signupEmail(name, email, password) {
    const data = await request("/auth/signup/email", { method: "POST", body: { name, email, password }, auth: false });
    setToken(data.access_token);
    return normalizeUser(data.user);
  },
  async loginEmail(email, password) {
    const data = await request("/auth/login/email", { method: "POST", body: { email, password }, auth: false });
    setToken(data.access_token);
    return normalizeUser(data.user);
  },
  async requestOtp(phone, name /* pass name only on signup */) {
    return request("/auth/otp/request", { method: "POST", body: { phone, name }, auth: false });
  },
  async verifyOtp(phone, code, name) {
    const data = await request("/auth/otp/verify", { method: "POST", body: { phone, code, name }, auth: false });
    setToken(data.access_token);
    return normalizeUser(data.user);
  },
  async getMe() {
    if (!getToken()) return null;
    try {
      const data = await request("/auth/me");
      return normalizeUser(data);
    } catch {
      setToken(null);
      return null;
    }
  },
  logout() {
    setToken(null);
  },

  // ---- partner ----
  async activatePartner(commissionPct) {
    const data = await request("/partner/activate", { method: "POST", body: { commission_pct: commissionPct } });
    return normalizeUser(data);
  },
  async updateCommission(commissionPct) {
    const data = await request("/partner/commission", { method: "POST", body: { commission_pct: commissionPct } });
    return normalizeUser(data);
  },
  async partnerBookings() {
    const data = await request("/partner/bookings");
    return data.map(normalizeBooking);
  },

  // ---- bookings ----
  async createBooking(serviceKey, price) {
    const data = await request("/bookings", { method: "POST", body: { service_key: serviceKey, price } });
    return normalizeBooking(data);
  },
  async myBookings() {
    const data = await request("/bookings/mine");
    return data.map(normalizeBooking);
  },
};
