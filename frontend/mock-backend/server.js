/**
 * Backend tiruan MotoBase untuk melihat tampilan frontend tanpa backend asli.
 * Data hanya di memori (hilang saat dimatikan). Jalankan: npm run mock
 */
const http = require("http");

const PORT = Number(process.env.PORT || 6318);
const PASSWORD = "password123";
let seq = 100;
const nid = (p) => `${p}${++seq}`;
const ago = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5).toISOString();
const iso = () => new Date().toISOString();

class HttpError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}

/* ---------- Data awal ---------- */
const users = [
  { id: "u1", name: "Rafif Raihan", email: "owner@motobase.id", phone: null, role: "OWNER", isActive: true, lastLoginAt: null, createdAt: ago(30) },
  { id: "u2", name: "Sarah", email: "admin@motobase.id", phone: null, role: "ADMIN", isActive: true, lastLoginAt: null, createdAt: ago(29) },
  { id: "u3", name: "Andrew Budiman", email: "mekanik@motobase.id", phone: null, role: "MECHANIC", isActive: true, lastLoginAt: null, createdAt: ago(28) },
  { id: "u4", name: "Dimas Prakoso", email: "dimas@motobase.id", phone: "6281300001111", role: "MECHANIC", isActive: true, lastLoginAt: null, createdAt: ago(20) },
  { id: "u5", name: "Ahmad Mulya", email: "pelanggan@motobase.id", phone: "6281234567890", role: "CUSTOMER", isActive: true, lastLoginAt: null, createdAt: ago(19) },
];
const customers = [
  { id: "c1", userId: "u5", name: "Ahmad Mulya", phone: "6281234567890", email: "ahmad@contoh.id", address: "Jl. Pogung Kidul 19", notes: null },
  { id: "c2", name: "Siti Rahma", phone: "6285711112222", email: null, address: "Jl. Kaliurang Km 5", notes: "Langganan, servis berkala" },
  { id: "c3", name: "Bagas Saputra", phone: "6282233334444", email: null, address: null, notes: null },
  { id: "c4", name: "Dewi Lestari", phone: "6287755556666", email: "dewi@contoh.id", address: "Condongcatur", notes: null },
].map((c) => ({ ...c, createdAt: ago(25), updatedAt: ago(25) }));
const vehicles = [
  { id: "v1", customerId: "c1", licensePlate: "AB 1234 XY", brand: "Honda", model: "Vario 125", year: 2021, color: "Hitam" },
  { id: "v2", customerId: "c2", licensePlate: "AB 5678 ZZ", brand: "Yamaha", model: "NMAX", year: 2022, color: "Abu-abu" },
  { id: "v3", customerId: "c3", licensePlate: "AB 4321 QA", brand: "Honda", model: "Beat", year: 2019, color: "Putih" },
  { id: "v4", customerId: "c4", licensePlate: "AB 9876 CD", brand: "Suzuki", model: "Satria F150", year: 2018, color: "Merah" },
  { id: "v5", customerId: "c1", licensePlate: "AB 1111 AA", brand: "Honda", model: "Scoopy", year: 2023, color: "Krem" },
];
const parts = [
  { id: "p1", sku: "BUSI-NGK", name: "Busi NGK", category: "Mesin", sellingPrice: 25000, purchasePrice: 18000, currentStock: 8, minimumStock: 3, unit: "pcs" },
  { id: "p2", sku: "OLI-MPX2", name: "Oli MPX2 0.8L", category: "Pelumas", sellingPrice: 55000, purchasePrice: 42000, currentStock: 2, minimumStock: 5, unit: "botol" },
  { id: "p3", sku: "KAMPAS-DPN", name: "Kampas rem depan", category: "Rem", sellingPrice: 45000, purchasePrice: 32000, currentStock: 12, minimumStock: 4, unit: "set" },
  { id: "p4", sku: "FILTER-UDR", name: "Filter udara", category: "Mesin", sellingPrice: 38000, purchasePrice: 27000, currentStock: 0, minimumStock: 3, unit: "pcs" },
  { id: "p5", sku: "RANTAI-SET", name: "Rantai set", category: "Transmisi", sellingPrice: 180000, purchasePrice: 140000, currentStock: 6, minimumStock: 2, unit: "set" },
].map((p) => ({ ...p, isActive: true, createdAt: ago(25), updatedAt: ago(25) }));
const movements = parts.map((p) => ({ id: nid("m"), sparePartId: p.id, type: "IN", quantity: p.currentStock, stockBefore: 0, stockAfter: p.currentStock, note: "Stok awal", createdBy: "u2", createdAt: ago(25) }));
const orders = [];
const trackingIndex = new Map(); // token -> orderId

/* ---------- Helper domain ---------- */
const byId = (arr, id) => arr.find((x) => x.id === id);
const ref = (u) => (u ? { id: u.id, name: u.name } : null);
const FLOW = ["ANTRE", "DIPERIKSA", "DIKERJAKAN", "SELESAI", "DIAMBIL"];
const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

