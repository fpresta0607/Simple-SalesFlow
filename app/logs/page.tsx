export const dynamic = "force-dynamic";
export const revalidate = 0;
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---- server actions ----
async function addSuppression(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const reason = String(formData.get("reason") || "admin");
  const permanent = formData.get("permanent") === "on";
  const days = Number(formData.get("days") || 30);

  if (!email.includes("@")) throw new Error("invalid email");
  const expiresAt = permanent
    ? null
    : new Date(Date.now() + (isNaN(days) ? 30 : days) * 24 * 60 * 60 * 1000);

  // simplest: make all entries GLOBAL so they apply everywhere
  await (prisma as any).suppression.upsert({
    where: { scope_key_email: { scope: "global", key: "global", email } },
    update: { reason, expiresAt },
    create: { scope: "global", key: "global", email, reason, expiresAt },
  });

  revalidatePath("/logs");
}

async function deleteSuppression(id: string) {
  "use server";
  await prisma.suppression.delete({ where: { id } });
  revalidatePath("/logs");
}

// optional: quick button to clear expired rows now
async function clearExpired() {
  "use server";
  await prisma.suppression.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  revalidatePath("/logs");
}

// ---- page ----
export default async function LogsPage() {
  // latest first, keep it light
  const suppressions = await prisma.suppression.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suppressions</h1>
        <form action={clearExpired}>
          <button className="text-sm px-3 py-1 rounded border">Clear expired</button>
        </form>
      </header>

      {/* Add suppression */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-medium">Add Global Suppression</h2>
        <form action={addSuppression} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="recipient@example.com"
            className="md:col-span-2 border rounded-lg px-3 py-2"
          />
          <select name="reason" className="border rounded-lg px-3 py-2" title="Suppression reason">
            <option value="admin">admin</option>
            <option value="cooldown">cooldown</option>
            <option value="unsubscribe">unsubscribe</option>
            <option value="bounce">bounce</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permanent" />
            Permanent
          </label>
          <input
            name="days"
            type="number"
            min={1}
            defaultValue={30}
            className="border rounded-lg px-3 py-2"
            title="If not permanent, days until expiry"
          />
          <button className="md:col-span-1 bg-black text-white rounded-lg px-4 py-2">
            Add
          </button>
        </form>
        <p className="text-xs text-gray-500">
          
          Admin = applies to everyone. Permanent sets <code>expiresAt = null</code>.
        </p>
      </section>

      {/* suppressions table */}
      <section>
        <h2 className="text-lg font-medium mb-2">Current Suppressions (latest 200)</h2>
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-3">Scope</th>
                <th className="py-2 px-3">Key</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Reason</th>
                <th className="py-2 px-3">Expires</th>
                <th className="py-2 px-3">Created</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {(suppressions as any[]).map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2 px-3">{s.scope}</td>
                  <td className="py-2 px-3">{s.key}</td>
                  <td className="py-2 px-3">{s.email}</td>
                  <td className="py-2 px-3">{s.reason}</td>
                  <td className="py-2 px-3">
                    {s.expiresAt ? new Date(s.expiresAt as any).toLocaleString() : "never"}
                  </td>
                  <td className="py-2 px-3">{new Date(s.createdAt as any).toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <form action={deleteSuppression.bind(null, s.id)}>
                      <button className="text-red-600 hover:underline">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {suppressions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No suppressions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* removed sent email logs table */}
    </div>
  );
}