function recalc(o) {
  o.partsSubtotal = o.usedParts.filter((u) => !u.isCancelled).reduce((s, u) => s + u.subtotal, 0);
  o.grandTotal = o.serviceCost + o.partsSubtotal;
}
function addMovement(part, type, quantity, note, by, orderId) {
  const before = part.currentStock;
  part.currentStock += quantity;
  part.updatedAt = iso();
  movements.push({ id: nid("m"), sparePartId: part.id, type, quantity, stockBefore: before, stockAfter: part.currentStock, note: note ?? null, createdBy: by, serviceOrderId: orderId, createdAt: iso() });
}
function newToken() {
  return `trk-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}
function createOrder({ customerId, vehicleId, complaint, serviceCost = 0, mechanicId = null, status = "ANTRE", daysBack = 0, usedParts = [], paid, token, by = "u2" }) {
  const created = ago(daysBack, 2);
  const sameDay = orders.filter((x) => dateKey(x.serviceDate) === dateKey(created)).length;
  const o = {
    id: nid("o"), orderNumber: `SRV-${dateKey(created).replace(/-/g, "")}-${String(sameDay + 1).padStart(4, "0")}`, queueNumber: sameDay + 1,
    serviceDate: created, customerId, vehicleId, assignedMechanicId: mechanicId, complaint, diagnosis: null, currentStatus: "ANTRE",
    serviceCost, partsSubtotal: 0, grandTotal: serviceCost, paymentStatus: "BELUM_DIBAYAR", paymentMethod: null, paidAt: null,
    usedParts: [], statusHistory: [{ from: null, to: "ANTRE", changedBy: by, changedAt: created, note: null, isCorrection: false }],
    completedAt: null, pickedUpAt: null, cancelledAt: null, trackingActive: true, trackingToken: token ?? newToken(),
  };
  const target = status === "DIBATALKAN" ? "DIPERIKSA" : status;
  for (const s of FLOW.slice(1, FLOW.indexOf(target) + 1)) pushStatus(o, s, mechanicId ?? by, null, new Date(new Date(created).getTime() + FLOW.indexOf(s) * 36e5).toISOString());
  if (status === "DIBATALKAN") pushStatus(o, "DIBATALKAN", by, "Pelanggan membatalkan", iso());
  for (const [partId, qty] of usedParts) consumePart(o, byId(parts, partId), qty, mechanicId ?? by, true);
  if (paid) { o.paymentStatus = "LUNAS"; o.paymentMethod = paid; o.paidAt = o.completedAt ?? iso(); }
  orders.push(o);
  trackingIndex.set(o.trackingToken, o.id);
  return o;
}
function pushStatus(o, to, by, note, at = iso()) {
  o.statusHistory.push({ from: o.currentStatus, to, changedBy: by, changedAt: at, note, isCorrection: false });
  o.currentStatus = to;
  if (to === "SELESAI") o.completedAt = at;
  if (to === "DIAMBIL") o.pickedUpAt = at;
  if (to === "DIBATALKAN") o.cancelledAt = at;
}
function consumePart(o, part, quantity, by, silent) {
  const unitPrice = part.sellingPrice;
  o.usedParts.push({ id: nid("up"), sparePartId: part.id, name: part.name, sku: part.sku, quantity, unitPrice, subtotal: unitPrice * quantity, isCancelled: false });
  if (!silent) part.updatedAt = iso();
  addMovement(part, "USAGE", -quantity, `Servis ${o.orderNumber}`, by, o.id);
  recalc(o);
}

// Data contoh servis
createOrder({ customerId: "c1", vehicleId: "v1", complaint: "Mesin sulit menyala", serviceCost: 50000, status: "DIKERJAKAN", mechanicId: "u3", usedParts: [["p1", 2]], token: "demo-token-1" });
createOrder({ customerId: "c2", vehicleId: "v2", complaint: "Rem depan bunyi dan kurang pakem", serviceCost: 40000, status: "DIPERIKSA", mechanicId: "u4", token: "demo-token-2" });
createOrder({ customerId: "c3", vehicleId: "v3", complaint: "Servis berkala + ganti oli", serviceCost: 35000, status: "ANTRE", token: "demo-token-3" });
createOrder({ customerId: "c4", vehicleId: "v4", complaint: "Rantai longgar dan berisik", serviceCost: 60000, status: "SELESAI", mechanicId: "u3", usedParts: [["p5", 1]], token: "demo-token-4" });
createOrder({ customerId: "c1", vehicleId: "v5", complaint: "Ganti busi dan filter", serviceCost: 30000, status: "DIAMBIL", mechanicId: "u4", daysBack: 1, usedParts: [["p1", 1]], paid: "TUNAI", token: "demo-token-5" });
createOrder({ customerId: "c2", vehicleId: "v2", complaint: "Lampu depan mati", serviceCost: 25000, status: "DIBATALKAN", daysBack: 2, token: "demo-token-6" });

/* ---------- Presenter ---------- */
const presentUser = (u) => ({ ...u });
const presentCustomer = (c) => ({ ...c });
const presentVehicle = (v) => { const c = byId(customers, v.customerId); return { ...v, customerId: c ? { id: c.id, name: c.name, phone: c.phone } : v.customerId }; };
const presentPart = (p, role) => { const { purchasePrice, ...rest } = p; return { ...rest, ...(role === "OWNER" ? { purchasePrice } : {}), isLowStock: p.currentStock <= p.minimumStock }; };
function presentOrder(o, withToken = false) {
  const c = byId(customers, o.customerId);
  const v = byId(vehicles, o.vehicleId);
  const { trackingToken, ...rest } = o;
  return {
    ...rest,
    customerId: c ? { id: c.id, name: c.name, phone: c.phone } : o.customerId,
    vehicleId: v ? { id: v.id, licensePlate: v.licensePlate, brand: v.brand, model: v.model } : o.vehicleId,
    assignedMechanicId: ref(byId(users, o.assignedMechanicId)),
    statusHistory: o.statusHistory.map((h) => ({ ...h, changedBy: ref(byId(users, h.changedBy)) })),
    ...(withToken ? { trackingToken } : {}),
  };
}
const presentMovement = (m) => {
  const p = byId(parts, m.sparePartId);
  return { ...m, sparePartId: p ? { id: p.id, name: p.name, sku: p.sku } : m.sparePartId, createdBy: ref(byId(users, m.createdBy)) };
};

/* ---------- Util ---------- */
function paginate(items, q) {
  const limit = Math.max(1, Math.min(100, Number(q.limit) || 20));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(1, Number(q.page) || 1), totalPages);
  return { data: items.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages } };
}
const norm = (s) => String(s ?? "").toLowerCase();
const normalizePhone = (p) => { const d = String(p).replace(/[\s-]/g, ""); return d.startsWith("0") ? `62${d.slice(1)}` : d.replace(/^\+/, ""); };
const normalizePlate = (p) => String(p).toUpperCase().replace(/\s+/g, " ").trim();
function need(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw new HttpError(400, "VALIDATION_ERROR", "Data tidak valid", missing.map((f) => ({ field: f, message: "Wajib diisi" })));
}
const mustFind = (arr, id, code, label) => byId(arr, id) ?? (() => { throw new HttpError(404, code, `${label} tidak ditemukan`); })();
const inRange = (iso, q) => (!q.from || iso >= new Date(q.from).toISOString()) && (!q.to || iso <= new Date(`${q.to}T23:59:59.999Z`).toISOString());
const OPEN = ["ANTRE", "DIPERIKSA", "DIKERJAKAN"];
const maskName = (n) => `${n.slice(0, 2)}${"*".repeat(Math.max(3, n.length - 2))}`;
const maskPlate = (p) => p.replace(/(\d{2})\d{2}/, "$1**");

/* ---------- Route ---------- */
const routes = [];
const route = (method, pattern, roles, handler) =>
  routes.push({ method, roles, handler, re: new RegExp(`^${pattern.replace(/:(\w+)/g, (_, n) => `(?<${n}>[^/]+)`)}$`) });
const PUBLIC = null;
const ALL = ["OWNER", "ADMIN", "MECHANIC"];
const OA = ["OWNER", "ADMIN"];

route("GET", "/health", PUBLIC, () => ({ data: { status: "ok", mock: true } }));
route("GET", "/api/v1", PUBLIC, () => ({ data: { name: "MotoBase API (mock)" } }));

// Auth
route("POST", "/api/v1/auth/login", PUBLIC, ({ body }) => {
  const u = users.find((x) => norm(x.email) === norm(body.email));
  if (!u || body.password !== PASSWORD || !u.isActive) throw new HttpError(401, "INVALID_CREDENTIALS", "Surel atau kata sandi salah");
  u.lastLoginAt = iso();
  return { message: "Login berhasil", data: { accessToken: `mock-${u.id}`, user: presentUser(u) }, headers: { "Set-Cookie": `rt=${u.id}; Path=/api/v1/auth; HttpOnly; SameSite=Lax` } };
});
route("POST", "/api/v1/auth/register-customer", PUBLIC, ({ body }) => {
  need(body, ["name", "email", "password", "phone"]);
  if (String(body.password).length < 8) throw new HttpError(400, "VALIDATION_ERROR", "Kata sandi minimal 8 karakter");
  if (users.some((x) => norm(x.email) === norm(body.email))) throw new HttpError(409, "EMAIL_TAKEN", "Surel sudah terdaftar");
  const user = { id: nid("u"), name: String(body.name).trim(), email: String(body.email).trim(), phone: normalizePhone(body.phone), role: "CUSTOMER", isActive: true, lastLoginAt: iso(), createdAt: iso() };
  users.push(user);
  const customer = { id: nid("c"), userId: user.id, name: user.name, phone: user.phone, email: user.email, address: body.address ?? null, notes: null, createdAt: iso(), updatedAt: iso() };
  customers.push(customer);
  return { status: 201, message: "Akun pelanggan berhasil dibuat", data: { accessToken: `mock-${user.id}`, user: presentUser(user) }, headers: { "Set-Cookie": `rt=${user.id}; Path=/api/v1/auth; HttpOnly; SameSite=Lax` } };
});
route("POST", "/api/v1/auth/refresh", PUBLIC, ({ cookies }) => {
  const u = byId(users, cookies.rt);
  if (!u || !u.isActive) throw new HttpError(401, "UNAUTHENTICATED", "Sesi tidak valid");
  return { data: { accessToken: `mock-${u.id}` } };
});
route("POST", "/api/v1/auth/logout", PUBLIC, () => ({ message: "Berhasil keluar", data: null, headers: { "Set-Cookie": "rt=; Path=/api/v1/auth; HttpOnly; Max-Age=0" } }));
route("GET", "/api/v1/auth/me", [...ALL, "CUSTOMER"], ({ user }) => ({ data: presentUser(user) }));

const customerRecord = (user) => customers.find((c) => c.userId === user.id) ?? (() => { throw new HttpError(404, "CUSTOMER_PROFILE_NOT_FOUND", "Profil pelanggan tidak ditemukan"); })();
route("GET", "/api/v1/customer/me", ["CUSTOMER"], ({ user }) => ({ data: presentCustomer(customerRecord(user)) }));
route("PATCH", "/api/v1/customer/me", ["CUSTOMER"], ({ user, body }) => {
  const c = customerRecord(user);
  for (const k of ["name", "email", "address"]) if (body[k] !== undefined) c[k] = String(body[k]).trim();
  if (body.phone) c.phone = normalizePhone(body.phone);
  c.updatedAt = iso(); user.name = c.name; user.email = c.email; user.phone = c.phone;
  return { data: presentCustomer(c) };
});
route("GET", "/api/v1/customer/vehicles", ["CUSTOMER"], ({ user }) => paginate(vehicles.filter((v) => v.customerId === customerRecord(user).id).map(presentVehicle), { limit: 100 }));
route("POST", "/api/v1/customer/vehicles", ["CUSTOMER"], ({ user, body }) => {
  need(body, ["licensePlate", "brand", "model"]);
  const plate = normalizePlate(body.licensePlate);
  if (vehicles.some((v) => v.licensePlate === plate)) throw new HttpError(409, "PLATE_TAKEN", "Plat nomor sudah terdaftar");
  const v = { id: nid("v"), customerId: customerRecord(user).id, licensePlate: plate, brand: String(body.brand).trim(), model: String(body.model).trim(), year: body.year ? Number(body.year) : null, color: body.color ?? null };
  vehicles.push(v); return { status: 201, data: presentVehicle(v) };
});
route("GET", "/api/v1/customer/service-orders", ["CUSTOMER"], ({ user }) => paginate(orders.filter((o) => o.customerId === customerRecord(user).id).map((o) => presentOrder(o)).reverse(), { limit: 100 }));
route("POST", "/api/v1/customer/service-requests", ["CUSTOMER"], ({ user, body }) => {
  need(body, ["vehicleId", "complaint", "serviceDate"]);
  const c = customerRecord(user); const v = mustFind(vehicles, body.vehicleId, "VEHICLE_NOT_FOUND", "Kendaraan");
  if (v.customerId !== c.id) throw new HttpError(403, "FORBIDDEN", "Kendaraan bukan milik Anda");
  if (new Date(body.serviceDate).toString() === "Invalid Date" || new Date(body.serviceDate) < new Date(new Date().toDateString())) throw new HttpError(400, "VALIDATION_ERROR", "Tanggal pengajuan tidak valid");
  const o = createOrder({ customerId: c.id, vehicleId: v.id, complaint: String(body.complaint).trim(), serviceCost: 0, by: user.id });
  o.serviceDate = new Date(body.serviceDate).toISOString(); o.requestStatus = "MENUNGGU_VERIFIKASI";
  o.statusHistory[0].changedAt = o.serviceDate;
  return { status: 201, message: "Permintaan servis menunggu verifikasi admin", data: presentOrder(o) };
});
route("GET", "/api/v1/service-requests", ["ADMIN", "OWNER"], ({ query }) => paginate(orders.filter((o) => o.requestStatus === "MENUNGGU_VERIFIKASI").map((o) => presentOrder(o)).reverse(), query));
route("PATCH", "/api/v1/service-requests/:id", ["ADMIN"], ({ params, body, user }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Permintaan servis");
  if (o.requestStatus !== "MENUNGGU_VERIFIKASI") throw new HttpError(409, "REQUEST_ALREADY_REVIEWED", "Permintaan sudah ditinjau");
  if (!["DITERIMA", "DITOLAK"].includes(body.decision)) throw new HttpError(400, "VALIDATION_ERROR", "Keputusan tidak valid");
  o.requestStatus = body.decision;
  if (body.decision === "DITOLAK") pushStatus(o, "DIBATALKAN", user.id, body.note ?? "Permintaan ditolak admin");
  else { o.serviceCost = Math.max(0, Number(body.serviceCost) || 0); if (body.mechanicId) { const m = mustFind(users, body.mechanicId, "USER_NOT_FOUND", "Mekanik"); if (m.role !== "MECHANIC" || !m.isActive) throw new HttpError(400, "VALIDATION_ERROR", "Mekanik tidak valid"); o.assignedMechanicId = m.id; } }
  recalc(o); return { data: presentOrder(o) };
});

// Users
route("GET", "/api/v1/users", OA, ({ query }) => paginate(users.filter((u) => !query.role || u.role === query.role).map(presentUser), query));
route("POST", "/api/v1/users", ["OWNER"], ({ body }) => {
  need(body, ["name", "email", "password", "role"]);
  if (users.some((u) => norm(u.email) === norm(body.email))) throw new HttpError(409, "EMAIL_TAKEN", "Surel sudah terdaftar");
  if (!["ADMIN", "MECHANIC"].includes(body.role)) throw new HttpError(400, "VALIDATION_ERROR", "Peran staf tidak valid");
  const u = { id: nid("u"), name: body.name, email: body.email, phone: body.phone ? normalizePhone(body.phone) : null, role: body.role, isActive: true, lastLoginAt: null, createdAt: iso() };
  users.push(u);
  return { status: 201, message: "User berhasil dibuat", data: presentUser(u) };
});
route("GET", "/api/v1/users/:id", OA, ({ params }) => ({ data: presentUser(mustFind(users, params.id, "USER_NOT_FOUND", "User")) }));
route("PATCH", "/api/v1/users/:id/status", ["OWNER"], ({ params, body }) => { const u = mustFind(users, params.id, "USER_NOT_FOUND", "User"); u.isActive = !!body.isActive; return { data: presentUser(u) }; });
route("PATCH", "/api/v1/users/:id", ["OWNER"], ({ params, body }) => {
  const u = mustFind(users, params.id, "USER_NOT_FOUND", "User");
  for (const k of ["name", "email"]) if (body[k]) u[k] = body[k];
  if (body.phone) u.phone = normalizePhone(body.phone);
  return { data: presentUser(u) };
});

// Customers
route("GET", "/api/v1/customers", OA, ({ query }) => paginate(customers.filter((c) => !query.search || norm(c.name).includes(norm(query.search)) || c.phone.includes(normalizePhone(query.search))).map(presentCustomer), query));
route("POST", "/api/v1/customers", ["ADMIN"], ({ body }) => {
  need(body, ["name", "phone"]);
  const c = { id: nid("c"), name: body.name, phone: normalizePhone(body.phone), email: body.email ?? null, address: body.address ?? null, notes: body.notes ?? null, createdAt: iso(), updatedAt: iso() };
  customers.push(c);
  return { status: 201, message: "Pelanggan berhasil dibuat", data: presentCustomer(c) };
});
route("GET", "/api/v1/customers/:id/vehicles", OA, ({ params, query }) => paginate(vehicles.filter((v) => v.customerId === params.id).map(presentVehicle), query));
route("GET", "/api/v1/customers/:id/service-orders", OA, ({ params, query }) => paginate(orders.filter((o) => o.customerId === params.id).map((o) => presentOrder(o)).reverse(), query));
route("GET", "/api/v1/customers/:id", OA, ({ params }) => ({ data: presentCustomer(mustFind(customers, params.id, "CUSTOMER_NOT_FOUND", "Pelanggan")) }));
route("PATCH", "/api/v1/customers/:id", ["ADMIN"], ({ params, body }) => {
  const c = mustFind(customers, params.id, "CUSTOMER_NOT_FOUND", "Pelanggan");
  for (const k of ["name", "email", "address", "notes"]) if (body[k] !== undefined) c[k] = body[k];
  if (body.phone) c.phone = normalizePhone(body.phone);
  c.updatedAt = iso();
  return { data: presentCustomer(c) };
});

// Vehicles
route("GET", "/api/v1/vehicles", ALL, ({ query }) => paginate(vehicles.filter((v) => !query.search || norm(v.licensePlate).replace(/\s/g, "").includes(norm(query.search).replace(/\s/g, ""))).map(presentVehicle), query));
route("POST", "/api/v1/vehicles", ["ADMIN"], ({ body }) => {
  need(body, ["customerId", "licensePlate", "brand", "model"]);
  mustFind(customers, body.customerId, "CUSTOMER_NOT_FOUND", "Pelanggan");
  const plate = normalizePlate(body.licensePlate);
  if (vehicles.some((v) => v.licensePlate === plate)) throw new HttpError(409, "PLATE_TAKEN", "Plat nomor sudah terdaftar");
  const v = { id: nid("v"), customerId: body.customerId, licensePlate: plate, brand: body.brand, model: body.model, year: body.year ?? null, color: body.color ?? null };
  vehicles.push(v);
  return { status: 201, message: "Kendaraan berhasil dibuat", data: presentVehicle(v) };
});
route("GET", "/api/v1/vehicles/:id/service-orders", ALL, ({ params, query }) => paginate(orders.filter((o) => o.vehicleId === params.id).map((o) => presentOrder(o)).reverse(), query));
route("GET", "/api/v1/vehicles/:id", ALL, ({ params }) => ({ data: presentVehicle(mustFind(vehicles, params.id, "VEHICLE_NOT_FOUND", "Kendaraan")) }));
route("PATCH", "/api/v1/vehicles/:id", ["ADMIN"], ({ params, body }) => {
  const v = mustFind(vehicles, params.id, "VEHICLE_NOT_FOUND", "Kendaraan");
  for (const k of ["brand", "model", "year", "color", "customerId"]) if (body[k] !== undefined) v[k] = body[k];
  if (body.licensePlate) v.licensePlate = normalizePlate(body.licensePlate);
  return { data: presentVehicle(v) };
});

// Spare parts & stok
route("GET", "/api/v1/spare-parts/low-stock", OA, ({ query, user }) => paginate(parts.filter((p) => p.currentStock <= p.minimumStock && (!query.search || norm(p.name + p.sku).includes(norm(query.search)))).map((p) => presentPart(p, user.role)), query));
route("GET", "/api/v1/spare-parts", ALL, ({ query, user }) => paginate(parts.filter((p) => !query.search || norm(p.name + p.sku).includes(norm(query.search))).map((p) => presentPart(p, user.role)), query));
route("POST", "/api/v1/spare-parts", ["ADMIN"], ({ body, user }) => {
  need(body, ["sku", "name", "category", "sellingPrice", "minimumStock", "unit"]);
  if (parts.some((p) => norm(p.sku) === norm(body.sku))) throw new HttpError(409, "SKU_TAKEN", "SKU sudah terdaftar");
  const p = { id: nid("p"), sku: body.sku, name: body.name, category: body.category, sellingPrice: body.sellingPrice, purchasePrice: body.purchasePrice ?? 0, currentStock: 0, minimumStock: body.minimumStock, unit: body.unit, isActive: true, createdAt: iso(), updatedAt: iso() };
  parts.push(p);
  if (body.initialStock > 0) addMovement(p, "IN", body.initialStock, "Stok awal", user.id);
  return { status: 201, message: "Suku cadang berhasil dibuat", data: presentPart(p, "ADMIN") };
});
route("GET", "/api/v1/spare-parts/:id/movements", OA, ({ params, query }) => paginate(movements.filter((m) => m.sparePartId === params.id).map(presentMovement).reverse(), query));
route("POST", "/api/v1/spare-parts/:id/stock-in", ["ADMIN"], ({ params, body, user }) => {
  const p = mustFind(parts, params.id, "SPARE_PART_NOT_FOUND", "Suku cadang");
  need(body, ["quantity"]);
  const quantity = Number(body.quantity);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new HttpError(400, "VALIDATION_ERROR", "Jumlah stok masuk harus bilangan bulat positif");
  addMovement(p, "IN", quantity, body.note, user.id);
  return { data: presentPart(p, user.role) };
});
route("POST", "/api/v1/spare-parts/:id/adjust-stock", ["ADMIN"], ({ params, body, user }) => {
  const p = mustFind(parts, params.id, "SPARE_PART_NOT_FOUND", "Suku cadang");
  need(body, ["newStock"]);
  const newStock = Number(body.newStock);
  if (!Number.isSafeInteger(newStock) || newStock < 0) throw new HttpError(400, "VALIDATION_ERROR", "Stok baru harus bilangan bulat nol atau lebih");
  addMovement(p, "ADJUSTMENT", newStock - p.currentStock, body.note, user.id);
  return { data: presentPart(p, user.role) };
});
route("GET", "/api/v1/spare-parts/:id", ALL, ({ params, user }) => ({ data: presentPart(mustFind(parts, params.id, "SPARE_PART_NOT_FOUND", "Suku cadang"), user.role) }));
route("PATCH", "/api/v1/spare-parts/:id", ["ADMIN"], ({ params, body, user }) => {
  const p = mustFind(parts, params.id, "SPARE_PART_NOT_FOUND", "Suku cadang");
  for (const k of ["name", "category", "sellingPrice", "purchasePrice", "minimumStock", "unit"]) if (body[k] !== undefined) p[k] = body[k];
  p.updatedAt = iso();
  return { data: presentPart(p, user.role) };
});
route("GET", "/api/v1/stock-movements", OA, ({ query }) => paginate(movements.map(presentMovement).reverse(), query));

// Service orders
const mechanicOnlyOwn = (o, user) => { if (user.role === "MECHANIC" && o.assignedMechanicId !== user.id) throw new HttpError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk aksi ini"); };
route("GET", "/api/v1/service-orders", ALL, ({ query, user }) => paginate(orders.filter((o) => (!query.status || o.currentStatus === query.status) && (user.role !== "MECHANIC" || o.assignedMechanicId === user.id)).map((o) => presentOrder(o)).reverse(), query));
route("POST", "/api/v1/service-orders", ["ADMIN"], ({ body, user }) => {
  need(body, ["customerId", "vehicleId", "complaint"]);
  mustFind(customers, body.customerId, "CUSTOMER_NOT_FOUND", "Pelanggan");
  const vehicle = mustFind(vehicles, body.vehicleId, "VEHICLE_NOT_FOUND", "Kendaraan");
  if (vehicle.customerId !== body.customerId) throw new HttpError(400, "VEHICLE_CUSTOMER_MISMATCH", "Kendaraan bukan milik pelanggan yang dipilih");
  const o = createOrder({ customerId: body.customerId, vehicleId: body.vehicleId, complaint: body.complaint, serviceCost: Number(body.serviceCost) || 0, by: user.id });
  return { status: 201, message: "Service order berhasil dibuat", data: presentOrder(o, true) };
});
route("GET", "/api/v1/service-orders/:id", ALL, ({ params, user }) => { const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis"); mechanicOnlyOwn(o, user); return { data: presentOrder(o) }; });
route("PATCH", "/api/v1/service-orders/:id/assign-mechanic", ["ADMIN"], ({ params, body }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  if (!OPEN.includes(o.currentStatus)) throw new HttpError(409, "ORDER_NOT_EDITABLE", "Penugasan hanya dapat diubah saat servis masih berjalan");
  if (body.mechanicId) { const m = mustFind(users, body.mechanicId, "USER_NOT_FOUND", "Mekanik"); if (m.role !== "MECHANIC") throw new HttpError(400, "VALIDATION_ERROR", "User bukan mekanik"); }
  o.assignedMechanicId = body.mechanicId || null;
  return { data: presentOrder(o) };
});
route("PATCH", "/api/v1/service-orders/:id/status", ["ADMIN", "MECHANIC"], ({ params, body, user }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  mechanicOnlyOwn(o, user);
  const to = body.status;
  const ok = to === "DIBATALKAN" ? OPEN.includes(o.currentStatus) : FLOW.indexOf(to) === FLOW.indexOf(o.currentStatus) + 1 && FLOW.indexOf(o.currentStatus) >= 0;
  if (!ok) throw new HttpError(409, "INVALID_STATUS_TRANSITION", `Status tidak dapat berubah dari ${o.currentStatus} ke ${to}`);
  pushStatus(o, to, user.id, body.note ?? null);
  return { message: `Status diubah menjadi ${to}`, data: presentOrder(o) };
});
route("POST", "/api/v1/service-orders/:id/parts", ["ADMIN", "MECHANIC"], ({ params, body, user }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  mechanicOnlyOwn(o, user);
  need(body, ["sparePartId", "quantity"]);
  const p = mustFind(parts, body.sparePartId, "SPARE_PART_NOT_FOUND", "Suku cadang");
  const quantity = Number(body.quantity);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new HttpError(400, "VALIDATION_ERROR", "Jumlah pemakaian harus bilangan bulat positif");
  if (!OPEN.includes(o.currentStatus)) throw new HttpError(409, "ORDER_NOT_EDITABLE", "Servis sudah tidak bisa diubah");
  if (p.currentStock < quantity) throw new HttpError(409, "INSUFFICIENT_STOCK", `Stok ${p.name} tidak cukup (tersisa ${p.currentStock})`);
  consumePart(o, p, quantity, user.id);
  return { status: 201, message: "Pemakaian suku cadang dicatat", data: presentOrder(o) };
});
route("DELETE", "/api/v1/service-orders/:id/parts/:usageId", ["ADMIN", "MECHANIC"], ({ params, user }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  mechanicOnlyOwn(o, user);
  if (!OPEN.includes(o.currentStatus)) throw new HttpError(409, "ORDER_NOT_EDITABLE", "Pemakaian hanya dapat dibatalkan saat servis masih berjalan");
  const u = o.usedParts.find((x) => x.id === params.usageId && !x.isCancelled);
  if (!u) throw new HttpError(404, "USAGE_NOT_FOUND", "Pemakaian tidak ditemukan");
  u.isCancelled = true;
  addMovement(byId(parts, u.sparePartId), "REVERSAL", u.quantity, `Pembatalan ${o.orderNumber}`, user.id, o.id);
  recalc(o);
  return { data: presentOrder(o) };
});
route("PATCH", "/api/v1/service-orders/:id", ["ADMIN", "MECHANIC"], ({ params, body, user }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  mechanicOnlyOwn(o, user);
  if (!OPEN.includes(o.currentStatus)) throw new HttpError(409, "ORDER_NOT_EDITABLE", "Detail hanya dapat diubah saat servis masih berjalan");
  for (const k of ["complaint", "diagnosis"]) if (body[k] !== undefined) o[k] = body[k];
  if (body.serviceCost !== undefined) o.serviceCost = Number(body.serviceCost);
  recalc(o);
  return { data: presentOrder(o) };
});
route("POST", "/api/v1/service-orders/:id/payment", ["ADMIN"], ({ params, body }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  need(body, ["paymentMethod"]);
  if (!["SELESAI", "DIAMBIL"].includes(o.currentStatus)) throw new HttpError(409, "ORDER_NOT_COMPLETED", "Pembayaran hanya untuk servis yang sudah selesai");
  if (o.paidAt) throw new HttpError(409, "ALREADY_PAID", "Servis sudah dibayar");
  Object.assign(o, { paymentStatus: "LUNAS", paymentMethod: body.paymentMethod, paidAt: iso() });
  return { status: 201, message: "Pembayaran dicatat", data: presentOrder(o) };
});
route("POST", "/api/v1/service-orders/:id/rotate-tracking-token", ["ADMIN"], ({ params }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  trackingIndex.delete(o.trackingToken);
  o.trackingToken = newToken();
  o.trackingActive = true;
  trackingIndex.set(o.trackingToken, o.id);
  return { data: { trackingToken: o.trackingToken } };
});
route("POST", "/api/v1/service-orders/:id/revoke-tracking-token", ["ADMIN"], ({ params }) => {
  const o = mustFind(orders, params.id, "SERVICE_ORDER_NOT_FOUND", "Servis");
  o.trackingActive = false;
  return { data: null };
});

// Pelacakan publik
route("GET", "/api/v1/public/service-orders/track/:token", PUBLIC, ({ params }) => {
  const o = byId(orders, trackingIndex.get(params.token));
  if (!o || !o.trackingActive) throw new HttpError(404, "TRACKING_NOT_FOUND", "Tautan pelacakan tidak ditemukan");
  const v = byId(vehicles, o.vehicleId);
  const c = byId(customers, o.customerId);
  const m = byId(users, o.assignedMechanicId);
  return {
    data: {
      orderNumber: o.orderNumber, queueNumber: o.queueNumber, serviceDate: o.serviceDate,
      vehicle: { licensePlate: maskPlate(v.licensePlate), brand: v.brand, model: v.model },
      customerName: maskName(c.name), complaint: o.complaint, currentStatus: o.currentStatus,
      mechanic: m ? { name: m.name.split(" ")[0] } : null,
      statusHistory: o.statusHistory.map((h) => ({ status: h.to, timestamp: h.changedAt })),
      serviceCost: o.serviceCost, partsSubtotal: o.partsSubtotal, grandTotal: o.grandTotal, paymentStatus: o.paymentStatus,
      usedParts: o.usedParts.filter((u) => !u.isCancelled).map((u) => ({ name: u.name, quantity: u.quantity, unitPrice: u.unitPrice, subtotal: u.subtotal })),
    },
  };
});

// Laporan
const durasi = (o) => (o.completedAt ? Math.round((new Date(o.completedAt) - new Date(o.serviceDate)) / 6e4) : null);
const avg = (xs) => { const v = xs.filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
route("GET", "/api/v1/reports/service-summary", OA, ({ query }) => {
  const list = orders.filter((o) => inRange(o.serviceDate, query));
  const perStatus = Object.fromEntries([...FLOW, "DIBATALKAN"].map((s) => [s, list.filter((o) => o.currentStatus === s).length]));
  return { data: { totalServis: list.length, rataRataDurasiMenit: avg(list.map(durasi)), perStatus }, meta: {} };
});
route("GET", "/api/v1/reports/revenue-summary", ["OWNER"], ({ query }) => {
  const list = orders.filter((o) => inRange(o.serviceDate, query));
  const paid = list.filter((o) => o.paidAt);
  const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
  const metode = [...new Set(paid.map((o) => o.paymentMethod))].map((m) => ({ metode: m, total: sum(paid.filter((o) => o.paymentMethod === m), (o) => o.grandTotal), jumlah: paid.filter((o) => o.paymentMethod === m).length }));
  const unpaid = list.filter((o) => ["SELESAI", "DIAMBIL"].includes(o.currentStatus) && !o.paidAt);
  return { data: { totalPendapatan: sum(paid, (o) => o.grandTotal), pendapatanJasa: sum(paid, (o) => o.serviceCost), pendapatanSukuCadang: sum(paid, (o) => o.partsSubtotal), jumlahTransaksi: paid.length, perMetodePembayaran: metode, belumDibayar: { total: sum(unpaid, (o) => o.grandTotal), jumlah: unpaid.length } }, meta: {} };
});
route("GET", "/api/v1/reports/parts-usage", OA, ({ query }) => {
  const rows = parts.map((p) => {
    const used = orders.filter((o) => inRange(o.serviceDate, query)).flatMap((o) => o.usedParts).filter((u) => u.sparePartId === p.id && !u.isCancelled);
    return { nama: p.name, sku: p.sku, totalDipakai: used.reduce((s, u) => s + u.quantity, 0), nilaiPemakaian: used.reduce((s, u) => s + u.subtotal, 0) };
  }).filter((r) => r.totalDipakai > 0).sort((a, b) => b.totalDipakai - a.totalDipakai);
  return { data: rows, meta: {} };
});
route("GET", "/api/v1/reports/low-stock", OA, () => ({ data: parts.filter((p) => p.currentStock <= p.minimumStock).map((p) => ({ nama: p.name, sku: p.sku, stokSaatIni: p.currentStock, batasMinimum: p.minimumStock, kekurangan: Math.max(0, p.minimumStock - p.currentStock + 1) })), meta: {} }));
route("GET", "/api/v1/reports/mechanic-performance", ["OWNER"], ({ query }) => ({
  data: users.filter((u) => u.role === "MECHANIC").map((m) => { const mine = orders.filter((o) => o.assignedMechanicId === m.id && inRange(o.serviceDate, query)); return { mekanik: m.name, jumlahServis: mine.length, servisSelesai: mine.filter((o) => o.completedAt).length, rataRataDurasiMenit: avg(mine.map(durasi)) }; }),
  meta: {},
}));

/* ---------- Server ---------- */
const parseCookies = (h = "") => Object.fromEntries(h.split(";").map((c) => c.trim().split("=")).filter(([k]) => k).map(([k, ...v]) => [k, v.join("=")]));

http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url, "http://localhost");
    const send = (status, payload, headers = {}) => { res.writeHead(status, { "Content-Type": "application/json", ...headers }); res.end(JSON.stringify(payload)); };
    try {
      const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
      if (!r) throw new HttpError(404, "NOT_FOUND", "Endpoint tidak ditemukan");
      let user = null;
      if (r.roles) {
        const auth = req.headers.authorization ?? "";
        user = auth.startsWith("Bearer mock-") ? byId(users, auth.slice(12)) : null;
        if (!user || !user.isActive) throw new HttpError(401, "UNAUTHENTICATED", "Token tidak valid atau kedaluwarsa");
        if (!r.roles.includes(user.role)) throw new HttpError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk aksi ini");
      }
      let body = {};
      const raw = Buffer.concat(chunks).toString();
      if (raw) { try { body = JSON.parse(raw); } catch { throw new HttpError(400, "VALIDATION_ERROR", "Body bukan JSON yang valid"); } }
      const out = r.handler({ params: r.re.exec(url.pathname).groups ?? {}, query: Object.fromEntries(url.searchParams), body, user, cookies: parseCookies(req.headers.cookie) });
      send(out.status ?? 200, { success: true, message: out.message ?? "OK", data: out.data, ...(out.meta ? { meta: out.meta } : {}) }, out.headers);
    } catch (e) {
      if (!(e instanceof HttpError)) { console.error(e); e = new HttpError(500, "INTERNAL_ERROR", "Kesalahan internal server"); }
      send(e.status, { success: false, error: { code: e.code, message: e.message, details: e.details, requestId: nid("req") } });
    }
  });
}).listen(PORT, () => {
  console.log(`\nBackend tiruan MotoBase berjalan di http://localhost:${PORT}\n`);
  console.log("Akun (kata sandi semua: password123):");
  for (const u of users) console.log(`  ${u.role.padEnd(9)} ${u.email}`);
  console.log("\nTautan pelacakan contoh: http://localhost:3000/track/demo-token-1  (… demo-token-6)\n");
});
